# @eighty4/plunder / webapp

Built and distributed with `@eighty4/plunder` package (`cli` folder).

## Playwright e2e tests

Playwright is configured to run 3 Vite instances to test Plunder in different
modes. `create-test-reports.sh` will run Plunder to setup the required data
for the e2e tests to pass.

```bash
./create-test-reports.sh

# start Vite servers and run tests
pnpm test:e2e

# run tests with the Playwright UI
pnpm test:e2e --ui

# run tests with a visible browser
pnpm test:e2e --headed
```
