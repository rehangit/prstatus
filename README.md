# PR Status
![PR Status](src/icons/icon-active.png "PR Status")

A chrome extension to insert the GitHub PR Review status in the cards on a Jira boards.

* Clean and simple design
* Only shows relevant and important information 
  * PR Status (Open or Merged)
  * Repo name
  * PR Reviews statuses from each user
* Works with new JIRA boards (next-gen).

## Motivation

It may help during a stand up session to quickly identify which tickets have their pull requests been reviewed and approved. 

![Quick Overview](./assets/screenshot2.png)

## Setup

To configure the extension please provide your Github settings in the Options page:

**Github Account Name:** User name or org name e.g. rehangit or getndazn
**Gihub Token:** Generate a github personal access token from https://github.com/settings/tokens. This token should have repo and user scopes.
**JIRA Column Headers:** List the column names separated by comma. Only Jira tickets from these columns are decorated with pr review status. Enter * for all columns. 


## Features

- Shows the status of all PRs linked with the ticket by searching for the Jira ticket id in the PR title or branch name on the specified Github account
- Next to the status it shows the corresponding repo name
- Also shows quick overview of all the approval status of each PR (Commented / Approved / Change Requested). Only shows the latest status from each unique users. Always shows the Approval and Change requested from a user.
- The PR status icons (Open or Merged) are clickable to jump straight to the PR in Github. This avoids clicking several depth levels in Jira to open the review.
- The status is automatically updated on the ticket by listening to events but can be manually refreshed at anytime by clicking on the extension icon or by reloading the page.
