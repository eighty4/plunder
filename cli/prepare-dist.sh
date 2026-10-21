#!/bin/bash
set -e

_root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"

rm -rf "$_root_dir/cli/webapp"
cp -r "$_root_dir/webapp/dist" "$_root_dir/cli/webapp"
cp "$_root_dir/README.md" "$_root_dir/cli/README.md"

printf "\e[32m\u2714\e[0m copied webapp/dist to cli/webapp\n"
