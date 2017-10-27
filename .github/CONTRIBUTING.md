# Contributing

**This repository's issues section is only for bug tracking, code contribution, questions about the inner workings of GAB/design decisions or other code-related purposes. For help on how to use GAB, please visit [our Discord Server](https://discord.gg/UPJ2xt6) instead.**

GAwesomeBot is open source, as such, anyone can clone, fork, and host their own instance of GAB. Before you do so, please make sure you're up-to-date on [our license](https://github.com/GilbertGobbels/GAwesomeBot/blob/development/LICENSE) and its terms. If you want to contribute to GAB's development, you can help us track down bugs and reporting them [here](https://github.com/GilbertGobbels/GAwesomeBot/issues). If you want to contribute to the codebase, make sure you follow [our ESLint rules](https://github.com/GilbertGobbels/GAwesomeBot/blob/development/.eslintrc.json), your Pull Request must not contain any ESLint errors, or it will not be merged.

*Pro Tip: Using an editor that has ESLint syntax checking is super useful when working on GAB!*

## Setup
To get ready to edit GAwesomeBot's code, do the following:

1. Fork & clone the repository, and make sure you're on the **development** branch
2. Run `npm install`
3. Start coding, making sure to document changes using JSDoc accordingly.
4. Run the bot, and test that your changes work.
5. [Submit a pull request](https://github.com/GilbertGobbels/GAwesomeBot/compare)

Once your PR or Issue has been submitted, GAB Maintainers will check it out, and if it follows basic guidelines, it's status will be set to *Ideas / Under Review*. In this state, your PR/Issue has been noticed, and we're working hard to make sure your code works, respects ESLint syntax, and that your idea is something we want in GAB. If all this is true, your idea is moved to *Planned / Confirmed*. At this point, your PR/Issue has multiple paths to go through:

1. If you submitted a PR, your PR will be on hold until enough maintainers approved it, and want it in the next version. At this point, your PR is merged into the development branch and will be part of a future update.
2. If you submitted an idea, suggestion or minor bug report, it's waiting time until either a maintainer or another community member submits a PR including the changes you proposed. When enough maintainers approve it, the PR is merged into the development branch.
3. If you submitted a major bug report, and enough maintainers agree it's urgent, your issue is moved to the section *High Priority / Next Patch*. Here, a maintainer will often create a new hotfix branch, where they fix your issue. After this, the hotfix branch is merged into the development branch, and the experimental/stable branch, which creates a new patch which is then pushed to all GAB instances. After this, your issue is removed.

You can check your submission's status [here](https://github.com/GilbertGobbels/GAwesomeBot/projects/1). Good luck GAwesomeUsers!
