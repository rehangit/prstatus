import { throttle, uniqBy } from "./utils";

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

  const activeCols = config.JIRA_COLUMNS.length
    ? jiraBoardColumns.filter(c =>
        config.JIRA_COLUMNS.toLowerCase().includes(c.name.toLowerCase()),
      )
    : jiraBoardColumns;

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

const reviewSortOrder = {
  APPROVED: 1,
  CHANGES_REQUESTED: 2,
  COMMENTED: 3,
};

const fetchCache = {};
const cachedFetch = async (url, params, useCache) => {
  if (
    fetchCache[url] &&
    fetchCache[url].res &&
    (fetchCache[url].useCache || useCache)
  ) {
    fetchCache[url].count = fetchCache[url].count + 1;
    log(url, "Cached used count:", fetchCache[url].count);
    return fetchCache[url].res;
  }
  const response = await fetch(url, { ...params, cache: "force-cache" });
  const headers = {};
  if (globalConfig.ENABLE_LOG) {
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
  }
  log(url, response, headers);

  const res = await response.json();
  fetchCache[url] = { res, count: 0, useCache: true };
  setTimeout(() => {
    fetchCache[url].useCache = false;
  }, 120000);
  return res;
};

const getPrsWithReviews = async (issueKey, useCache) => {
  const { GITHUB_ACCOUNT, GITHUB_TOKEN } = globalConfig;
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
  log({ prsTitle, prsBranch });

  const prs = uniqBy([...prsTitle, ...prsBranch].filter(Boolean), "id");
  log({ prs });

  const prsWithReviews = await Promise.all(
    prs.map(pr =>
      fetch(`${pr.pull_request.url}/reviews`, { headers })
        .then(res => {
          log(res);
          return res.json();
        })
        .then(reviews => ({
          ...pr,
          reviews: uniqBy(
            reviews
              .reverse()
              .sort(
                (a, b) => reviewSortOrder[a.state] - reviewSortOrder[b.state],
              ),
            r => r.user.id,
          ),
        }))
        .catch(err => {
          console.error(err);
          return { ...pr, reviews: [] };
        }),
    ),
  );

  log({ prsWithReviews });
  return prsWithReviews;
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

  const issues = await fetch(config.JIRA_REFRESH_URL)
    .then(r => r.json())
    .then(d => d.issues.map(({ key, id }) => ({ key, id })));

  console.info("Total issues to refresh", issues.length);

  return Promise.all(
    issues &&
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
        <div class="ghx-row prstatus-row" style="position:relative; max-width: 100%">
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

        extraFieldsNode.insertAdjacentHTML("beforeend", prStatusRows.join(""));
      }),
  ).finally(() => {
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
