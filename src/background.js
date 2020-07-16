import logger from "./logger";
logger.enable();

const defaultConfig = {
  GITHUB_ACCOUNT: "",
  GITHUB_TOKEN: "",
  JIRA_COLUMNS: "Code Review",
  URL_PATTERN_FOR_PAGE_ACTION: ".+.atlassian.net/secure/RapidBoard.jspa",
  ENABLE_LOG: false,
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

  logger.log("PR Status background", config);
  logger.enable(config.ENABLE_LOG);

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
  logger.debug(`received message: ${request.action} from ${sender.url}`, {
    request,
    sender,
  });
  if (request.action == "sendConfig") {
    const config = readConfig();
    logger.debug("sending config", config);
    sendResponse(config);
  }

  if (request.action == "saveConfig") {
    logger.debug("saving config", request.config);
    localStorage.setItem("PrStatusConfig", JSON.stringify(request.config));
    logger.enable(request.config.ENABLE_LOG);
  }
});

chrome.pageAction.onClicked.addListener((...args) => {
  logger.debug("Page action on click handler", { args });
  chrome.tabs.sendMessage(args[0].id, "refresh");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    logger.debug("chrome.tabs.onUpdated.addListener", {
      tabId,
      changeInfo,
      tab,
    });
    const { URL_PATTERN_FOR_PAGE_ACTION } = readConfig();
    if (tab.url.match(URL_PATTERN_FOR_PAGE_ACTION)) {
      logger.debug(
        "chrome.tabs.onUpdated.addListener sending message to tab",
        tabId,
      );
      chrome.tabs.sendMessage(tabId, "refresh");
    }
  }
});
