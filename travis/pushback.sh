#!/bin/bash

git config --global user.email "gawesomebot@kingdgrizzle.ml"
git config --global user.name "GAwesomeBot"

git checkout -b $TRAVIS_BRANCH
git add -A
git commit --message ":rocket: Build: $TRAVIS_BUILD_NUMBER"

git remote add origin-target https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG} > /dev/null 2>&1
git branch -u origin-target/indev-4.0.2
git push origin-target $TRAVIS_BRANCH