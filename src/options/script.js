const description = {
  GITHUB_ACCOUNT: ["Github Account", "GitHub main account name (org or user)"],
  GITHUB_TOKEN: [
    "Github Token",
    "Personal Access Token with 'repo' and 'user' scope",
  ],
  GITHUB_REPOS: ["Github Repos", "Repos to search for PR Reviews"],
  URL_PATTERN_FOR_PAGE_ACTION: [
    "Page Filter",
    "Url regex to restrict the scope of this extension",
  ],
};

const configField = (config) => (key) => {
  const [legend, desc] = description[key];
  const value = config[key];
  return `
  <fieldset>
    <legend>${legend}</legend>
      <label for="${key}">${desc}</label>
      <input name="${key}" type="text" class="field-value" value="${value}">
    </div>
  </fieldset>
  `;
};

const reposList = (config) => `
  <fieldset>
    <legend>GitHub Repos</legend>
      <label for="repos"></label>
      <input name="repos" type="text" class="field-value" value="${value}">
    </div>
  </fieldset>
`;

const configForm = (config) => {
  const field = configField(config);
  return `
    ${field("GITHUB_ACCOUNT")}
    ${field("GITHUB_TOKEN")}
    ${field("GITHUB_REPOS")}
    
    <button class="cancel" type="cencel">Cancel</button>
    <button class="save" type="submit">Save</button>
  `;
};

const populateConfig = (config) => {
  console.log("page action received config from background", { config });
  document.querySelector("#config form").innerHTML = configForm(config);
};

window.addEventListener("load", () => {
  let currentConfig;
  chrome.runtime.sendMessage({ action: "sendConfig" }, (config) => {
    currentConfig = config;
    populateConfig(config);
  });

  document.querySelector("form").addEventListener("submit", function (e) {
    if (e.submitter.className === "save") {
      const config = [...e.target.querySelectorAll(".field-value")].reduce(
        (acc, f) => {
          const { value } = f;
          const key = f.attributes.name.value;
          if (value && acc[key] !== value) {
            acc[key] = value;
          }
          return acc;
        },
        currentConfig,
      );
      console.log("Form submitted", config);
      chrome.runtime.sendMessage({ action: "saveConfig", config });
    }
    window.close();
  });
});
