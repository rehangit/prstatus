import { throttle } from "./utils";
import { getPrsWithReviews } from "./github";

let log = console.log;

log("content script global");
const THROTTLE_RATE = 500;
let globalConfig = {};

const JIRA_BOARD_ID = window.location.search.match("rapidView=([0-9]+?)&")[1];
const JIRA_BASE_URL = `/rest/agile/1.0/board/${JIRA_BOARD_ID}`;

const updateConfig = async () => {
  const config = await new Promise(resolve =>
    chrome.runtime.sendMessage({ action: "sendConfig" }, resolve),
  );

  if (!config.ENABLE_LOG) {
    console.log("Details logs disabled. config.ENABLE_LOG=", config.ENABLE_LOG);
    log = function () {};
  } else {
    log = console.log;
  }

  globalConfig = config;

  const jiraBoardColumns = await fetch(`${JIRA_BASE_URL}/configuration`)
    .then(r => r.json())
    .then(boardConfig => boardConfig.columnConfig.columns);
  log({ jiraBoardColumns });

  const configCols = config.JIRA_COLUMNS.trim().toLowerCase();
  const activeCols = jiraBoardColumns.filter(c =>
    configCols.toLowerCase().includes(c.name.toLowerCase()),
  );

  const activeStatuses = await Promise.all(
    activeCols
      .map(c => c.statuses.map(s => s.id))
      .flat()
      .map(id =>
        fetch(`/rest/api/2/status/${id}`)
          .then(r => r.json())
          .then(s => s.name),
      ),
  );

  if (activeStatuses.length === 0) activeStatuses.push("Code Review");
  log({ activeCols, activeStatuses });

  globalConfig.JIRA_REFRESH_URL = `${JIRA_BASE_URL}/issue?jql=${activeStatuses
    .map(s => `status="${s.trim()}"`)
    .join(" OR ")}`;
  log({ globalConfig });
};

const reviewStateIcon = {
  APPROVED: "icons/approved.png",
  COMMENTED: "icons/commented.png",
  CHANGES_REQUESTED: "icons/change_requested.png",
};

const prAttr = (state, attr) => {
  const attribs = {
    open: {
      text: "Open",
      color: "#2cbf4e",
      imageUrl: chrome.runtime.getURL("icons/open.png"),
    },
    closed: {
      text: "Merged",
      color: "#6f42c1",
      imageUrl: chrome.runtime.getURL("icons/closed.png"),
    },
    default: { text: state, color: "gray", imageUrl: "" },
  };
  return (attribs[state] || attribs.default)[attr];
};

let refreshing = false;
const refresh = async useCache => {
  if (refreshing) {
    log("Alreading refreshing...");
    return;
  }
  refreshing = true;

  const config = globalConfig;
  log("pr status refresh", { config });

  return fetch(config.JIRA_REFRESH_URL)
    .then(r => r.json())
    .then(({ issues }) => {
      console.info("Total issues to refresh", issues.length);

      return Promise.all(
        issues.map(async issue => {
          const prs = await getPrsWithReviews(issue.key, useCache);
          if (prs.length === 0) return;

          const extraFieldsNode = document.querySelector(
            `.ghx-issue[data-issue-id='${issue.id}'] .ghx-extra-fields`,
          );
          if (!extraFieldsNode) return;

          const prStatusRows = prs.map(pr => {
            const reviews = pr.reviews || [];
            const color = prAttr(pr.state, "color");
            const imageUrl = prAttr(pr.state, "imageUrl");
            const text = prAttr(pr.state, "text");

            return `
        <div class="ghx-row prstatus-row" style="position:relative; max-width: 100%; margin:2px 0; max-height: 24px;">
            <a
              href="${pr.html_url}"
              target="_blank"
              onclick="arguments[0].stopPropagation()"
              title="${pr.title}"
              style="padding:1px 4px 1px 2px; border-radius:2px; text-decoration: none; color: white; background:${color}"
            ><img style="vertical-align: text-top; margin-right:2px;" src="${imageUrl}">${text}</a>
          <span style="overflow-text:ellipsis;">${
            pr.repository_url.split("/").slice(-1)[0]
          }</span>
          <span style="position:absolute; right:0">
            ${reviews
              .map(
                r => `
                  <span title="${r.user.login}" style="cursor:auto;" >
                    <img width="16px" height="16px" src="${chrome.runtime.getURL(
                      reviewStateIcon[r.state],
                    )}" >
                  </span>
                  `,
              )
              .join("")}
          </span>
        </div>
      `;
          });
          const elems = extraFieldsNode.querySelectorAll(".prstatus-row");
          if (elems && elems.length) [...elems].forEach(elem => elem.remove());

          extraFieldsNode.insertAdjacentHTML(
            "beforeend",
            prStatusRows.join(""),
          );
        }),
      );
    })
    .finally(() => {
      log("Refreshing finally completed");
      refreshing = false;
    });
};

chrome.runtime.onMessage.addListener(async (request, sender) => {
  if (request == "refresh") {
    log("content script received message: refresh", { sender });
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
    log("observerCallback", event, observer);

    if (observer.refresh && !observer.pause) {
      log("initiating a throttled refresh");
      await observer.refresh(true);
    }
  }
};

window.addEventListener("load", async e => {
  log("content script load");
  await updateConfig().then(refresh);
  log("content script refreshed with config", globalConfig);

  const observer = new MutationObserver(observeCallback);
  const targetNode = document.querySelector("#ghx-work");
  observer.observe(targetNode, { childList: true, subtree: true });

  const throttledRefresh = throttle(async () => {
    observer.pause = true;
    await refresh();
    observer.pause = false;
  }, THROTTLE_RATE);
  observer.refresh = throttledRefresh;

  targetNode.addEventListener("dragend", throttledRefresh, false);
  // targetNode.addEventListener("mouseup", throttledRefresh, false);
});
