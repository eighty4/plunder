Unit tests use `node:test` and thus requires a minimum Node.js verson of 20 or a more recent release!

The `ci_verify.sh` script will perform all checks required by a PR and uses `pnpm` to run the project's `build`, `test` and `fmtcheck` package.json scripts.

The script has flags to create symlinks to itself in `.git/hooks`:

```bash
./ci_verify.sh --on-git-commit
./ci_verify.sh --on-git-push
```

Formatting is provided by `prettier`.

```bash
# install prettier
npm i -g prettier

# check if project is correctly formatted
pnpm fmtcheck

# formate project and write to disk
pnpm fmt
```

Linting is subjectively left to personal taste after `prettier` and `tsc` run.

Document changes made by your PR in `CHANGELOG.md` under the `Unreleased` section.

## Running the webapp from a CLI-launched WebSocket API

Throughout the code, this is called "active" mode.

```bash
export PLUNDER_DEV_UI=1

# make sure `playwright-core` is up to date
pnpm -F ./core build

# build the webapp and copy to the `playwright` CLI package
pnpm -F ./webapp build && ./cli/prepare-dist.sh

node cli/lib/plunder.ts --ui
```
