import { verifyGithubToken } from "../github";
import makeLogger from "../logger";
const logger = makeLogger("options");

const { version } = chrome.runtime.getManifest();

const populateConfig = config => {
  logger.debug("options page received config from background", { config });
  const ghtInput = document.querySelector("form .GITHUB input");
  ghtInput.value = config.GITHUB_TOKEN;
};

const showGithubValidation = async e => {
  if (e) e.preventDefault();
  const form = document.querySelector("#config form .GITHUB");
  const token = form.querySelector("input[name=GITHUB_TOKEN]").value;

  logger.debug("showGithubValidation called.", { token });
  if (!token || !token.length) return;

  const tokenStatusInitial = form.querySelector(".status .initial");
  const tokenStatusResult = form.querySelector(".status .result");

  tokenStatusInitial.style.display = "block";
  tokenStatusResult.style.display = "none";

  const {
    scopes,
    username,
    orgname,
    orgrepos,
    userrepos,
  } = await verifyGithubToken(token);
  logger.debug({ scopes, username, orgname, userrepos, orgrepos });

  tokenStatusInitial.style.display = "none";
  tokenStatusResult.style.display = "block";

  const scopesEl = form.querySelector(".result .scopes");
  scopesEl.innerText = scopes;
  scopesEl.style.borderColor =
    scopes && scopes.includes("repo") ? "green" : "red";

  form.querySelector(".result .user .name").innerText = username;
  form.querySelector(".result .org .name").innerText = orgname;

  const resultUserReposEl = form.querySelector(".result .user .repos");
  resultUserReposEl.innerText = userrepos.total_count || userrepos.message;
  resultUserReposEl.style.borderColor =
    userrepos.total_count > 0 ? "green" : "red";

  const resultOrgReposEl = form.querySelector(".result .org .repos");
  resultOrgReposEl.innerText = orgrepos.total_count || orgrepos.message;
  resultOrgReposEl.style.borderColor =
    orgrepos.total_count > 0 ? "green" : "red";

  const errorMessages = [
    orgrepos.errors ? orgrepos.errors.length && orgrepos.errors[0].message : "",
    userrepos.errors
      ? userrepos.errors.length && userrepos.errors[0].message
      : "",
    orgrepos.errors
      ? "Note: You may have to Enable SSO and/or Authorise the token for accessing repos of this org"
      : "",
  ];

  form.querySelector(".result .errors").style.display = errorMessages.join("")
    .length
    ? "block"
    : "none";
  form.querySelector(".result .errors").innerHTML = errorMessages.join("<br/>");
};

document.getElementById("version").innerText = version;

window.addEventListener("load", () => {
  chrome.runtime.sendMessage({ action: "sendConfig" }, config => {
    populateConfig(config);
    logger.setDebug(config.ENABLE_LOG);

    document
      .querySelector("button.validate")
      .addEventListener("click", showGithubValidation);
    if (config.GITHUB_TOKEN.length > 35) setTimeout(showGithubValidation, 1000);

    document.querySelector(".misc input.ENABLE_LOG").checked =
      config.ENABLE_LOG === true ||
      (typeof config.ENABLE_LOG === "string" &&
        config.ENABLE_LOG.toLowerCase() === "true");
  });

  document.querySelector("form").addEventListener("submit", function (e) {
    if (e.submitter.className === "save") {
      const config = Array.from(
        new FormData(document.querySelector("form")),
      ).reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {});
      logger.debug("Config being sent to background", JSON.stringify(config));
      chrome.runtime.sendMessage({ action: "saveConfig", config });
    }
    window.close();
  });
});
