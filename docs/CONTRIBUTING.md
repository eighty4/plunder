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
