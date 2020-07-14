import logger from "./logger";

const JIRA_BOARD_ID = window.location.search.match("rapidView=([0-9]+)")[1];
const JIRA_BASE_URL = `/rest/agile/1.0/board/${JIRA_BOARD_ID}`;

let _setup;

const setup = async () => {
  if (_setup) return _setup;

  const boardColumns = await fetch(`${JIRA_BASE_URL}/configuration`)
    .then(r => r.json())
    .then(boardConfig => boardConfig.columnConfig.columns);

  logger.debug({ boardColumns });

  const boardStatuses = await Promise.all(
    boardColumns.map(({ statuses, name: column }) =>
      Promise.all(
        statuses.map(({ id }) =>
          fetch(`/rest/api/2/status/${id}`)
            .then(r => r.json())
            .then(({ name: status }) => ({
              status,
              column,
            })),
        ),
      ),
    ),
  );

  logger.debug({ boardStatuses });

  const statusToColumn = boardStatuses
    .flat()
    .reduce((acc, { status, column }) => {
      acc[status] = column;
      return acc;
    }, {});

  logger.debug({ statusToColumn });

  _setup = {
    boardColumns,
    statusToColumn,
  };

  return _setup;
};

export const getJiraIssues = async columns => {
  if (!columns || !columns.length) {
    logger.log("No columns selected");
    return;
  }

  const { statusToColumn, boardColumns } = await setup();

  const activeColumns = boardColumns
    .filter(c => columns.toLowerCase().includes(c.name.toLowerCase()))
    .map(ac => ac.name);

  logger.debug({ activeColumns });

  const issueIdsOnBoard = Array.from(
    document.querySelectorAll("[data-issue-id]"),
  ).map(k => k.dataset.issueId);

  logger.debug({ issueIdsOnBoard });

  const issuesOnBoard = await Promise.all(
    issueIdsOnBoard.map(id =>
      fetch(`/rest/agile/1.0/issue/${id}`)
        .then(res => res.json())
        .then(issue => ({
          id: issue.id,
          key: issue.key,
          created: issue.fields.created,
          status: issue.fields.status.name,
          column: statusToColumn[issue.fields.status.name],
        })),
    ),
  );

  logger.debug({ issuesOnBoard });

  const issues = issuesOnBoard
    .filter(i => activeColumns.includes(i.column))
    .sort((a, b) => a.id - b.id);
  logger.debug({ issues });

  return issues;
};
