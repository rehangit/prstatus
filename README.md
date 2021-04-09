# PR Status

![PR Status](src/icons/icon-active.png "PR Status")

A chrome extension to show the Github PR Review statuses in the cards on JIRA board.

![Quick Overview](./assets/screenshot2.png)

## Features Highlight

- For every PR associated with the JIRA ticket it adds a line of info:
  - PR Status (Branch|Draft|Open|Merged|Closed)
  - Name of the repo
  - Latest update of the reviews from each reviewer
- The PR Status icons (Open or Merged) can be clicked to open the PR in Github.
- Status is automatically updated but can be manually refreshed by clicking on the extension icon (or by reloading the page).

## Getting Started

### Installation

For regular use please install the extension from official published location:

- [Google Chrome Store](https://chrome.google.com/webstore/detail/pr-status/flfdeojdcmafkipiacfmdgnijodanedb) or
- [Firefox Addons Store](https://addons.mozilla.org/en-US/firefox/addon/pr-status/)

### Setup

To configure the extension please provide your Github token in the Options page. Github personal access token can be generated from https://github.com/settings/tokens. This token should have at least have 'repo' scopes.

Once entered, press the Check button to validate the token. It should show the result of validation below the token input area. Kindly ensure the token has access to all the repos that you expect. In particular if SSO has been enabled on your Github org account the token should be explicitly Authorized for access to the org repos via SSO.

## Limitation And Requirements

- Currently works only with Classic JIRA boards (next-gen not supported yet).
- Github official integration should already be configured in your JIRA account.

## Build instructions

The package can be built from source by following:

```
npm install
npm run build
npm run zip
```

This produces a versioned zip file in the `.artefacts` folder, that can be uploaded to chrome store.

For firefox version of the package replace the last command to `npm run zip:firefox`. The firefox package is produced in the `.artefacts` folder that can be uploaded to firefox store as a new version.

## Releases

Github release is automatically triggered using Github Actions when a version tag is pushed.

## A note on Jira Columns

This extension automatically picks up all the JIRA issues found in the _middle columns_ of any board to be populated with the PR Review statuses.

Middle columns are all the columns other than the first and the last column. No manual configuration of columns is needed. The reason for this choice is to allow the extension to work on any board. The first and last columns are usually something like TODO and DONE columns which are unlikely to contain any interesting PRs associated with them.
