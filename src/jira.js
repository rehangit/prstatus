import makeLogger from "./logger";
const logger = makeLogger("jira");

import { delayedFetch } from "./delayedFetch";

const getActiveIssueIdsClassic = columns => {
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

  const activeColumnNames = (
    columns && columns.length > 0
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
        node: issue,
      })),
    )
    .flat();

  logger.debug({ issuesOnBoard });

  const activeIssues = issuesOnBoard
    .filter(i => activeColumnNames.includes(i.columnName))
    .sort((a, b) => a.id - b.id);
  logger.debug("activeIssues", activeIssues);

  return activeIssues;
};

const getActiveIssueIdsNextgen = () => {
  const activeIssues = Array.from(
    document.querySelectorAll(
      "[data-rbd-draggable-id^=COLUMN]:not(:first-child):not(:last-child) [data-rbd-draggable-id^=ISSUE]",
    ),
  );
  return activeIssues.map(issue => ({
    id: issue.dataset.rbdDragHandleDraggableId.split("::")[1],
    key: issue.id,
    node: issue,
  }));
};

export const getJiraIssues = async (columns, nextgen) => {
  const activeIssues = nextgen
    ? getActiveIssueIdsNextgen()
    : getActiveIssueIdsClassic(columns);

  const JIRA_DEV_URL = `${window.location.origin}/rest/dev-status/1.0/issue/details?issueId=`;

  const issuesWithPullRequests = await Promise.all(
    activeIssues.map(async issue => {
      const res = await delayedFetch(
        `${JIRA_DEV_URL}${issue.id}`,
        {},
        activeIssues.length,
      );

      logger.debug("issuesWithPullRequests", `${JIRA_DEV_URL}${issue.id}`, res);

      if (!res || !res.detail) return issue;

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

      return { ...issue, prs, noprs };
    }),
  );

  logger.debug("issues from jira with prs", issuesWithPullRequests);
  return issuesWithPullRequests;
};
