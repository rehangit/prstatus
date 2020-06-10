let log = console.log;

log("content script global");
const THROTTLE_RATE = 500;
let globalConfig;

const updateConfig = () =>
  new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "sendConfig" }, config => {
      globalConfig = config;
      if (!config.ENABLE_LOG) {
        console.log("Logs disabled. config.ENABLE_LOG=", config.ENABLE_LOG);
        log = function () {};
      } else {
        log = console.log;
      }
      resolve(config);
    });
  });

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
  ).then(p => p.flat());

  log({ prs });

  const reviews = await Promise.all(
    prs.map(pr =>
      fetch(`${pr.url}/reviews`, { headers })
        .then(res => res.json())
        .then(reviews => ({
          ...pr,
          reviews: uniqBy(
            reviews
              // .filter(r => r.user.id !== pr.user.id || r.state==='COMMENTED')
              .reverse()
              .sort(
                (a, b) => reviewSortOrder[a.state] - reviewSortOrder[b.state],
              ),
            r => r.user.id,
          ),
        })),
    ),
  );

  log({ reviews });
  return reviews;
};

const injectPrStatus = async config => {
  log({ config });

  const boardId = window.location.search.match("rapidView=([0-9]+?)&")[1];
  const jql =
    config.JIRA_STATUSES &&
    config.JIRA_STATUSES.trim()
      .split(",")
      .map(s => `status="${s.trim()}"`)
      .join(" OR ");
  const fetchUrl = `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}`;
  log({ jql, fetchUrl });

  const issues = await fetch(fetchUrl)
    .then(r => r.json())
    .then(d => d.issues.map(({ key, id }) => ({ key, id })))
    .catch(console.error);

  const allPrs = await getPRStatus(config);

  issues.forEach(i => {
    const prs = allPrs.filter(p =>
      p.title.toLowerCase().includes(i.key.toLowerCase()),
    );
    if (prs.length === 0) return;

    const extraFieldsNode = document.querySelector(
      `.ghx-issue[data-issue-id='${i.id}'] .ghx-extra-fields`,
    );
    if (!extraFieldsNode) return;

    const prStatusRows = prs.map(pr => {
      const reviews = pr.reviews || [];

      return `
        <div class="ghx-row prstatus-row" >
          <span>
            <a 
              href="${pr.html_url}" 
              target="_blank"
              onclick="arguments[0].stopPropagation()"
              title="${pr.title}"
              style="vertical-align:top; padding:2px 8px 2px 4px; font-weight:bold; border-radius:4px; color: white; background:${
                pr.state === "open"
                  ? "#2cbf4e"
                  : pr.state === "merged"
                  ? "#6f42c1"
                  : "gray"
              }"
            ><img width="18px" height="18px" style="vertical-align: top" src="${chrome.runtime.getURL(
              `icons/${pr.state}.png`,
            )}"> ${pr.state.toUpperCase()}</a>
          </span>
          <span style="float:right">
            ${reviews
              .map(
                r => `
                  <span title="${r.user.login}" style="cursor:auto">
                    <img width="18px" height="18px" src="${chrome.runtime.getURL(
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

const refresh = (config = globalConfig) => injectPrStatus(config);

chrome.runtime.onMessage.addListener(async (request, sender) => {
  if (request == "refresh") {
    log("content script received message: refresh", { sender });
    await updateConfig().then(refresh);
  }
});

const observeCallback = async (mutationsList, observer) => {
  const event = mutationsList.reduce((acc, { type }) => {
    if (type === "childList" || type === "attributes")
      acc[type] = +(acc[type] || 0) + 1;
    return acc;
  }, {});
  log("observerCallback", event, observer);
  if (
    observer.refresh &&
    !observer.pause &&
    (event.childList > 0 || event.attributes > 0)
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
  const targetNode = document.querySelector(".ghx-work");
  observer.observe(targetNode, { childList: true, subtree: true });

  const throttledRefresh = throttle(async () => {
    observer.pause = true;
    await refresh();
    observer.pause = false;
  }, THROTTLE_RATE);
  observer.refresh = throttledRefresh;

  targetNode.addEventListener("dragend", throttledRefresh, false);
  targetNode.addEventListener("mouseup", throttledRefresh, false);
});
