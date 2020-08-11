# PR Status
![PR Status](src/icons/icon-active.png "PR Status")

A chrome extension to insert the Github PR Review status in the cards on a JIRA boards.

![Quick Overview](./assets/screenshot2.png)

## Build instructions

The package can be built from source by following:

```
  npm i npm run build
  npm run build
  npm run zip
```
This produces a versioned zip file in the root folder, that can be uploaded to chrome store.

For specific firefox version of the package replace the last command to `npm run zip:firefox`. The firefox package is produced in the folder `web-ext-artifacts`.


# Store Listing Description

A chrome extension to show the Github PR Review statuses in the cards on a JIRA board.

• Clean and simple design
• Shows relevant and important information 
  • PR Status (Open, Merged or Closed)
  • Name of the repo 
  • Final update status of PR reviews from each user

LIMITATION AND REQUIREMENTS

• Currently works only with Classic JIRA boards (next-gen not supported yet).
• Github official integration should already be configured in your JIRA account.


MOTIVATION

During a daily stand up session it is essential to know the latest status of the associated Github PRs and how many reviews approvals these have. However default Github integration of JIRA does not allow this information to be shown easily. With this extension you can quickly view which tickets have their pull requests been reviewed and approved. Having this information right on the ticket may make your standup session more productive.


SETUP

To configure the extension please provide your Github token in the Options page. Github personal access token can be generated from https://Github.com/settings/tokens. This token should at least have 'repo' scopes.

Once entered, press the Check button to validate the token. It should show the result of validation below the token input area. Kindly ensure the token has  access to all the repos that you expect. In particular if SSO has been enabled on your Github org account the token should be explicitly Authorized for access to the org repos via SSO.


JIRA COLUMNS

This extension automatically picks up all the JIRA issues found in the *middle columns* of any board to be populated with the PR Review statuses. 

Middle columns are all the columns other than the first and the last column. No manual configuration of columns is needed. The reason for this choice is to allows the extension to work on any board. The first and last columns are usually something like TODO and DONE columns which are unlikely to contain any interesting PRs associated with them.

In future it may allow more fine tuning / customization to restrict columns that should be updated.


FEATURES

- Shows the status of all PRs linked with the ticket (Requires Github integration to be available)
- Shows the repo name next to the PR status.
- Also shows a quick overview of all the reviews of the related PR (Commented / Approved / Change Requested). Only shows the latest status from each unique users. Always shows the Approval and Change requested from a user.
- The PR status icons (Open or Merged) are clickable to jump straight to the PR in Github. 
- The status is automatically updated regularly but can also be manually refreshed at anytime by clicking on the extension icon or by reloading the page.

LATEST UPDATES:
- v0.3.0
  • Refactored to be compatible with firefox
  • Show updated count as badge on icon
  • Refresh on tab activated
  • Optimised permissions
  • Bug fixes
- v0.2.5
  • Validation of the token and error handling
- v0.2.3
  • Allow any number of tickets to be updated. Previous limit of 20 fixed
  • Bug fixes related to refreshing on board change
