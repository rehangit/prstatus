const defaultConfig = {
  GITHUB_ACCOUNT: "",
  GITHUB_TOKEN: "",
  GITHUB_REPOS: "",
  JIRA_COLUMNS: "Code Review",
  URL_PATTERN_FOR_PAGE_ACTION: ".+.atlassian.net/secure/RapidBoard.jspa",
  ENABLE_LOG: true,
};

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

chrome.runtime.onInstalled.addListener(details => {
  const localStorageConfig = localStorage.getItem("PrStatusConfig") || "{}";
  const config = { ...defaultConfig, ...JSON.parse(localStorageConfig) };
  localStorage.setItem("PrStatusConfig", JSON.stringify(config));
  console.log("PR Status background", config);
  resetPageActionRules({ urlMatches: config.URL_PATTERN_FOR_PAGE_ACTION });
  if (details.reason === "install") {
    chrome.tabs.create({ url: "options/index.html" });
  }
});

const readConfig = () => {
  const localStorageConfig =
    JSON.parse(localStorage.getItem("PrStatusConfig") || null) || defaultConfig;
  return localStorageConfig;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("background onMessage received message to send config", {
    request,
    sender,
  });
  if (request.action == "sendConfig") {
    const config = readConfig();
    console.log("background onMessagesending config", { config });
    sendResponse(config);
  }

  if (request.action == "saveConfig") {
    console.log("background onMessage saveConfig", { config: request.config });
    localStorage.setItem("PrStatusConfig", JSON.stringify(request.config));
  }
});

chrome.pageAction.onClicked.addListener((...args) => {
  console.log("Page action on click handler", { args });
  chrome.tabs.sendMessage(args[0].id, "refresh");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    console.log("In background chrome.tabs.onUpdated.addListener", {
      tabId,
      changeInfo,
      tab,
    });
    const { URL_PATTERN_FOR_PAGE_ACTION } = readConfig();
    if (tab.url.match(URL_PATTERN_FOR_PAGE_ACTION)) {
      console.log(
        "In background chrome.tabs.onUpdated.addListener sending message to tab",
        tabId,
      );
      chrome.tabs.sendMessage(tabId, "refresh");
    }
  }
});
