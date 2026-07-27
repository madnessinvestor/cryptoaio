#!/bin/bash
git config --global user.name "madnessinvestor"
git config --global user.email "madness.investor@gmail.com"
git add .
git commit -m "${1:-update}"
git push
