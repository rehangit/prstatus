import { getHeaders, throttle, uniqBy } from "./utils";

const reviewSortOrder = {
  APPROVED: 1,
  CHANGES_REQUESTED: 2,
  COMMENTED: 3,
};
const reviewOrder = (a, b) =>
  reviewSortOrder[a.state] - reviewSortOrder[b.state];

const fetchCache = {};

const cachedFetch = async (url, params, useCache) => {
  if (
    fetchCache[url] &&
    fetchCache[url].res &&
    (fetchCache[url].valid || useCache)
  ) {
    fetchCache[url].count = fetchCache[url].count + 1;
    log(url, "Cached used count:", fetchCache[url].count);
    return fetchCache[url].res;
  }
  const response = await fetch(url, { ...params, cache: "force-cache" }).catch(
    console.error,
  );
  if (globalConfig.ENABLE_LOG) {
    log(url, response, getHeaders(response));
  }

  const res = await response.json();
  fetchCache[url] = { res, count: 0, valid: true };
  setTimeout(() => {
    fetchCache[url].valid = false;
  }, 120000);
  return res;
};

const getPrsWithReviews = async (issueKey, useCache) => {
  const { GITHUB_ACCOUNT, GITHUB_TOKEN } = globalConfig;
  const headers = { Authorization: `token ${GITHUB_TOKEN}` };
  const baseUrl = `https://api.github.com/search/issues?q=is:pr+org:${GITHUB_ACCOUNT}`;

  const searchPrs = async url =>
    cachedFetch(url, { headers }, useCache).then(res => res.items || []);

  const [prsTitle = [], prsBranch = []] = await Promise.all([
    searchPrs(`${baseUrl}+in:title+${issueKey}`),
    searchPrs(`${baseUrl}+head:${issueKey}`),
  ]).catch(console.error);

  const uniquePrs = uniqBy([...prsTitle, ...prsBranch].filter(Boolean), "id");

  return Promise.all(
    uniquePrs.map(pr =>
      cachedFetch(`${pr.pull_request.url}/reviews`, { headers }).then(
        reviews => ({
          ...pr,
          reviews: uniqBy(reviews.reverse().sort(reviewOrder), r => r.user.id),
        }),
      ),
    ),
  );
};
