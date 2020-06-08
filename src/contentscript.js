console.log("content script global");

const injectPrStatus = async (config) => {
  // const columnHeaders = [
  //   ...document.querySelectorAll(".ghx-column-headers li.ghx-column"),
  // ].map((col) => {
  //   const id = col.attributes["data-id"].value;
  //   const title = col.querySelector("h2").innerText;
  //   return { id, title };
  // });
  // const issues = [...document.querySelectorAll(".ghx-issue")].map((n) => ({
  //   jiraId: n.attributes["data-issue-key"].value,
  //   issueId: n.attributes["data-issue-id"].value,
  //   extraFieldsNode: n.querySelector(".ghx-extra-fields"),
  // }));
  const boardId = window.location.search.match("rapidView=([0-9]+?)&")[1];
  const jql =
    config.JIRA_STATUSES &&
    config.JIRA_STATUSES.trim()
      .split(",")
      .map((s) => `status="${s.trim()}"`)
      .join(" OR ");
  const fetchUrl = `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}`;
  console.log({ jql, fetchUrl });

  const issues = await fetch(fetchUrl)
    .then((r) => r.json())
    .then((d) => d.issues.map(({ key, id }) => ({ key, id })))
    .catch(console.error);

  console.log({ boardId, jiraStatuses: config.JIRA_STATUSES, issues });

  issues.forEach((i) => {
    const htmlToInsert = `
    <div class="ghx-row prstatus-row">
        <span class="ghx-extra-field" >
            <span class="ghx-extra-field-content" style="font-weight: bold; color: green">Rehan ✔</span>
            <span class="ghx-extra-field-content" style="font-weight: bold; color: red">Jon ✘</span>
        </span>
    </div>
    `;
    const extraFieldsNode = document.querySelector(
      `.ghx-issue[data-issue-id='${i.id}'] .ghx-extra-fields`,
    );
    if (!extraFieldsNode) return;

    const elem = extraFieldsNode.querySelector(".prstatus-row");
    if (elem) elem.remove();
    extraFieldsNode.insertAdjacentHTML("beforeend", htmlToInsert);
  });
};

// const getPRStatus = (config) => {
//   fetch("https://api.github.com/repos/rehanahmad/Hello-World/pulls/1347", { method: "GET" /repos/:owner/:repo/pulls})
// }

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

const refresh = () => {
  chrome.runtime.sendMessage({ action: "sendConfig" }, (config) => {
    console.log("content script received config:", config);
    injectPrStatus(config);
  });
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request == "refresh") {
    console.log("content script received message: refresh", { sender });
    refresh();
  }
});
