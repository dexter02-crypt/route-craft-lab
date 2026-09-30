# Validation — version 1.0.0

16 core tests passed on Linux with Node.js v22.16.0, zero failures/skips. The actual source includes known-result fixtures and invalid-input cases; see test-output.txt and tests/core.test.mjs.

The collection's browser harness performed 33 interaction checks across four applications, including this application. Screenshots render this source with the included example data, not a deployed website.

The browser UI ran in an in-memory Chromium harness; it was not a real HTTP navigation or a macOS/Safari check.

The production local server was separately started and fetched using Python's HTTP client, with exact asset-body matching. Local browser navigation in the build environment returned ERR_BLOCKED_BY_ADMINISTRATOR; no browser policy was disabled to access it. The in-memory harness substitutes inline CSS and data-URL module references; it therefore does not validate production URL loading or full CSP enforcement.

Not verified: the user's physical Mac browser, GitHub Pages deployment, real publication, or remote GitHub Actions. These are first-release mini-projects, not exhaustive security audits or broad performance benchmarks.
