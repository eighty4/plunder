midjourney logo

- treasure chest open with a polaroid
- pirate ship with a cannon
- red headed pirate woman with humonguous boobies, flintlock pistol, pigtails, freckles and pirate hat

cicd

- update changelog management to use @eighty4/changelog

cli

- launch active mode
- write result to fs

core

- captureHookDebugVideos opt to record videos to out dir and manifest
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

- embed toolbar play button for captureHookDebugVideo
    - play in tinted background modal
- create a web worker that diffs images to highlight/focus diffs in ui
- ws open-page event sequence
- PlunderCaptureApi and UserEvents unit tests
- view
- header
    - url menu keyboard nav
    - color theme (light, dark, default)
    - device menu
    - side by side diff direction (horizontal, vertical)
