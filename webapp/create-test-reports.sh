#!/bin/bash
set -e

_root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"

echo "WTF $_root_dir WTF"
rm -rf "$_root_dir/webapp/.playwright/plunder"

pushd "$_root_dir" > /dev/null
    pnpm --filter \!@eighty4/plunder-webapp build
popd

node "$_root_dir/cli/lib_js/plunder.js" \
    -b chromium \
    --no-booty-port \
    --no-confirm-install \
    --css-breakpoints \
    -o "$_root_dir/webapp/.playwright/plunder/single-page" \
    https://alistapart.com

node "$_root_dir/cli/lib_js/plunder.js" \
    -b chromium \
    --no-booty-port \
    --no-confirm-install \
    -d "iphone 15 pro max" \
    -o "$_root_dir/webapp/.playwright/plunder/multiple-pages" \
    https://alistapart.com \
    https://github.com/eighty4
