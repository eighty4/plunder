#!/bin/sh
set -e

# run through all the checks done for ci

pnpm -r build
pnpm -r test
pnpm exec prettier --check .
