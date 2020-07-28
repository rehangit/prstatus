import makeLogger from "./logger";
const logger = makeLogger("jira");

import { delayedFetch } from "./delayedFetch";

const JIRA_BOARD_ID = window.location.search.match("rapidView=([0-9]+)")[1];
const JIRA_BASE_URL = `/rest/agile/1.0/board/${JIRA_BOARD_ID}`;
const JIRA_DEV_URL = "/rest/dev-status/1.0/issue/details?issueId=";

const boardColumns = Array.from(
  document.querySelectorAll(".ghx-column-headers li.ghx-column"),
).map(col => {
  const tooltip = col.querySelector("[data-tooltip]");
  return { id: col.dataset.id, name: tooltip.dataset.tooltip.toLowerCase() };
});

const columnIdToName = boardColumns.reduce(
  (acc, col) => ({ ...acc, [col.id]: col.name }),
  {},
);

export const getJiraIssues = async columns => {
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
    activeIssues.map(i =>
      delayedFetch(`${JIRA_DEV_URL}${i.id}`, {}, activeIssues.length).then(
        res => {
          const prs =
            (res &&
              res.detail
                .map(d => d.pullRequests)
                .flat()
                .filter(Boolean)) ||
            [];
          return { ...i, prs };
        },
      ),
    ),
  );

  logger.debug("issues from jira with prs", issuesWithPullRequests);
  return issuesWithPullRequests;
};
