const defaultConfig = {
  GITHUB_TOKEN: "PERSONAL_ACCESS_TOKEN_WITH_REPO_AND_USER_SCOPE",
  GITHUB_ACCOUNT: "GITHUB_ACCOUNT_NAME",
  URL_PATTERN_FOR_PAGE_ACTION: ".+.atlassian.net/secure/RapidBoard.jspa",
  JIRA_TICKET_ID_PATTERN: "[A-Z]{2,5}-[0-9]{1,4}",
};

let config;

// function displayPageAction(tabId, changeInfo, tab) {
//   const { url, title } = tab;
//   console.log({ tabId, url, status, title });
//   if (url.match(URL_PATTERN) && changeInfo.status === "complete") {
//     chrome.pageAction.setIcon({ tabId, path: "icons/icon-active.png" });
//   }
//   chrome.pageAction.show(tabId);
// }

// chrome.tabs.onUpdated.addListener(displayPageAction);

const resetPageActionRules = ({ urlMatches }) => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlMatches },
          }),
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()],
      },
    ]);
  });
};

chrome.runtime.onInstalled.addListener(() => {
  const localStorageConfig = localStorage.getItem("PrStatusConfig") || "{}";
  const config = { ...defaultConfig, ...JSON.parse(localStorageConfig) };
  localStorage.setItem("PrStatusConfig", JSON.stringify(config));
  console.log("PR Status background", config);
  resetPageActionRules({ urlMatches: config.URL_PATTERN_FOR_PAGE_ACTION });
});

// const changeBgColor = (tabId, changeInfo, tab) => {
//   const { url, title } = tab;
//   if (url.match(URL_PATTERN) && changeInfo.status === "complete") {
//     console.log("content script in background", { tabId, url, status, title });

//     chrome.tabs.executeScript({
//       code: 'document.body.style.backgroundColor="orange"'
//     });
//   }
// };

//chrome.tabs.onUpdated.addListener(changeBgColor);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("background onMessage listener", { request, sender });
  if (request == "sendConfig") {
    const localStorageConfig =
      JSON.parse(localStorage.getItem("PrStatusConfig") || null) ||
      defaultConfig;

    console.log("background onMessage listener 2", { localStorageConfig });
    sendResponse(localStorageConfig, () => {
      console.log("background onMessage sendResponse response");
    });
  }
  return true;
});
