# Architecture and implementation report

## System design

The application is a local-first Node.js 20+ TypeScript CLI. CLI commands coordinate typed services, local SQLite persistence, permitted public job source adapters, and optional integration sinks. SQLite is the source of truth for CVs, preferences, discovered jobs, application state, and activity events.

## Components

- **CLI (`src/cli.ts`):** CV import/list, preferences, configured job discovery, user-provided LinkedIn job import, job review, cover letter generation, manual status updates, and a daily run.
- **CV parsing (`src/services/cv.ts`):** PDF, DOCX, TXT, and Markdown text extraction. CV content is retained locally in SQLite. The tested sample path used TXT.
- **Matching (`src/services/matching.ts`):** OpenAI structured output when configured; deterministic local keyword overlap otherwise. The prompt restricts claims to supplied facts.
- **Permitted job sources (`src/integrations/jobs.ts`):** Greenhouse public Job Board API and Lever public Postings API. Integration tests use mocked responses; live source access depends on the employer board identifiers and network availability.
- **LinkedIn handling:** no LinkedIn browser automation, scraping, authentication, or page fetching. `job:add` validates a user-provided LinkedIn job URL and saves the title, company, location, and description supplied by the user.
- **SQLite (`src/db/database.ts`):** WAL mode, normalized CV/preferences/job/activity tables, unique job URL constraint, and explicit application statuses. The persistence integration test closes and reopens a file-backed database.
- **Google Sheets (`src/integrations/google-sheets.ts`):** Google Sheets API appends tracking data and deduplicates by URL. Live access/writes require the supplied sheet to be shared with the configured service account; not tested in this environment.
- **Notion (`src/integrations/notion.ts`):** appends daily report blocks to the configured page. Live access/writes require a Notion token and page sharing; not tested in this environment.
- **Configuration:** environment variables and `.env.example`. `.env`, SQLite data, and generated files are ignored by Git.

## Safety decisions

No code submits applications or operates LinkedIn pages. The legacy submission entry point now exits with a message. Applications are submitted manually by the user; `application:approve --confirm` only records an application that the user says they already submitted. There is no CAPTCHA, MFA, login challenge, or access-control bypass logic.

## External resources and access

- GitHub repository `mohan-shil/Automate-Job-Application`: connected GitHub access confirmed and changes published to `main` while preserving repository history and `CV_materials`.
- Google Sheet ID `1nuTdTMZV_S-zWidVnccYvK5FhEDgScsJxUefP7M9WzY`: ID is configured; no Google connector credentials were present, so access could not be verified.
- Notion page ID `4155867dcfd280c98c62e51d8c904d6e`: ID is configured; no Notion connector credentials were present, so access could not be verified and the requested live report could not be written.

## Verified implementation results

- `npm ci --no-audit --no-fund`: passed.
- `npm run build`: passed.
- `npm test`: 5 test files, 11 tests passed.
- `node dist/cli.js --help`: passed; all intended CLI commands are registered. This includes SQLite insert/dedup/status behavior, file-backed persistence after reopen, sample CV parsing and matching, mocked Greenhouse/Lever responses, LinkedIn URL validation without a fetch, and missing-credentials errors for Sheets/Notion.
- Live LinkedIn discovery: intentionally not implemented.
- Live Google Sheets and Notion synchronization: not verified; credentials were unavailable.

## Remaining work

Configure Google service-account credentials and share the spreadsheet, configure/share the Notion integration page, then execute and verify live sync. Add broader document-format fixtures and live public board checks where permitted. GitHub Actions run `43042612483` on commit `3a91b2f5a64087647a6e7bae684d387704b1b6d5` passed clean install, build, and tests on Node 20.
