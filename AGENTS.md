# AGENTS.md

## Project overview
This repository is a small static web app for checking classroom and lab availability on campus. The UI is built with plain HTML, CSS, and JavaScript, and it runs entirely in the browser.

## Key files
- [index.html](index.html) — home page with the room grid and search/filter controls.
- [room.html](room.html) — room detail page with the live status card and timetable view.
- [app.js](app.js) — shared logic for both pages. This file routes based on which DOM elements are present.
- [data.json](data.json) — authoritative room/timetable dataset used by the app.
- [about_project.txt](about_project.txt) — the best high-level project notes and historical context.
- [archive/](archive/) — older Python import/export scripts used to build or inspect the data.

## Working conventions
- There is no build step, bundler, or backend. Treat this as a static site.
- To view the app locally, serve the folder over HTTP, for example:
  - `python -m http.server 8000`
- The app expects to be opened via `http://localhost:8000` rather than `file://` because it fetches [data.json](data.json) asynchronously.
- Keep changes compatible with both pages. The shared logic in [app.js](app.js) decides whether it is rendering the home page or the room detail page.
- If you change timetable parsing or availability logic, preserve the existing campus-specific behavior:
  - slot strings may use `–` or `-`
  - `Free`, `Break`, and `Recess` should be treated as available
  - bare hours like `1` through `6` are interpreted as afternoon sessions
- Prefer updating data through the existing archive pipeline when possible; do not make ad-hoc changes to [data.json](data.json) without understanding the importer scripts.

## Common tasks
- UI tweaks: update [index.html](index.html), [room.html](room.html), or [style.css](style.css) and keep the existing DOM ids intact.
- Logic changes: update [app.js](app.js) carefully, especially the room-routing, timetable rendering, and time-slot detection functions.
- Data changes: inspect [archive/](archive/) first and understand whether the change belongs in the importer scripts or the generated JSON.

## Verification
- After changing the UI or logic, verify by serving the site locally and checking the relevant page behavior in the browser.
- If a change affects data shape, confirm that both the home page and room page still render correctly.
