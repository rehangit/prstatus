console.log("content script global");

const injectPrStatus = (config) => {
  const columnHeaders = [
    ...document.querySelectorAll(".ghx-column-headers li.ghx-column"),
  ].map((col) => {
    const id = col.attributes["data-id"].value;
    const title = col.querySelector("h2").innerText;
    return { id, title };
  });
  const issues = [...document.querySelectorAll(".ghx-issue")].map((n) => ({
    jiraId: n.attributes["data-issue-key"].value,
    issueId: n.attributes["data-issue-id"].value,
    extraFieldsNode: n.querySelector(".ghx-extra-fields"),
  }));

  console.log(new Date().toISOString(), { columnHeaders, issues });

  issues.forEach((i) => {
    const htmlToInsert = `
    <div class="ghx-row prstatus-row">
        <span class="ghx-extra-field" >
            <span class="ghx-extra-field-content" style="font-weight: bold; color: green">Rehan ✔</span>
            <span class="ghx-extra-field-content" style="font-weight: bold; color: red">Jon ✘</span>
        </span>
    </div>
    `;
    const elem = i.extraFieldsNode.querySelector(".prstatus-row");
    if (!elem) {
      i.extraFieldsNode.insertAdjacentHTML("beforeend", htmlToInsert);
    }
  });
};

window.addEventListener(
  "load",
  () => {
    chrome.runtime.sendMessage({ action: "sendConfig" }, (config) => {
      console.log("content script received config:", { config });
      //      injectPrStatus(config);
    });
  },
  false,
);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request == "refresh") {
    chrome.runtime.sendMessage({ action: "sendConfig" }, (config) => {
      console.log("content script received config:", config);
      injectPrStatus(config);
    });
  }
});
