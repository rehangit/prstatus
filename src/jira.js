import makeLogger from "./logger";
const logger = makeLogger("jira");

import { delayedFetch } from "./delayedFetch";

export const getJiraIssues = async columns => {
  const JIRA_BOARD_ORIGIN = window.location.origin;
  const JIRA_DEV_URL = `${JIRA_BOARD_ORIGIN}/rest/dev-status/1.0/issue/details?issueId=`;

  const boardColumns = Array.from(
    document.querySelectorAll(".ghx-column-headers li.ghx-column"),
  ).map(col => ({
    id: col.dataset.id,
    name: col.querySelector("[data-tooltip]").dataset.tooltip.toLowerCase(),
  }));

  const columnIdToName = boardColumns.reduce(
    (acc, col) => ({ ...acc, [col.id]: col.name }),
    {},
  );

  const activeColumnNames = (columns && columns.length > 0
    ? boardColumns.filter(c => columns.toLowerCase().includes(c.name))
    : boardColumns.slice(1, -1)
  ).map(c => c.name);

  logger.debug({ activeColumnNames });

  const issuesOnBoard = [
    ...document.querySelectorAll(".ghx-column[data-column-id]"),
  ]
    .map(col =>
      [...col.querySelectorAll("[data-issue-id")].map(issue => ({
        id: issue.dataset.issueId,
        key: issue.dataset.issueKey,
        columnName: columnIdToName[col.dataset.columnId],
      })),
    )
    .flat();

  logger.debug({ issuesOnBoard });

  const activeIssues = issuesOnBoard
    .filter(i => activeColumnNames.includes(i.columnName))
    .sort((a, b) => a.id - b.id);
  logger.debug("activeIssues", activeIssues);

  const issuesWithPullRequests = await Promise.all(
    activeIssues.map(async i => {
      const res = await delayedFetch(
        `${JIRA_DEV_URL}${i.id}`,
        {},
        activeIssues.length,
      );

      logger.debug("issuesWithPullRequests", `${JIRA_DEV_URL}${i.id}`, res);

      if (!res || !res.detail) return i;

      const prs =
        res.detail
          .map(d => d.pullRequests)
          .flat()
          .filter(Boolean) || [];

      const noprs =
        res.detail
          .map(d => {
            const prBranches =
              (d.pullRequests && d.pullRequests.map(pr => pr.source.url)) || [];
            return (
              (d.branches &&
                d.branches.filter(b => !prBranches.includes(b.url))) ||
              []
            );
          })
          .flat()
          .filter(Boolean) || [];

      return { ...i, prs, noprs };
    }),
  );

  logger.debug("issues from jira with prs", issuesWithPullRequests);
  return issuesWithPullRequests;
};
