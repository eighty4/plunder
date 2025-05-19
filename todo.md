midjourney logo

- treasure chest open with a polaroid
- pirate ship with a cannon
- red headed pirate woman with pigtails, freckles and pirate hat

cicd

- drop prerelease publish on push

cli

- launch active mode
- write result to fs

core

- merge identical media queries in manifest
- parse css completed with number of media queries found
- cleanup device ls data
- ws open-page event sequence
- css breakpoint parse line numbers and excerpt
- css breakpoint parse represents nested media query hierarchy
- capture reporting
    - unsupported media queries
    - css parsing errors
    - dom parsing errors
- metric reporting for browser process
    - task label, start time, end time
    - cpu, memory
        - browserType.launchServer -> browserServer.pid -> ps
        - https://playwright.dev/docs/api/class-browserserver#browser-server-process

webapp

- ws open-page event sequence
- PlunderCaptureApi and UserEvents unit tests
- view
- header
    - url menu keyboard nav
    - color theme (light, dark, default)
    - device menu
    - side by side diff direction (horizontal, vertical)
