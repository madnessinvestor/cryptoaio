#!/bin/bash
# Ensure identity before every push
git config user.name  "madnessinvestor"
git config user.email "madness.investor@gmail.com"
git add .
git commit -m "${1:-update}"
git push
