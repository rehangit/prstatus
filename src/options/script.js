window.addEventListener(
  "load",
  () => {
    chrome.runtime.sendMessage("sendConfig", (config) => {
      console.log("page action received config from background", { config });
      const rootElem = document.querySelector("#config form fieldset");
      Object.entries(config).forEach(([key, value]) => {
        rootElem.insertAdjacentHTML(
          "beforeend",
          `
<div class="field field-${key.toLowerCase()}">
    <label for="${key}">${key}</label>
    <input name="${key}" type="text" value="${value}">
</div>
`
        );
      });
    });
  },
  true
);
