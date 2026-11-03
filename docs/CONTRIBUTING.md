# Contributing

pnpm 12 and Node 26 are required for development.

Plunder embraces Node's TypeScript support and runs tests asTypeScript without
compiling.

## Build and run CLI

```bash
pnpm i

# build all packages
pnpm -r build

# run the cli entrypoint
node cli/lib_js/plunder.js -h
```

For a tighter development loop, the CLI can be run without compiling. If
changes were made to `@eighty4/plunder-core`, they need to be compiled before
running the CLI:

```bash
# run the cli from ts
node cli/lib/plunder.ts -h

# if changes were made to core
# make sure `playwright-core` is up to date
# then run the cli from ts
pnpm -F ./core build && node cli/lib/plunder.ts -h
```

## Webapp development

Plunder out directories will have a web report written to the out directory's
root. The web report is built with React and Vite and distributed with the CLI
package `@eighty4/plunder`.

The [webapp package's README.md](/webapp/README.md) has details on running
the Vite app.

## CICD checks

The `ci_verify.sh` script runs through all the CICD checks done on GitHub
Actions:

```bash
./ci_verify.sh
```

The script has flags to symlink the `ci_verify.sh` as git hooks.

```bash
./ci_verify.sh --on-git-commit
./ci_verify.sh --on-git-push
```

The `ci_verify.sh` script will perform all checks required by a PR and uses
`pnpm` to run the project's `build`, `test` and `fmtcheck` package.json
scripts.

The script has flags to create symlinks to itself in `.git/hooks`:

```bash
./ci_verify.sh --on-git-commit
./ci_verify.sh --on-git-push
```

Formatting is provided by `prettier`.

```bash
# check if project is correctly formatted
pnpm fmtcheck

# formate project and write to disk
pnpm fmt
```

Linting is subjectively left to personal taste after `prettier` and `tsc` run.

Document changes made by your PR in `CHANGELOG.md` under the `Unreleased`
section.

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
