console.log("content script global");

function debounce(func, wait, immediate) {
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
}

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

const injectPrStatus = async (config) => {
  const boardId = window.location.search.match("rapidView=([0-9]+?)&")[1];
  const jql =
    config.JIRA_STATUSES &&
    config.JIRA_STATUSES.trim()
      .split(",")
      .map((s) => `status="${s.trim()}"`)
      .join(" OR ");
  const fetchUrl = `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}`;
  console.log({ jql, fetchUrl });

  const issues = await fetch(fetchUrl)
    .then((r) => r.json())
    .then((d) => d.issues.map(({ key, id }) => ({ key, id })))
    .catch(console.error);

  console.log({ boardId, jiraStatuses: config.JIRA_STATUSES, issues });

  issues.forEach((i) => {
    const htmlToInsert = `
    <div class="ghx-row prstatus-row">
        <span class="ghx-extra-field" >
            <span class="ghx-extra-field-content" style="font-weight: bold; color: green">Rehan ✔</span>
            <span class="ghx-extra-field-content" style="font-weight: bold; color: red">Jon ✘</span>
        </span>
    </div>
    `;
    const extraFieldsNode = document.querySelector(
      `.ghx-issue[data-issue-id='${i.id}'] .ghx-extra-fields`,
    );
    if (!extraFieldsNode) return;

    const elem = extraFieldsNode.querySelector(".prstatus-row");
    if (elem) elem.remove();
    extraFieldsNode.insertAdjacentHTML("beforeend", htmlToInsert);
  });
};

// const getPRStatus = (config) => {
//   fetch("https://api.github.com/repos/rehanahmad/Hello-World/pulls/1347", { method: "GET" /repos/:owner/:repo/pulls})
// }

const refresh = () => {
  return new Promise((resolve) => {
    console.log("content script received event to refresh");
    chrome.runtime.sendMessage({ action: "sendConfig" }, async (config) => {
      console.log("content script received config for injection:", config);
      await injectPrStatus(config).then(resolve);
    });
  });
};

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request == "refresh") {
    console.log("content script received message: refresh", { sender });
    refresh();
  }
});

// Callback function to execute when mutations are observed
const observeCallback = function (mutationsList, observer) {
  // Use traditional 'for loops' for IE 11
  const event = {};
  for (let { type } of mutationsList) {
    if (type === "childList" || type === "attributes")
      event[type] = +(event[type] || 0) + 1;
  }
  if (observer.refresh && !observer.pause) {
    console.log("scheduling a refresh", event);
    observer.refresh();
  }
};

window.addEventListener(
  "load",
  (e) => {
    refresh(e);
    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(observeCallback);

    // Start observing the target node for configured mutations
    const targetNode = document.querySelector(".ghx-work");
    observer.observe(targetNode, {
      // attributes: true,
      childList: true,
      subtree: true,
    });

    const throttledRefresh = throttle(async () => {
      observer.pause = true;
      await refresh().then(() => {
        observer.pause = false;
      });
    }, 1000);

    observer.refresh = throttledRefresh;

    targetNode.addEventListener("dragend", throttledRefresh, false);
    targetNode.addEventListener("DOMAttrModified", throttledRefresh, false);
    targetNode.addEventListener(
      "loaDOMSubtreeModifiedd",
      throttledRefresh,
      false,
    );
    targetNode.addEventListener("mouseup", throttledRefresh, false);
  },
  false,
);
