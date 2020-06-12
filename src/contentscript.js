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
    console.log("Logs disabled. config.ENABLE_LOG=", config.ENABLE_LOG);
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

const reviewSortOrder = {
  APPROVED: 1,
  CHANGES_REQUESTED: 2,
  COMMENTED: 3,
};

const debounce = (func, wait, immediate) => {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      const tid = setTimeout(() => {
        func.apply(context, args);
        inThrottle = false;
      }, limit);
      inThrottle = true;
    }
  };
};

const uniqBy = (arr, predicate) => {
  const cb = typeof predicate === "function" ? predicate : o => o[predicate];

  return [
    ...arr
      .reduce((map, item) => {
        const key = item === null || item === undefined ? item : cb(item);

        map.has(key) || map.set(key, item);

        return map;
      }, new Map())
      .values(),
  ];
};

const getPRStatus = async config => {
  const { GITHUB_REPOS = "", GITHUB_ACCOUNT, GITHUB_TOKEN } = config;
  const repos = GITHUB_REPOS.split(",").map(r => r.trim());
  const headers = { Authorization: `token ${GITHUB_TOKEN}` };
  const baseUrl = `https://api.github.com/repos/${GITHUB_ACCOUNT}`;

  log({ repos });

  const prs = await Promise.all(
    repos.map(repo =>
      fetch(`${baseUrl}/${repo}/pulls`, { headers }).then(res => res.json()),
    ),
  )
    .then(p => p.flat())
    .catch(console.error);

  log({ prs });

  const prsWithReviews = await Promise.all(
    prs.map(pr =>
      fetch(`${pr.url}/reviews`, { headers })
        .then(res => res.json())
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
        })),
    ),
  );

  log({ prsWithReviews });
  return prsWithReviews;
};

const refresh = async () => {
  const config = globalConfig;
  log("pr status refresh", { config });

  const getIssues = () =>
    fetch(config.JIRA_REFRESH_URL)
      .then(r => r.json())
      .then(d => d.issues.map(({ key, id }) => ({ key, id })));

  const [prsWithReviews, issues] = await Promise.all([
    getPRStatus(config),
    getIssues(),
  ]).catch(console.error);

  prsWithReviews &&
    issues &&
    issues.forEach(issue => {
      const prs = prsWithReviews.filter(
        pr =>
          pr.title.toLowerCase().includes(issue.key.toLowerCase()) ||
          pr.head.ref.toLowerCase().includes(issue.key.toLowerCase()),
      );
      if (prs.length === 0) return;

      const extraFieldsNode = document.querySelector(
        `.ghx-issue[data-issue-id='${issue.id}'] .ghx-extra-fields`,
      );
      if (!extraFieldsNode) return;

      const prStatusRows = prs.map(pr => {
        const reviews = pr.reviews || [];

        return `
        <div class="prstatus-row" style="overflow-y:visible;">
          <span>
            <a 
              href="${pr.html_url}" 
              target="_blank"
              onclick="arguments[0].stopPropagation()"
              title="${pr.title}"
              style="padding:1px 4px 1px 2px; border-radius:2px; text-decoration: none; color: white; background:${
                pr.state === "open"
                  ? "#2cbf4e"
                  : pr.state === "merged"
                  ? "#6f42c1"
                  : "gray"
              }"
            ><img style="vertical-align: text-top; margin-right:2px;" src="${chrome.runtime.getURL(
              `icons/${pr.state}.png`,
            )}">${pr.state.toUpperCase()}</a>
          </span>
          <span style="float:right">
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
    const { type } = mutation;
    if (
      (type === "childList" || type === "attributes") &&
      mutation.target.querySelectorAll(".ghx-issue").length > 0
    ) {
      if (!acc[type]) acc[type] = [];
      acc[type].push(mutation);
    }
    return acc;
  }, {});

  log("observerCallback", event, observer);

  if (
    observer.refresh &&
    !observer.pause &&
    ((event.childList && event.childList.length > 0) ||
      (event.attributes && event.attributes.length > 0))
  ) {
    log("initiating a throttled refresh");
    await observer.refresh();
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
