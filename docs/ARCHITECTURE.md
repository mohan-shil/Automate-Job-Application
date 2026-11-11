# Architecture and implementation report

## Initial architecture

The MVP is a local-first Node.js 20+ TypeScript CLI. It separates user commands (`src/cli.ts`), SQLite persistence (`src/db`), CV parsing and matching (`src/services`), and external adapters (`src/integrations`). SQLite is the source of truth for CV metadata, preferences, discovered jobs, application status, and activity events. Google Sheets and Notion are optional reporting sinks.

## Components and decisions

- **CV management:** `pdf-parse`, Mammoth, and plain text readers extract CV content. CV text remains in local SQLite. Extraction errors are surfaced instead of fabricating content.
- **Matching and drafting:** OpenAI structured JSON is used when configured. Deterministic local keyword overlap provides an offline fallback. Prompt instructions prohibit inventing qualifications.
- **Discovery:** Playwright reads public LinkedIn job search and detail pages. Auth walls, CAPTCHA, security challenge, 401/403/429 lead to a stop. No authenticated session or submission code is present.
- **Application workflow:** Every application submission remains manual. `application:approve --confirm` only records the user's attestation after they submitted externally.
- **Persistence:** SQLite with WAL, URL uniqueness for duplicate prevention, activity log, and explicit status values.
- **Google Sheets:** Google Sheets API appends new records with headers and URL-based duplicate detection.
- **Notion:** Notion API appends daily report blocks to the configured page.
- **Configuration:** dotenv environment variables, `.env.example`, ignored secrets/database paths.

## Integrations and access verification

- GitHub `mohan-shil/Automate-Job-Application`: verified through connected GitHub app; public repository, push permission available. Local checkout had no commits, tracked files, or remote configured.
- Google Sheet `1nuTdTMZV_S-zWidVnccYvK5FhEDgScsJxUefP7M9WzY`: no Sheets connector or Google credentials exposed in this session; access and sharing could not be verified.
- Notion page `4155867dcfd280c98c62e51d8c904d6e`: no Notion connector/token exposed in this session; access and page sharing could not be verified.

## MVP implementation status

Implemented: CLI, local SQLite schema, CV import for PDF/DOCX/TXT/MD, preference storage, LinkedIn public listing discovery, keyword/OpenAI matching, cover letter generation, Google Sheets and Notion adapters, daily run command, status management, duplicate prevention, environment template, README, and activity log.

Not implemented: automatic form filling/submission, monitoring authenticated application inboxes, interview calendar integrations, browser UI, robust vendor-independent ATS ingestion, extensive retries/telemetry, and live end-to-end integration verification. Applications remain manual and explicit approval is required for every one.

## Testing and release log

Initial report recorded before dependency installation and tests. Test outcomes, commits, and later errors/resolutions are appended to `docs/IMPLEMENTATION-LOG.md` during the development session.
