# Implementation log

## 2026-11-11 — MVP validation and source-policy update

- **Implemented:** Fixed SQLite optional-field binding; removed Playwright and the LinkedIn browser discovery module; added user-provided LinkedIn job import; added public Greenhouse and Lever API adapters; updated CLI search/daily behavior; added configuration checks, tests, and GitHub Actions CI.
- **Dependency resolution:** Initial install exposed an OpenAI/Zod peer conflict; removed unused Zod. Initial install also selected a Notion SDK release requiring Node 22; pinned the Node 20-compatible `@notionhq/client` 4.0.2 range. Added `@types/pdf-parse`. Regenerated `package-lock.json`.
- **Files created/updated:** `package.json`, `package-lock.json`, `src/cli.ts`, `src/db/database.ts`, `src/integrations/jobs.ts`, removed `src/integrations/linkedin.ts`, `.github/workflows/ci.yml`, `README.md`, `docs/ARCHITECTURE.md`, this log, `test/jobs.integration.test.ts`, `test/persistence.integration.test.ts`, and `test/integrations.test.ts`.
- **Verification:** `npm ci --no-audit --no-fund` passed; `npm run build` passed; `npm test` passed: 5 test files, 11 tests; `node dist/cli.js --help` passed. File-backed SQLite persistence was verified after closing and reopening the database. A sample TXT CV was parsed and matched to a sample user-provided LinkedIn job; the expected CV was selected with a non-zero score. Public board adapters were tested with mocked responses.
- **Integration limits:** Google Sheets and Notion environment variables are absent. Their missing-credential guards are tested; live sync/report creation has not been tested. The GitHub Actions workflow has been authored but has not yet run in GitHub.
- **LinkedIn:** no page scraping or browser automation remains. User-provided LinkedIn URLs are saved without fetching the URL. Public Greenhouse/Lever adapters are the supported automated discovery sources.
- **Preservation:** Existing `CV_materials` directory was not modified.
- **Next:** Publish the verified source and docs changes to GitHub, then configure Google and Notion credentials for live integration verification.
