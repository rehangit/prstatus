import { verifyGithubToken } from "./utils";
const { version } = chrome.runtime.getManifest();

let log = () => {}; //console.log;

const description = {
  GITHUB_ACCOUNT: ["Github Account", "GitHub main account name (org or user)"],
  GITHUB_TOKEN: [
    "Github Token",
    "<a href='https://github.com/settings/tokens' target='_blank'>Personal Access Token</a> with atleast 'repo' scope",
  ],
  JIRA_COLUMNS: [
    "JIRA Column(s)",
    "Only update JIRA issues that appear in following columns: (comma separated array of column header names; default = 'Code Review')",
  ],
  URL_PATTERN_FOR_PAGE_ACTION: [
    "Page Filter",
    "Url regex to restrict the scope of this extension",
  ],
};

const configField = config => key => {
  const [legend, desc] = description[key];
  const value = config[key];
  return `
  <fieldset>
    <legend>${legend}</legend>
    <label for="${key}">${desc}</label>
    <input name="${key}" type="text" class="field-value" value="${value}" spellcheck="false">
    <div style="display:none" class="status" name="${key}"></div>
  </fieldset>
  `;
};

const configForm = config => {
  const field = configField(config);
  return `
    ${field("GITHUB_ACCOUNT")}
    ${field("GITHUB_TOKEN")}
    ${field("JIRA_COLUMNS")}

    <fieldset>
      <legend>Advanced</legend>
      <input type="checkbox" name="ENABLE_LOG" ${
        config.ENABLE_LOG ? "checked" : ""
      } value="true" >
      <label for="ENABLE_LOG">Enable logs</label>
    </fieldset>

    <button class="cancel" >Cancel</button>
    <button class="save" default>Save</button>
  `;
};

const populateConfig = config => {
  log("options page received config from background", { config });
  // document.querySelector("#config form").innerHTML = configForm(config);
  document
    .querySelector("#config form")
    .insertAdjacentHTML("afterbegin", configForm(config));
};

const showGithubValidation = async e => {
  const token = document.querySelector("input[name=GITHUB_TOKEN]").value;
  const account = document.querySelector("input[name=GITHUB_ACCOUNT]").value;

  log("showGithubValidation called.", { account, token });
  if (!account || !token) return;

  const statusToken = document.querySelector(".status[name=GITHUB_TOKEN]");
  const { scopes, user, org } = await verifyGithubToken(account, token);
  log({ scopes, user, org });
  statusToken.setAttribute("style", "display:block");
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
    if (!config.ENABLE_LOG && config.ENABLE_LOG !== "true") log = () => {};

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
      console.log("Config being sent to background", { config });
      chrome.runtime.sendMessage({ action: "saveConfig", config });
    }
    window.close();
  });
});
