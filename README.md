# Automate Job Application

> Application submission is intentionally manual. The former login/password and final-submit automation is disabled; use this CLI to discover jobs, prepare materials, and track applications you submit yourself.

A local-first job discovery and application preparation CLI. The agent finds publicly accessible LinkedIn job listings, scores them against your CVs, drafts cover letters, and tracks opportunities in SQLite. **It never submits applications.** You review and submit every application yourself, then confirm the event in the CLI. LinkedIn CAPTCHA, MFA, login challenges, and access restrictions are not bypassed.

## Requirements

- Node.js 20+
- Google Cloud service account credentials (optional Sheets sync)
- Notion internal integration (optional reports)
- OpenAI API key (optional; keyword scoring works without it)

## Setup

```sh
npm install
cp .env.example .env
# Edit .env with credentials for integrations you have configured
npm run start -- cv:add ~/Documents/cv.pdf --name "Backend Engineer"
npm run start -- preferences:set --file preferences.json
npm run start -- search
```

`preferences.json` example:

```json
{
  "roles": ["Backend Engineer", "Platform Engineer"],
  "skills": ["TypeScript", "Node.js", "PostgreSQL", "AWS"],
  "locations": ["Warsaw, Poland"],
  "experienceYears": 5,
  "remote": true,
  "minSalary": 120000
}
```

## Commands

```text
cv:add <file> [--name <name>]       Parse and save PDF, DOCX, TXT, or MD CV
cv:list                             List stored CVs
preferences:set --file <file>       Save role, skills, location and work preferences
preferences:show                    Show preferences
search [--limit <n>] [--sync-sheet] Discover public LinkedIn listings and score them
jobs:list [--status <status>]       Review tracked jobs
job:prepare <id>                    Generate a truthful cover letter for review
application:approve <id> --confirm  Record a submission you made yourself
job:update <id> --status <status>   Record an interview, rejection, offer or withdrawal
daily [--limit <n>]                 Run discovery, scoring and configured integrations
```

The first run creates `data/jobs.sqlite`. CV text is stored locally in SQLite to enable matching. Keep `data/` private and back it up securely. `.env` and database files are ignored by Git.

## Integrations

- **LinkedIn:** Playwright loads public job search and detail pages. Search is best effort and may stop if LinkedIn requires authentication or restricts access. The tool exits on common block/challenge signals and does not attempt to evade them.
- **OpenAI:** Optional. Matching requests send CV text and job descriptions to the configured OpenAI API. Without a key, local keyword overlap provides a rough baseline. Verify all generated scores and letters.
- **Google Sheets:** Set `GOOGLE_SHEET_ID` and `GOOGLE_APPLICATION_CREDENTIALS`; share the target spreadsheet with the service account email. The first sync adds tracking headers and appends new jobs, deduplicating by URL.
- **Notion:** Set `NOTION_API_KEY` and `NOTION_PAGE_ID`; share the project page with the integration. Daily runs append a report.

The provided Google Sheet ID and Notion page ID are prefilled in `.env.example`. The credentials and page sharing still need to be configured; the current development environment has no connected Sheets or Notion account for access verification.

## Safety and scope

- No automatic application submission or unattended form completion.
- No password, session, MFA, CAPTCHA, or challenge bypass.
- Application statuses are updated only through an explicit CLI action.
- This is an MVP: LinkedIn page markup and anonymous access are not guaranteed. Use only in ways permitted by LinkedIn's current terms and your account access.
- CV parsing is local. The OpenAI matching/letter feature sends relevant CV and job text to OpenAI when enabled.
