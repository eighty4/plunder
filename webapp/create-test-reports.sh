#!/bin/bash
set -e

rm -rf .playwright/plunder

pushd ..
    pnpm --filter \!@eighty4/plunder-webapp build 
popd

node ../cli/lib/plunder.js \
    --css-breakpoints \
    -o .playwright/plunder/single-page \
    https://alistapart.com

node ../cli/lib/plunder.js \
    -d "iphone 15 pro max" \
    -o .playwright/plunder/multiple-pages \
    https://alistapart.com \
    https://github.com/eighty4

