import { throttle } from "./utils";
import makeLogger from "./logger";
const logger = makeLogger("cs");
import { getJiraIssues } from "./jira";
import { getOpenPrs, getPrsWithReviews } from "./github";
import { htmlToInsert, renderIssue } from "./htmltoinsert";

const THROTTLE_RATE = 500;

logger.debug("prstatus: content script global");

global.prStatus = global.prStatus || {};
global.prStatus.config = global.prStatus.config = {};
const prStatus = global.prStatus;

const JIRA_URL_REGEX =
  /(atlassian.net|jira.com)\/.*rapidView=|jira\/software\/projects/;
const JIRA_URL_CLASSIC = /(atlassian.net|jira.com)\/.*rapidView=/;
const JIRA_URL_NEWGEN = /(atlassian.net|jira.com)\/jira\/software\/projects/;

const updateConfig = async () => {
  const config = await new Promise(resolve =>
    chrome.runtime.sendMessage({ action: "sendConfig" }, resolve),
  );
  logger.setDebug(config.ENABLE_LOG);
  prStatus.config = config;
  logger.debug(config);
};

let refreshing = false;
const refresh = async () => {
  const isJiraClassic = !!window.location.href.match(JIRA_URL_CLASSIC);
  const isJiraNewgen = !!window.location.href.match(JIRA_URL_NEWGEN);

  if (!isJiraClassic && !isJiraNewgen) {
    refreshing = false;
    logger.log("refresh aborted: not a jira board url pattern", {
      href: window.location.href,
      isJiraClassic,
      isJiraNewgen,
    });
    return;
  }

  const projectKeyMatch = isJiraClassic
    ? window.location.search.match(/projectKey=([A-Z]+)/)
    : window.location.href.match(/jira\/software\/projects\/([A-Z]+)\/boards/);

  let jiraProjectKey = projectKeyMatch && projectKeyMatch[1];

  const config = prStatus.config;
  logger.debug("refresh triggered", { config, jiraProjectKey });
  if (!config.GITHUB_TOKEN || !config.GITHUB_TOKEN.length) {
    logger.error("refresh aborted: no github token", config);
    refreshing = false;
    return;
  }

  let GITHUB_ACCOUNT = config.GITHUB_ACCOUNT;

  if (refreshing) {
    logger.debug("Already refreshing...");
    return;
  }
  refreshing = true;

  const issues = await getJiraIssues(null, isJiraNewgen);

  logger.debug({ issues });

  let issuesUpdated = [];

  if (issues.length) {
    if (!jiraProjectKey) {
      jiraProjectKey = issues[0].key.split("-")[0];
    }

    if (!GITHUB_ACCOUNT || !GITHUB_ACCOUNT.length) {
      const prs = issues[0].prs || issues[0].noprs;
      GITHUB_ACCOUNT = prs && prs.length && prs[0].url.split("/").slice(-4)[0];
    }

    logger.debug("extracted details", {
      isJiraClassic,
      isJiraNewgen,
      jiraProjectKey,
      GITHUB_ACCOUNT,
    });

    const openPrs = jiraProjectKey
      ? await getOpenPrs(jiraProjectKey, GITHUB_ACCOUNT)
      : [];
    const draftPrs = openPrs.filter(pr => pr.draft);
    logger.debug("all open prs from github", { openPrs, draftPrs });

    issuesUpdated = await Promise.all(
      issues &&
        issues.map(async issue => {
          const prs = await getPrsWithReviews(issue);
          const prStatusRows = prs.filter(Boolean).map(pr => {
            const repo = pr.url.split("/").slice(-3)[0];
            return htmlToInsert(pr, repo, draftPrs);
          });
          const noprStatusRows = issue.noprs.map(nopr => {
            const repo = nopr.repository.url.split("/").slice(-1)[0];
            return htmlToInsert(nopr, repo, draftPrs);
          });

          const rows = [...prStatusRows, ...noprStatusRows];

          return renderIssue(issue, rows, isJiraNewgen);
        }),
    );
  }

  const updatedCount = issuesUpdated.filter(Boolean).length;
  logger.log(
    `Issues found in selected columns: ${issues.length}, updated with pr statuses: ${updatedCount}`,
  );

  // fix bad css on newgen boards to allow cards auto grow with new lines
  if (updatedCount && isJiraNewgen) {
    [
      ...document.querySelectorAll(
        ".ReactVirtualized__Grid__innerScrollContainer",
      ),
    ].forEach(e => {
      e.style.height = "auto";
    });
    [
      ...document.querySelectorAll(
        ".ReactVirtualized__Grid__innerScrollContainer > div",
      ),
    ].forEach(e => {
      e.style.position = "static";
      e.style.height = "auto";
    });
  }

  try {
    chrome.runtime.sendMessage({ action: "updateBadge", value: updatedCount });
  } catch (err) {
    logger.log("Error sending update for badge", err);
  }
  refreshing = false;
};

chrome.runtime.onMessage.addListener(async (request, sender) => {
  if (request == "refresh") {
    logger.debug("content script received message: refresh", { sender });
    await updateConfig().then(refresh);
  }
});

const throttledRefresh = throttle(async () => {
  try {
    await refresh();
  } catch (err) {
    logger.error("refresh error", err);
  }
}, THROTTLE_RATE);

window.addEventListener("load", async e => {
  const isJiraClassic = !!window.location.href.match(JIRA_URL_CLASSIC);
  const isJiraNewgen = !!window.location.href.match(JIRA_URL_NEWGEN);
  if (isJiraClassic || isJiraNewgen) {
    logger.debug("content script load");
    await updateConfig().then(refresh);
    logger.debug("content script refreshed with config", prStatus.config);

    const targetNode =
      document.querySelector("#ghx-work") ||
      document.querySelector("[data-test-id='software-board.board-area']");
    if (targetNode) {
      const refreshNow = document.querySelector(".js-refresh-now");
      if (refreshNow)
        refreshNow.addEventListener("click", throttledRefresh, false);

      targetNode.addEventListener(
        "mouseup",
        e => {
          logger.debug("drag event detected", e.currentTarget);
          setTimeout(refresh, 2000);
        },
        false,
      );
    }

    window.addEventListener("keydown", event => {
      if (event.key === "Shift") {
        chrome.runtime.sendMessage({ action: "shiftPressed" });
      }
    });
    window.addEventListener("keyup", event => {
      if (event.key === "Shift") {
        chrome.runtime.sendMessage({ action: "shiftReleased" });
      }
    });
  }
});
