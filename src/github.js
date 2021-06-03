import makeLogger from "./logger";
const logger = makeLogger("github");

import { cachedFetch } from "./cachedFetch";
import uniqBy from "lodash.uniqby";

global.prStatus = global.prStatus || {};
global.prStatus.config = global.prStatus.config || {};

const reviewSortOrder = (a, b) => {
  const order = state =>
    ({
      APPROVED: 1,
      CHANGES_REQUESTED: 2,
      DISMISSED: 3,
      COMMENTED: 3,
    }[state] || 0);
  return order(a.state) - +order(b.state);
};

const fetchGithub = async (url, token) =>
  cachedFetch(url, { headers: { Authorization: `token ${token}` } }, 0);

export const verifyGithubToken = async token => {
  logger.debug({ token });

  const [user, orgs] = await Promise.all([
    fetchGithub("https://api.github.com/user", token),
    fetchGithub("https://api.github.com/user/orgs", token),
  ]);

  const scopes =
    user.response && user.headers && user.headers["x-oauth-scopes"];
  const username = (user && user.login) || user.message;
  const orgname = (orgs[0] && orgs[0].login) || orgs.message;
  logger.debug({ user, orgs, scopes, orgname });

  const [orgrepos = {}, userrepos = {}] = await Promise.all([
    orgname &&
      fetchGithub(
        `https://api.github.com/search/repositories?q=org:${orgname}`,
        token,
      ),
    username &&
      fetchGithub(
        `https://api.github.com/search/repositories?q=user:${username}`,
        token,
      ),
  ]);
  logger.debug({ orgrepos, userrepos });

  return { username, orgname, scopes, orgrepos, userrepos };
};

export const getPrsWithReviews = async (issue, useCache) => {
  const issueKey = issue.key;
  const { GITHUB_TOKEN } = prStatus.config;
  const params = { headers: { Authorization: `token ${GITHUB_TOKEN}` } };

  const prsWithReviews = await Promise.all(
    issue.prs.map(async pr => {
      const url = pr.url
        .replace("https://github.com/", "https://api.github.com/repos/")
        .replace("/pull/", "/pulls/");
      const reviewsResponse = await cachedFetch(`${url}/reviews`, params);
      if (!(reviewsResponse instanceof Array)) {
        logger.error(reviewsResponse.message);
        return;
      }
      const reviewsNotAuthor = reviewsResponse.filter(
        r => r.user.login !== pr.author.name,
      );
      const reviewsSorted = reviewsNotAuthor.reverse().sort(reviewSortOrder);
      const reviews = uniqBy(reviewsSorted, "user.id");
      logger.debug("reviews for pr", pr.id, {
        reviewsResponse,
        reviewsNotAuthor,
        reviewsSorted,
        reviews,
      });
      return {
        ...pr,
        reviews,
      };
    }),
  );

  logger.debug(
    "reviews added to issue prs",
    issue.key,
    issue.columnName,
    prsWithReviews,
  );
  return prsWithReviews;
};

export const getOpenPrs = async (projectKey, account) => {
  const { GITHUB_TOKEN } = prStatus.config;

  const fetchWithLongCache = url =>
    cachedFetch(
      url,
      { headers: { Authorization: `token ${token}` } },
      true,
      15 * 60 * 1000,
    );

  const [orgPrs, userPrs] = await Promise.all([
    fetchGithub(
      `https://api.github.com/search/issues?q=${projectKey}-+org:${account}+is:open&per_page=100`,
      GITHUB_TOKEN,
    ).catch(() => ({ items: [] })),
    fetchGithub(
      `https://api.github.com/search/issues?q=${projectKey}-+user:${account}+is:open&per_page=100`,
      GITHUB_TOKEN,
    ).catch(() => ({ items: [] })),
  ]);

  return [
    ...((orgPrs && orgPrs.items) || []),
    ...((userPrs && userPrs.items) || []),
  ];
};
