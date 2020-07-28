import { verifyGithubToken } from "../github";
import makeLogger from "../logger";
const logger = makeLogger("options");

logger.disableDebug();

const { version } = chrome.runtime.getManifest();

const description = {
  GITHUB_ACCOUNT: ["Github Account", "GitHub main account name (org or user)"],
  GITHUB_TOKEN: [
    "Github Token",
    "<a href='https://github.com/settings/tokens' target='_blank'>Personal Access Token</a> with atleast 'repo' scope",
    "",
    "<div>Checking token validity and access for Github repos ...<br/> Just a sec...<div>",
  ],
  JIRA_COLUMNS: [
    "JIRA Column(s)",
    `By default all middle columns (other than first and last) are updated.
    <br/>Override to only update JIRA issues that appear in following columns:`,
    "",
    "Column header names</b> separated by comma. (Spaces trimmed; case ignored.)",
  ],
  URL_PATTERN_FOR_PAGE_ACTION: [
    "Page Filter",
    "Url regex to restrict the scope of this extension",
  ],
  ENABLE_LOG: ["Advanced", "Enable debug logs"],
};

const configField = config => (key, attribs = "") => {
  const [legend, desc, placeholder = "", statusText = ""] = description[key];
  const value = config[key];
  return `
  <fieldset class="${key}">
    <legend>${legend}</legend>
    <label for="${key}">${desc}
    <input ${attribs} name="${key}" type="text" class="field-value" value="${value}" spellcheck="false" placeholder="${placeholder}">
    </label>
    <div class="status" name="${key}">${statusText}</div>
  </fieldset>
  `;
};

const configForm = config => {
  const field = configField(config);
  return `
    ${field("GITHUB_ACCOUNT")}
    ${field("GITHUB_TOKEN")}
    ${field("JIRA_COLUMNS")}
    ${field(
      "ENABLE_LOG",
      `type=\"checkbox\" ${
        config.ENABLE_LOG ? "checked" : ""
      } value=\"true\" class=""`,
    )}

    <button class="cancel" >Cancel</button>
    <button class="save" default>Save</button>
  `;
};

const populateConfig = config => {
  logger.debug("options page received config from background", { config });
  // document.querySelector("#config form").innerHTML = configForm(config);
  document
    .querySelector("#config form")
    .insertAdjacentHTML("afterbegin", configForm(config));
};

const showGithubValidation = async e => {
  const token = document.querySelector("input[name=GITHUB_TOKEN]").value;
  const account = document.querySelector("input[name=GITHUB_ACCOUNT]").value;

  logger.debug("showGithubValidation called.", { account, token });
  if (!account || !token) return;

  const statusToken = document.querySelector(".status[name=GITHUB_TOKEN]");
  statusToken.setAttribute("style", "");

  const { scopes, user, org } = await verifyGithubToken(account, token);
  logger.debug({ scopes, user, org });
  statusToken.setAttribute("style", "animation:none; opacity:1;");
  const scopeGood = scopes && scopes.includes("repo");
  const colorUser = typeof user === "string" ? "red" : "initial";
  const colorOrg = typeof org === "string" ? "red" : "initial";

  statusToken.innerHTML = `
    <div>Token scopes: <b>${scopes}.</b> 
      <span style='font-size:large;color:${scopeGood ? "green" : "red"}'>
        ${scopeGood ? "✓" : "✗"}
      </span>
    </div>
    <div>Number of repos accessible through this token: 
      <b>User</b>: <span style="color:${colorUser}">${user}. </span>
      <b>Org</b>: <span style="color:${colorOrg}">${org}.</span>
    </div>
  `;
};

document.getElementById("version").innerText = version;

window.addEventListener("load", () => {
  chrome.runtime.sendMessage({ action: "sendConfig" }, config => {
    populateConfig(config);
    logger.enableDebug(config.ENABLE_LOG);

    document
      .querySelector("input[name=GITHUB_TOKEN]")
      .addEventListener("blur", showGithubValidation);
    setTimeout(showGithubValidation, 10);
  });

  document.querySelector("form").addEventListener("submit", function (e) {
    if (e.submitter.className === "save") {
      const config = Array.from(
        new FormData(document.querySelector("form")),
      ).reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {});
      logger.debug("Config being sent to background", { config });
      chrome.runtime.sendMessage({ action: "saveConfig", config });
    }
    window.close();
  });
});
