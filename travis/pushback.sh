#!/bin/bash

git config --global user.email "gawesomebot@kingdgrizzle.ml"
git config --global user.name "GAwesomeBot"

git checkout indev-4.0.2
git add -A
git commit -m ":rocket: :package: Minify source files" -m "Build: $TRAVIS_COMMIT ($TRAVIS_BUILD_NUMBER)"

git push https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG} $TRAVIS_BRANCH