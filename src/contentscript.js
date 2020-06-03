console.log("content script global");

const injectPrStatus = (config) => {
  const columnHeaders = [
    ...document.querySelectorAll(".ghx-column-headers h2")
  ].map((n) => n.innerText);
  const issues = [...document.querySelectorAll(".ghx-issue")].map((n) => ({
    jiraId: n.attributes["data-issue-key"].value,
    extraFieldsNode: n.querySelector(".ghx-extra-fields")
  }));

  console.log({ columnHeaders, issues });

  issues.forEach((i) => {
    const htmlToInsert = `
    <div class="ghx-row">
        <span class="ghx-extra-field" >
            <span class="ghx-extra-field-content" style="font-weight: bold; color: green">Rehan ✔</span>
            <span class="ghx-extra-field-content" style="font-weight: bold; color: red">Jon ✘</span>
        </span>
    </div>
    `;
    i.extraFieldsNode.insertAdjacentHTML("beforeend", htmlToInsert);
  });
};

window.addEventListener(
  "load",
  () => {
    chrome.runtime.sendMessage("sendConfig", (config) => {
      console.log("content script received config:", { config });
      injectPrStatus(config);
    });
  },
  false
);
