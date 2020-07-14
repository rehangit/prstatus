import logger from "./logger";
import { cachedFetch } from "./cachedFetch";
import { uniqBy } from "./utils";

global.prStatus = global.prStatus || {};
global.prStatus.config = global.prStatus.config || {};

const reviewSortOrder = {
  APPROVED: 1,
  CHANGES_REQUESTED: 2,
  COMMENTED: 3,
};

const fetchGithub = (url, token) =>
  fetch(url, { headers: { Authorization: `token ${token}` } })
    .then(res => {
      const headers = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });
      headers.status = res.status;
      return res.json().then(res => {
        res.headers = headers;
        return res;
      });
    })
    .catch(console.error);

const estimateNumberOfRepos = repos => {
  let pageLast = 0;
  try {
    pageLast = parseInt(
      repos.headers &&
        repos.headers.link &&
        repos.headers.link.match(/\/repos\?page=(\d+?)>; rel=\"last\"/)[1],
    );
  } catch (err) {
    logger.debug({ err });
  }
  logger.debug({ pageLast });
  return pageLast < 2 || repos.length < 30 ? repos.length : (pageLast - 1) * 30;
};

export const verifyGithubToken = (account, token) => {
  logger.debug({ account, token });
  return Promise.all([
    fetchGithub(
      `https://api.github.com/search/repositories?q=org:${account}`,
      token,
    ),
    fetchGithub(
      `https://api.github.com/search/repositories?q=user:${account}`,
      token,
    ),
  ])
    .then(([resOrg, resUser]) => {
      logger.debug({ resOrg, resUser });
      const scopes = resOrg.headers["x-oauth-scopes"];
      const org = resOrg.message || resOrg.total_count;
      const user = resUser.message || resUser.total_count;
      return { org, user, scopes };
    })
    .catch(console.error);
};

const searchPrsFast = async issues => {
  const { GITHUB_ACCOUNT, GITHUB_TOKEN } = prStatus.config;
  const headers = { Authorization: `token ${GITHUB_TOKEN}` };
  const searchPrs = url => cachedFetch(url, { headers }).then(r => r.items);

  const prefix = issues[0].key.split("-")[0];
  const from = issues[0].created.split("T")[0];
  const baseUrl = `https://api.github.com/search/issues?sort=updated&order=desc&per_page=100&q=is:pr+org:${GITHUB_ACCOUNT}+created:>=${from}`;

  const [prsTitle, prsBranch] = await Promise.all([
    searchPrs(`${baseUrl}+in:title+${prefix}`),
    searchPrs(`${baseUrl}+head:${prefix}`),
  ]);
  console.log({ prsTitle, prsBranch });
  const searchResults = uniqBy(
    [...prsTitle, ...prsBranch].filter(Boolean),
    "id",
  );
  console.log({ searchResults });
  const prsInSearchResults = issues.reduce((acc, issue) => {
    const prs = searchResults.filter(res => res.title.includes(issue.key));
    acc[issue.key] = { ...issue, prs };
    return acc;
  }, {});

  console.log({ prsInSearchResults });

  return prsInSearchResults;
};

export const getPrsWithReviews = async (issue, useCache) => {
  const issueKey = issue.key;
  const { GITHUB_ACCOUNT, GITHUB_TOKEN } = prStatus.config;
  const headers = { Authorization: `token ${GITHUB_TOKEN}` };
  const baseUrl = `https://api.github.com/search/issues?q=is:pr+org:${GITHUB_ACCOUNT}`;

  const searchPrs = async url =>
    cachedFetch(url, { headers }, useCache)
      .then(res => res.items)
      .catch(err => {
        console.warn("error occurred in fetchPrs", err);
        return [];
      });

  const [prsTitle = [], prsBranch = []] = await Promise.all([
    searchPrs(`${baseUrl}+in:title+${issueKey}`),
    searchPrs(`${baseUrl}+head:${issueKey}`),
  ]).catch(console.error);
  logger.debug({ prsTitle, prsBranch });

  const prs = uniqBy([...prsTitle, ...prsBranch].filter(Boolean), "id");
  logger.debug({ prs });

  const fetchDefault = (url, defaultResult) =>
    fetch(url, { headers })
      .then(res => {
        logger.debug(res);
        return res.json();
      })
      .catch(err => {
        console.error(err);
        return defaultResult;
      });

  const prsWithReviews = await Promise.all(
    prs.map(async pr => {
      const [reviews, merged] = await Promise.all([
        fetchDefault(`${pr.pull_request.url}/reviews`, []),
        fetchDefault(`${pr.pull_request.url}`, false).then(res => res.merged),
      ]);

      return {
        ...pr,
        merged,
        reviews: uniqBy(
          reviews
            .reverse()
            .sort(
              (a, b) => reviewSortOrder[a.state] - reviewSortOrder[b.state],
            ),
          r => r.user.id,
        ),
      };
    }),
  );

  logger.debug({ prsWithReviews });
  return prsWithReviews;
};