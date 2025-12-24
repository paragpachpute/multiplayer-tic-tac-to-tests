# How to Run E2E Tests

This document provides the commands needed to run the Playwright end-to-end tests for the Tic-Tac-Toe application.

---

### 1. Run All Tests (Headless)

This is the standard way to run all test files in the `tests/` directory. It will run in "headless" mode, meaning no browser window will be opened.

```bash
npx playwright test
```

---

### 2. Run a Single Test File

To run a specific test, provide the path to the file.

```bash
# Example: Run only the refresh test
npx playwright test tests/game_refresh.spec.js
```

---

### 3. Run Tests in Headed Mode

To watch the tests execute in a live browser window, use the `--headed` flag. This is useful for debugging.

```bash
npx playwright test --headed
```

---

### 4. Generate a Trace

Playwright can record a detailed trace of a test run, which includes a timeline, screenshots, and network logs. The test files have been configured to generate trace files (e.g., `trace1.zip`, `trace-refresh1.zip`).

To generate a trace, simply run the test. The trace files will be created automatically in the project root.

```bash
# This will run the test and create the trace files
npx playwright test tests/game_refresh.spec.js
```

---

### 5. View a Trace

After a test run, you can view the generated trace file using the Playwright trace viewer.

```bash
# Example: View the trace for the refresh test
npx playwright show-trace trace-refresh1.zip
```

This will open a web application in your browser where you can inspect every step of the test.
