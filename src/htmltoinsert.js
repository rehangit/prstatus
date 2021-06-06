const svgIcon = {
  DISMISSED:
    '<svg style="background:#aeb6c1; padding: 2px; border-radius: 20px;" fill="white" width="12" height="12" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path></svg>',
  APPROVED:
    '<svg style="background:#28a745; padding: 2px; border-radius: 20px;" fill="white" width="12" height="12" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>',
  COMMENTED:
    '<svg width="16" height="16" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M2.75 2.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75zM1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"></path></svg>',
  CHANGES_REQUESTED:
    '<svg style="vertical-align:top" fill="#cb2431" width="14" height="14" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M2.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25V4.664a.25.25 0 00-.073-.177l-2.914-2.914a.25.25 0 00-.177-.073H2.75zM1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16H2.75A1.75 1.75 0 011 14.25V1.75zm7 1.5a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0V7h-1.5a.75.75 0 010-1.5h1.5V4A.75.75 0 018 3.25zm-3 8a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z"></path></svg>',
  PENDING:
    '<svg width="16" height="16" version="1.1" viewBox="0 0 100 100" style="fill: rgb(255, 128, 0);">  <path d="M 50 0 C 22.388 0 0 22.388 0 50 C 0 77.612 22.388 100 50 100 C 77.611 100 99.999 77.612 99.999 50 C 100.124 22.388 77.611 0 50 0 Z M 25.497 56.841 C 21.766 56.841 18.656 53.731 18.656 50 C 18.656 46.269 21.766 43.159 25.497 43.159 C 29.229 43.159 32.338 46.269 32.338 50 C 32.338 53.856 29.353 56.841 25.497 56.841 Z M 50 56.841 C 46.269 56.841 43.158 53.731 43.158 50 C 43.158 46.269 46.269 43.159 50 43.159 C 53.731 43.159 56.84 46.269 56.84 50 C 56.84 53.856 53.731 56.841 50 56.841 Z M 74.502 56.841 C 70.771 56.841 67.661 53.731 67.661 50 C 67.661 46.269 70.771 43.159 74.502 43.159 C 78.233 43.159 81.342 46.269 81.342 50 C 81.342 53.856 78.233 56.841 74.502 56.841 Z"/></svg>',
  open: '<svg width="14" height="14" style="vertical-align: text-top" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path></svg>',
  merged:
    '<svg width="14" height="14" style="vertical-align: text-top" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"></path></svg>',
  closed:
    '<svg width="14" height="14" style="vertical-align: text-top"  viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path></svg>',
  branch:
    '<svg width="14" height="14" style="vertical-align: text-top" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path></svg>',
};

const attribs = {
  open: { text: "Open", color: "#28a745", svg: svgIcon.open, width: 50 },
  merged: { text: "Merged", color: "#6f42c1", svg: svgIcon.merged, width: 65 },
  closed: { text: "Closed", color: "#d73a49", svg: svgIcon.closed, width: 65 },
  draft: { text: "Draft", color: "#6a737d", svg: svgIcon.open, width: 50 },
  branch: {
    text: "Branch",
    color: "lightgrey",
    fill: "gray",
    svg: svgIcon.branch,
    width: 20,
  },
  undefined: { text: "Undefined", color: "gray", svg: "" },
};

export const htmlToInsert = (pr, repo, draftPrs) => {
  const {
    url,
    name,
    status = "branch",
    reviews = [],
    createPullRequestUrl,
  } = pr;
  const text =
    status === "DECLINED"
      ? "closed"
      : !!draftPrs.find(d => d.title === name)
      ? "draft"
      : status.toLowerCase();

  const { svg, color, width = 0, fill = "white" } = attribs[text];

  const length = reviews.length * 16;
  const right = createPullRequestUrl
    ? `
              <a 
                href="${createPullRequestUrl}"
                target="_blank"
                onclick="arguments[0].stopPropagation()"
                title="Create a PR on the associated branch"
                class="create"
                style="text-decoration: none; font-size: xx-small"
              >Create PR</a>
            `
    : `
      <span style="position:absolute; right:0">
        ${reviews
          .map(r => {
            const icon = svgIcon[r.state] || r.state;
            return `
              <span title="${r.user.login}" style="cursor: auto; margin: 0 0 0 -2px;" >
                ${icon}
              </span>
            `;
          })
          .join("")}
      </span>
    `;
  const maxWidth = `calc(100% - ${length + width}px)`;
  return `
    <div class="ghx-row prstatus-row" style="max-height:1.85em">
      <a
        href="${url}"
        target="_blank"
        onclick="arguments[0].stopPropagation()"
        title="${name}"
        style="color:${fill}; background:${color}; fill:${fill}; text-decoration:none;"
      >
        <span>${svg}</span>
        ${
          text && text.length
            ? `<span style="margin-left:-1px;text-transform: capitalize;">${text}</span>`
            : ""
        }
      </a>
      <span class="repo" style="max-width:${maxWidth};">${repo}</span>
      ${right}
    </div>
  `;
};

const renderIssueClassic = (issue, rows) => {
  const issueNode = issue.node;
  if (!issueNode) return null;
  let extraFieldsNode = issueNode.querySelector(".ghx-extra-fields");
  if (!extraFieldsNode) {
    logger.debug("No extra fields node to inject. Adding section.", issue.key);
    const lastSection = issueNode.querySelectorAll("section:last-of-type")[0];
    lastSection.insertAdjacentHTML(
      "beforebegin",
      "<section class='ghx-extra-fields'></section>",
    );
    extraFieldsNode = issueNode.querySelector(".ghx-extra-fields");
  }

  const elems = extraFieldsNode.querySelectorAll(".prstatus-row");
  if (elems && elems.length) [...elems].forEach(elem => elem.remove());

  rows.length && extraFieldsNode.insertAdjacentHTML("beforeend", rows.join(""));
  return rows.length > 0;
};

const renderIssueNextGen = (issue, rows) => {
  const issueNode = issue.node;
  if (!issueNode) return null;

  const rootElem = issueNode.querySelector(
    "[data-test-id='platform-card.ui.card.focus-container'] > div",
  );

  const elems = rootElem.querySelectorAll(".prstatus-row");
  if (elems && elems.length) [...elems].forEach(elem => elem.remove());

  if (!rows.length) return;

  const insertElem = rootElem.querySelector("div:nth-last-child(2)");
  //  console.log("renderIssueNextGen", insertElem);
  insertElem.insertAdjacentHTML("afterend", rows.join(""));
  return rows.length > 0;
};
export const renderIssue = (issue, rows, isNextGen) => {
  return isNextGen
    ? renderIssueNextGen(issue, rows)
    : renderIssueClassic(issue, rows);
};
