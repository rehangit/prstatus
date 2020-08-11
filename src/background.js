import makeLogger from "./logger";
const logger = makeLogger("bg");

const defaultConfig = {
  GITHUB_TOKEN: "",
  JIRA_COLUMNS: "",
  URL_PATTERN_FOR_PAGE_ACTION: ".+.atlassian.net/secure/RapidBoard.jspa",
  ENABLE_LOG: false,
  AUTO_UPDATE: true,
};

const readConfig = () => {
  const localStorageConfig =
    JSON.parse(localStorage.getItem("PrStatusConfig") || null) || defaultConfig;
  return localStorageConfig;
};

let isShiftPressed = false;

const knownTabs = {};
let autoUpdateInterval;
const updateKnownTabs = (tabId, url) => {
  const config = readConfig();
  const matchedUrl = url && url.match(config.URL_PATTERN_FOR_PAGE_ACTION);

  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    logger.debug("auto update cleared");
  }

  if (matchedUrl || knownTabs[tabId]) {
    setTimeout(() => chrome.tabs.sendMessage(tabId, "refresh"), 2000);
    knownTabs[tabId] = true;
  } else {
    knownTabs[tabId] = false;
  }

  if (config.AUTO_UPDATE && knownTabs[tabId]) {
    autoUpdateInterval = setInterval(
      () => chrome.tabs.sendMessage(tabId, "refresh"),
      2 * 10 * 1000,
    );
    logger.debug("auto update setup to refresh");
  }
};

chrome.runtime.onInstalled.addListener(details => {
  const localStorageConfig = localStorage.getItem("PrStatusConfig") || "{}";
  const config = { ...defaultConfig, ...JSON.parse(localStorageConfig) };

  localStorage.setItem("PrStatusConfig", JSON.stringify(config));

  logger.debug("PR Status background", config);
  logger.setDebug(config.ENABLE_LOG);

  if (details.reason === "install") {
    chrome.tabs.create({ url: "options/index.html" });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug(`received message: ${request.action} from ${sender.url}`, {
    request,
    sender,
  });
  switch (request.action) {
    case "sendConfig": {
      const config = readConfig();
      logger.debug("sending config", config);
      sendResponse(config);
      break;
    }

    case "saveConfig": {
      logger.debug("saving config", request.config);
      localStorage.setItem("PrStatusConfig", JSON.stringify(request.config));
      logger.setDebug(request.config.ENABLE_LOG);
      sendResponse(undefined);
      break;
    }

    case "shiftPressed":
      isShiftPressed = true;
      break;

    case "shiftReleased":
      isShiftPressed = false;
      break;

    case "updateBadge":
      const tabId = sender.tab.id;
      const text = request.value.toString();
      const color = "#55e";
      chrome.browserAction.setBadgeText({ tabId, text });
      chrome.browserAction.setBadgeBackgroundColor({ tabId, color });
      break;

    default:
      break;
  }
});

let bgIsShiftPressed = false;
window.addEventListener("keydown", event => {
  if (event.key === "Shift") {
    bgIsShiftPressed = true;
  }
});
window.addEventListener("keyup", event => {
  if (event.key === "Shift") {
    bgIsShiftPressed = false;
  }
});

chrome.browserAction.onClicked.addListener((tab, clickData) => {
  const { URL_PATTERN_FOR_PAGE_ACTION } = readConfig();
  logger.debug("Browser action on click handler", {
    tab,
    clickData,
    isShiftPressed,
    bgIsShiftPressed,
  });

  if (tab && tab.url.match(URL_PATTERN_FOR_PAGE_ACTION)) {
    const isShift =
      (clickData &&
        clickData.modifiers &&
        clickData.modifiers.includes("Shift")) ||
      isShiftPressed ||
      bgIsShiftPressed;
    if (isShift) {
      chrome.tabs.create({ url: "options/index.html" });
      isShiftPressed = false;
    } else {
      logger.debug("refreshing: ", tab);
      chrome.tabs.sendMessage(tab.id, "refresh");
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  logger.debug("onUpdated", changeInfo.status || tab.status, { tabId, tab });

  if (changeInfo.status === "complete" || tab.status === "complete") {
    logger.debug("chrome.tabs.onUpdated.addListener", {
      tabId,
      changeInfo,
      tab,
    });
    updateKnownTabs(tabId, tab.url);
    if (!tab || !tab.url) {
      logger.error("No url match found for tabId:", tabId);
    }
  }
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  logger.debug("tab activated", tabId, knownTabs);

  if (knownTabs[tabId]) {
    chrome.browserAction.enable(tabId);
    chrome.browserAction.setBadgeText({ tabId, text: "" });
    logger.debug(`tab:${tabId} already known. enabling ext.`);
  } else {
    logger.debug(`tab:${tabId} not known. disabling ext on it.`);
    chrome.browserAction.disable(tabId);
  }

  updateKnownTabs(tabId);
  isShiftPressed = false;
});
