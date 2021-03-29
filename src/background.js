import makeLogger from "./logger";
const logger = makeLogger("bg");

const defaultConfig = {
  GITHUB_TOKEN: "",
  JIRA_COLUMNS: "",
  ENABLE_LOG: false,
  AUTO_UPDATE: false,
  AUTO_UPDATE_INTERVAL: 60 * 1000,
};

let isShiftPressedCs = false;
let isShiftPressedBg = false;
let autoUpdateInterval = null;
const knownTabs = {};

const readConfig = () => {
  const localStorageConfig =
    JSON.parse(localStorage.getItem("PrStatusConfig") || null) || defaultConfig;
  if (localStorageConfig)
    Object.keys(localStorageConfig).forEach(k => {
      const value = localStorageConfig[k];
      const strValue = typeof value === "string" && value.toLowerCase();
      if (strValue === "true") {
        localStorageConfig[k] = true;
      }
      if (strValue === "false") {
        localStorageConfig[k] = false;
      }
    });
  return localStorageConfig;
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

  if (process.env.NODE_ENV === "development") {
    chrome.browserAction.setIcon({ path: "icons/icon-local.png" });
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
      knownTabs[sender.tab.id] = true;
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
      isShiftPressedCs = true;
      break;

    case "shiftReleased":
      isShiftPressedCs = false;
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

window.addEventListener("keydown", event => {
  if (event.key === "Shift") {
    isShiftPressedBg = true;
  }
});
window.addEventListener("keyup", event => {
  if (event.key === "Shift") {
    isShiftPressedBg = false;
  }
});

chrome.browserAction.onClicked.addListener((tab, clickData) => {
  logger.debug("Browser action on click handler", {
    tab,
    clickData,
    isShiftPressedCs,
    isShiftPressedBg,
  });

  if (tab) {
    const isShift =
      (clickData &&
        clickData.modifiers &&
        clickData.modifiers.includes("Shift")) ||
      isShiftPressedCs ||
      isShiftPressedBg;
    if (isShift) {
      chrome.tabs.create({ url: "options/index.html" });
      isShiftPressedCs = false;
    } else {
      logger.debug("refreshing: ", tab);
      chrome.tabs.sendMessage(tab.id, "refresh");
    }
  }
});

const onTabActivated = tabId => {
  logger.debug("onTabActivated", { tabId });

  if (tabId) {
    setTimeout(() => {
      logger.debug("refresh for tabId", tabId);
      chrome.tabs.sendMessage(tabId, "refresh");
    }, 1000);
    logger.debug(`Enabling extension for tab:${tabId}.`);
  }

  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    logger.debug("Auto update cleared");
  }

  const { AUTO_UPDATE, AUTO_UPDATE_INTERVAL } = readConfig();
  if (AUTO_UPDATE && tabId) {
    autoUpdateInterval = setInterval(() => {
      logger.debug("auto refresh called for tabId", tabId);
      chrome.tabs.sendMessage(tabId, "refresh");
    }, AUTO_UPDATE_INTERVAL);
    logger.debug("auto update resumed for tabId:", tabId);
  }

  if (tabId && knownTabs[tabId]) {
    chrome.browserAction.enable(tabId);
  } else {
    chrome.browserAction.disable(tabId);
  }
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  logger.debug("onUpdated", { tabId, changeInfo, tab });
  if (changeInfo.status === "complete" || tab.status === "complete") {
    if (tab.url || knownTabs[tabId]) {
      knownTabs[tabId] = true;
      onTabActivated(tabId);
    }
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  let isActive = false;
  const isKnown = knownTabs[tabId];
  logger.debug("onActivated", { tabId, windowId, isKnown });

  onTabActivated(isKnown ? tabId : null);
  isShiftPressedCs = false;
  isShiftPressedBg = false;
});

const clearUp = () => {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    logger.debug("Auto update cleared");
  }
  isShiftPressedBg = false;
  isShiftPressedCs = false;
};

chrome.tabs.onRemoved.addListener(tabId => {
  if (knownTabs[tabId]) clearUp();
  knownTabs[tabId] = false;
});
