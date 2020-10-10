import { throttle } from "./utils";
import makeLogger from "./logger";
const logger = makeLogger("cs");
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
  logger.setDebug(config.ENABLE_LOG);
  prStatus.config = config;
  logger.debug({ prStatus });
};

const reviewStateIcon = {
  APPROVED: `<svg style="background:#28a745; padding: 2px; border-radius: 20px;" fill="white" width="12" height="12" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>`,
  COMMENTED: `<svg width="16" height="16" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M2.75 2.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75zM1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"></path></svg>`,
  CHANGES_REQUESTED: `<svg style="vertical-align:top" fill="#cb2431" width="14" height="14" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M2.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25V4.664a.25.25 0 00-.073-.177l-2.914-2.914a.25.25 0 00-.177-.073H2.75zM1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16H2.75A1.75 1.75 0 011 14.25V1.75zm7 1.5a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0V7h-1.5a.75.75 0 010-1.5h1.5V4A.75.75 0 018 3.25zm-3 8a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z"></path></svg>`,
  PENDING: `<svg width="16" height="16" version="1.1" viewBox="0 0 100 100" style="fill: rgb(255, 128, 0);">  <path d="M 50 0 C 22.388 0 0 22.388 0 50 C 0 77.612 22.388 100 50 100 C 77.611 100 99.999 77.612 99.999 50 C 100.124 22.388 77.611 0 50 0 Z M 25.497 56.841 C 21.766 56.841 18.656 53.731 18.656 50 C 18.656 46.269 21.766 43.159 25.497 43.159 C 29.229 43.159 32.338 46.269 32.338 50 C 32.338 53.856 29.353 56.841 25.497 56.841 Z M 50 56.841 C 46.269 56.841 43.158 53.731 43.158 50 C 43.158 46.269 46.269 43.159 50 43.159 C 53.731 43.159 56.84 46.269 56.84 50 C 56.84 53.856 53.731 56.841 50 56.841 Z M 74.502 56.841 C 70.771 56.841 67.661 53.731 67.661 50 C 67.661 46.269 70.771 43.159 74.502 43.159 C 78.233 43.159 81.342 46.269 81.342 50 C 81.342 53.856 78.233 56.841 74.502 56.841 Z"/></svg>`,
};

const prAttr = (state, attr) => {
  const attribs = {
    open: {
      text: "Open",
      color: "#28a745",
      svg: `<svg width="14" height="14" style="vertical-align: text-top" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path></svg>`,
      width: 50,
    },
    merged: {
      text: "Merged",
      color: "#6f42c1",
      svg: `<svg width="14" height="14" style="vertical-align: text-top" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"></path></svg>`,
      width: 65,
    },
    closed: {
      text: "Closed",
      color: "#d73a49",
      svg: `<svg width="14" height="14" style="vertical-align: text-top"  viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path></svg>`,
      width: 65,
    },
    default: { text: state, color: "gray", svg: "" },
  };
  return (attribs[state] || attribs.default)[attr];
};

let refreshing = false;
const refresh = async useCache => {
  if (refreshing) {
    logger.debug("Already refreshing...");
    return;
  }
  refreshing = true;

  const config = prStatus.config;
  logger.debug("refresh triggered", config);
  if (!config.GITHUB_TOKEN || !config.GITHUB_TOKEN.length) {
    logger.error("refresh aborted: no github token", config);
    return;
  }

  const issues = await getJiraIssues(/*config.JIRA_COLUMNS*/);

  logger.debug({ issues });

  const issuesUpdated = await Promise.all(
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
          logger.debug(
            "No extra fields node to inject. Adding section.",
            issue.key,
          );
          const lastSection = issueNode.querySelectorAll(
            "section:last-of-type",
          )[0];
          lastSection.insertAdjacentHTML(
            "beforebegin",
            "<section class='ghx-extra-fields'></section>",
          );
          extraFieldsNode = issueNode.querySelector(".ghx-extra-fields");
        }

        const prStatusRows = prs.filter(Boolean).map(pr => {
          const reviews = pr.reviews || [];
          const repo = pr.url.split("/").slice(-3)[0];

          const status =
            pr.status === "DECLINED" ? "closed" : pr.status.toLowerCase();
          const color = prAttr(status, "color");
          const imageUrl = prAttr(status, "imageUrl");
          const svg = prAttr(status, "svg");
          const text = prAttr(status, "text");
          const width = prAttr(status, "width");

          return `
            <div class="ghx-row prstatus-row" style="position:relative; max-width: 100%; line-height:1.85em; max-height:1.85em; font-size: smaller">
              <a
                href="${pr.url}"
                target="_blank"
                onclick="arguments[0].stopPropagation()"
                title="${pr.name}"
                style="padding:2px 1px 3px 2px; border-radius:4px; text-decoration: none; color: white; background:${color}; fill: white; vertical-align:top"
              >
                ${svg}
                <span style="margin-left: -1px;">${text}</span>
              </a>
              <span style="display:inline-block;text-overflow:ellipsis; margin-left: 2px; max-width:calc(100% - ${
                reviews.length * 16 + width
              }px); overflow:hidden;">${repo}</span>
              <span style="position:absolute; right:0">
                ${reviews
                  .map(r => {
                    const icon = reviewStateIcon[r.state];
                    return `
                      <span title="${
                        r.user.login
                      }" style="cursor: auto; margin: 0 0 0 -2px;" >
                        ${icon || r.state}
                      </span>
                      `;
                  })
                  .join("")}
              </span>
            </div>
          `;
        });
        const elems = extraFieldsNode.querySelectorAll(".prstatus-row");
        if (elems && elems.length) [...elems].forEach(elem => elem.remove());

        extraFieldsNode.insertAdjacentHTML("beforeend", prStatusRows.join(""));
        return prStatusRows.length > 0;
      }),
  ).finally(() => {
    refreshing = false;
  });

  const updatedCount = issuesUpdated.filter(Boolean).length;
  logger.log(
    `Issues found in selected columns: ${issues.length}, updated with pr statuses: ${updatedCount}`,
  );
  chrome.runtime.sendMessage({ action: "updateBadge", value: updatedCount });
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

if (JIRA_BOARD_ID && JIRA_BOARD_ID.length) {
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
  });
}
