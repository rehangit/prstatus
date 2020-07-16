import { throttle } from "./utils";
import logger from "./logger";
import { getJiraIssues } from "./jira";
import { getPrsWithReviews } from "./github";

const THROTTLE_RATE = 500;

logger.debug("prstatus: content script global");

global.prStatus = global.prStatus || {};
global.prStatus.config = global.prStatus.config = {};
const prStatus = global.prStatus;

const JIRA_BOARD_ID = window.location.search.match("rapidView=([0-9]+)")[1];

const updateConfig = async () => {
  const config = await new Promise(resolve =>
    chrome.runtime.sendMessage({ action: "sendConfig" }, resolve),
  );

  if (config.ENABLE_LOG || config.ENABLE_LOG === "true") {
    logger.enable();
  } else {
    logger.log("Debug logs disabled.");
    logger.disable();
  }

  prStatus.config = config;

  logger.debug({ prStatus });
};

const reviewStateIcon = {
  APPROVED: chrome.runtime.getURL("icons/approved.png"),
  COMMENTED: chrome.runtime.getURL("icons/commented.png"),
  CHANGES_REQUESTED: chrome.runtime.getURL("icons/change_requested.png"),
};

const prAttr = (state, attr) => {
  const attribs = {
    open: {
      text: "Open",
      color: "#28a745",
      imageUrl: chrome.runtime.getURL("icons/open.png"),
    },
    merged: {
      text: "Merged",
      color: "#6f42c1",
      imageUrl: chrome.runtime.getURL("icons/merged.png"),
    },
    closed: {
      text: "Closed",
      color: "#d73a49",
      imageUrl: chrome.runtime.getURL("icons/closed.png"),
    },
    default: { text: state, color: "gray", imageUrl: "" },
  };
  return (attribs[state] || attribs.default)[attr];
};

let refreshing = false;
const refresh = async useCache => {
  if (refreshing) {
    logger.debug("Alreading refreshing...");
    return;
  }
  refreshing = true;

  const config = prStatus.config;
  logger.debug("refresh", { config });

  const issues = await getJiraIssues(config.JIRA_COLUMNS);

  logger.debug({ issues });
  logger.log("Total issues to refresh", issues.length);

  return Promise.all(
    issues &&
      issues.map(async issue => {
        const prs = await getPrsWithReviews(issue);
        if (prs.length === 0) return;

        const issueNode = document.querySelector(
          `.ghx-issue[data-issue-id='${issue.id}']`,
        );
        if (!issueNode) return;
        let extraFieldsNode = issueNode.querySelector(".ghx-extra-fields");
        if (!extraFieldsNode) {
          logger.debug("No extra fields node to inject pr status");
          const lastSection = issueNode.querySelectorAll(
            "section:last-of-type",
          )[0];
          lastSection.insertAdjacentHTML(
            "beforebegin",
            "<section class='ghx-extra-fields'></section>",
          );
          extraFieldsNode = issueNode.querySelector(".ghx-extra-fields");
        }

        const prStatusRows = prs.map(pr => {
          const reviews = pr.reviews || [];
          const repo = pr.url.split("/").slice(-3)[0];

          const status =
            pr.status === "DECLINED" ? "merged" : pr.status.toLowerCase();
          const color = prAttr(status, "color");
          const imageUrl = prAttr(status, "imageUrl");
          const text = prAttr(status, "text");

          return `
            <div class="ghx-row prstatus-row" style="position:relative; max-width: 100%; line-height:1.65em; max-height:1.65em;">
              <a
                href="${pr.url}"
                target="_blank"
                onclick="arguments[0].stopPropagation()"
                title="${pr.name}"
                style="padding:1px 4px 1px 2px; border-radius:2px; text-decoration: none; color: white; background:${color}"
              ><img style="vertical-align: text-top; margin-right:2px;" src="${imageUrl}">${text}</a>
              <span style="overflow-text:ellipsis;">${repo}</span>
              <span style="position:absolute; right:0">
                ${reviews
                  .map(r => {
                    return (
                      reviewStateIcon[r.state] &&
                      `
                      <span title="${r.user.login}" style="cursor:auto;" >
                        <img width="16px" height="16px" src="${
                          reviewStateIcon[r.state]
                        }" >
                      </span>
                      `
                    );
                  })
                  .join("")}
              </span>
            </div>
          `;
        });
        const elems = extraFieldsNode.querySelectorAll(".prstatus-row");
        if (elems && elems.length) [...elems].forEach(elem => elem.remove());

        extraFieldsNode.insertAdjacentHTML("beforeend", prStatusRows.join(""));
      }),
  ).finally(() => {
    refreshing = false;
  });
};

chrome.runtime.onMessage.addListener(async (request, sender) => {
  if (request == "refresh") {
    logger.debug("content script received message: refresh", { sender });
    await updateConfig().then(refresh);
  }
});

const observeCallback = async (mutationsList, observer) => {
  const event = mutationsList.reduce((acc, mutation) => {
    const { type, target } = mutation;
    if (
      (type === "childList" || type === "attributes") &&
      target.querySelector(".ghx-issue")
    ) {
      if (!acc[type]) acc[type] = [];
      acc[type].push(mutation);
    }
    return acc;
  }, {});

  if (
    (event.childList && event.childList.length >= 0) ||
    (event.attributes && event.attributes.length >= 0)
  ) {
    logger.debug("observerCallback", event, observer);

    if (observer.refresh && !observer.pause) {
      logger.debug("initiating a throttled refresh");
      await observer.refresh(true);
    }
  }
};

if (JIRA_BOARD_ID && JIRA_BOARD_ID.length)
  window.addEventListener("load", async e => {
    logger.debug("content script load");
    await updateConfig().then(refresh);
    logger.debug("content script refreshed with config", prStatus.config);

    const targetNode = document.querySelector("#ghx-work");
    if (targetNode) {
      const observer = new MutationObserver(observeCallback);
      observer.observe(targetNode, { childList: true, subtree: true });

      const throttledRefresh = throttle(async () => {
        observer.pause = true;
        try {
          await refresh();
        } catch (err) {
          logger.error("refresh error", err);
        }
        observer.pause = false;
      }, THROTTLE_RATE);

      observer.refresh = throttledRefresh;
      targetNode.addEventListener("dragend", throttledRefresh, false);
    }

    // targetNode.addEventListener("mouseup", throttledRefresh, false);
  });
