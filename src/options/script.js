import { verifyGithubToken } from "../github";
import makeLogger from "../logger";
const logger = makeLogger("options");

const { version } = chrome.runtime.getManifest();

document.getElementById("version").innerText = version;

const sendMessage = async msg =>
  new Promise(resolve => {
    chrome.runtime.sendMessage(msg, optionalResponse => {
      resolve(optionalResponse);
    });
  });

window.addEventListener("load", async () => {
  const config = await sendMessage({ action: "sendConfig" });
  logger.setDebug(config.ENABLE_LOG);
  logger.debug("options page received config from background", { config });

  const formEl = document.querySelector("#config form");
  const githubInputEl = formEl.querySelector("input[name=GITHUB_TOKEN]");
  const enableLogEl = formEl.querySelector(".misc input.ENABLE_LOG");
  const statusInitialEl = formEl.querySelector(".status .initial");
  const statusResultEl = formEl.querySelector(".status .result");
  const buttonCheckEl = document.querySelector("button.button.check");
  const buttonSave = document.querySelector("button.button.save");
  const scopesEl = statusResultEl.querySelector(".scopes");
  const userNameEl = statusResultEl.querySelector(".user .name");
  const orgNameEl = statusResultEl.querySelector(".org .name");
  const userReposEl = formEl.querySelector(".result .user .repos");
  const orgReposEl = formEl.querySelector(".result .org .repos");
  const errorsEl = formEl.querySelector(".result .errors");

  githubInputEl.value = config.GITHUB_TOKEN;

  enableLogEl.checked =
    config.ENABLE_LOG === true ||
    (typeof config.ENABLE_LOG === "string" &&
      config.ENABLE_LOG.toLowerCase() === "true");

  const showGithubValidation = async e => {
    if (e) e.preventDefault();
    const token = githubInputEl.value;

    logger.debug("showGithubValidation called.", { token });
    if (!token || !token.length) return;

    statusInitialEl.style.display = "block";
    statusResultEl.style.display = "none";

    const { scopes, username, orgname, orgrepos, userrepos } =
      await verifyGithubToken(token);
    logger.debug({ scopes, username, orgname, userrepos, orgrepos });

    statusInitialEl.style.display = "none";
    statusResultEl.style.display = "block";

    scopesEl.innerText = scopes;
    scopesEl.style.borderColor =
      scopes && scopes.includes("repo") ? "green" : "red";

    userNameEl.innerText = username;
    orgNameEl.innerText = orgname;

    userReposEl.innerText = userrepos.total_count || userrepos.message;
    orgReposEl.innerText = orgrepos.total_count || orgrepos.message;

    userReposEl.style.borderColor = userrepos.total_count > 0 ? "green" : "red";

    orgReposEl.style.borderColor = orgrepos.total_count > 0 ? "green" : "red";

    const errorMessages = [
      orgrepos.errors
        ? orgrepos.errors.length && orgrepos.errors[0].message
        : "",
      userrepos.errors
        ? userrepos.errors.length && userrepos.errors[0].message
        : "",
      orgrepos.errors
        ? "Note: You may have to Authorise the token (via enabling SSO) for accessing repos of this org"
        : "",
    ];

    errorsEl.style.display = errorMessages.join("").length ? "block" : "none";
    errorsEl.innerHTML = errorMessages.join("<br/>");
  };

  buttonCheckEl.addEventListener("click", showGithubValidation);
  githubInputEl.addEventListener("keyup", e => {
    statusResultEl.style.display = "none";
  });
  githubInputEl.addEventListener("focus", e => {
    console.log("removing password attribute");
    githubInputEl.setAttribute("type", "text");
  });
  githubInputEl.addEventListener("blur", e => {
    console.log("adding password attribute back");
    githubInputEl.setAttribute("type", "password");
  });

  // if (config.GITHUB_TOKEN.length > 35) setTimeout(showGithubValidation, 1000);

  formEl.addEventListener("submit", async e => {
    e.preventDefault();
    logger.debug("option form being submitted", e);
    if (e.submitter.className.includes("save")) {
      const config = Array.from(
        new FormData(document.querySelector("form")),
      ).reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {});

      const { username, orgname } = await verifyGithubToken(
        config.GITHUB_TOKEN,
      ).catch(() => ({}));
      if (username || orgname) {
        config.GITHUB_ACCOUNT = username || orgname;
      }

      logger.debug("Config being sent to background", JSON.stringify(config));
      await sendMessage({ action: "saveConfig", config });
    }
    window.close();
  });
});
