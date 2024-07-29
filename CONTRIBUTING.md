# How to Contribute

This document outlines this repositories requirements for contributing.

## Getting Started

- Fork the repository on GitHub
- Read the [README](README.md) for build and test instructions
- Follow the [style guidelines](#style-guidelines)
- Play with the project, submit bugs, submit patches!

## Contribution Flow

This is a rough outline of what a contributor's workflow looks like:

- Create a topic branch from where you want to base your work (usually master).
- Make commits of logical units.
- Push your changes to a topic branch in your fork of the repository.
- Make sure the tests pass, and add any new tests as appropriate. (testing coming soon, ignore for now)
- Submit a pull request to the original repository.


### Format of the Commit Message

To retain a clean git history, after review has completed you may be asked to squash your
changes down to a single one. Before approval spread your commits as you believe will be helpful
for the review.

The subject of your commit message should state what has changed. Often bodies of commits 
are not read, and so rather than hide information in git, it would be best to put the
descriptions of why into jira tickets, github issues, or comments in the code where it
can be found easier later.

```
Fix CSRF Issues
```

Commits that fix a Jira ticket should include that jira identifier. 
This repository doesn't contain automation to close or move Jira tickets, so upon merging
you will need to update the ticket as closed.

```
OU-454: Fix CSRF Issues
```

### Backporting Fixes

Branches for previous releases follow the format `release-X.Y`, for example,
`release-0.1`. Typically, bugs are fixed in the master branch first then
backported to the appropriate release branches. Fixes backported to previous
releases should have a Jira ticket for each version fixed.

You can use the `/cherrypick` command to ask the bot to backport a fix.

```
/cherrypick release-0.1
```

will create a new pull request against the release-0.1 branch when the current
pull request merges as long as there are no merge conflicts.

## Style Guidelines

Changes to the troubleshooting panel should adhere to Patternfly 5 best practices. When
available, Patternfly native UI components should be used. Final Patternfly compliance and UI
review will be completed by @fkargbo.

### CSS Styling

CSS stylings should go in a separate file in the same folder, ie. `Korrel8rPanel.tsx`
correlates to `korrel8rpanel.css`. CSS class names should be prepended with the plugin
name (tp-plugin), and then a logical identifier, ie. `tp-plugin__panel-query-input`.
CSS definitions should use patternfly css variables when appropriate.

```css
  border: solid var(--pf-v5-global--BorderColor--100) var(--pf-v5-global--BorderWidth--sm);
```

### Code Formatting

Submitted code should follow our defined prettier and eslint guidelines. Changes to these
guidelines should include both the updates to the formatting files (`.eslintrc.yml` and 
`.prettierrc.yml`) as well as the newly formatted codebase in a single PR. Running `make
lint-frontend` should bring up any issues.
