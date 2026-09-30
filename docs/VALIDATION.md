# Validation

Fresh candidate execution during package assembly:

- Node built-in test runner: 25/25 passed.
- `src/core.js` was imported by the tests.
- No package installation was required.

This validates the stated deterministic test invariants only. Browser interaction, deployment propagation and real-world performance remain separate checks.
