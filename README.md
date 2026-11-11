# Automate Job Application

A local-first job discovery and application preparation CLI. **It does not submit applications or automate LinkedIn pages.** LinkedIn listings can be added from a URL and details you provide; job discovery is available through public Greenhouse and Lever job board APIs.

## Requirements

- Node.js 20+
- OpenAI API key (optional; local keyword scoring works without it)
- Google Cloud service account and Notion integration (optional)

## Install and configure

```sh
npm ci
cp .env.example .env
# Configure only integrations you intend to use
```

Create a preferences file:

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

Import your own CV and preferences, then discover jobs from the public boards you configure:

```sh
npm run start -- cv:add ~/Documents/cv.pdf --name "Backend Engineer"
npm run start -- preferences:set --file preferences.json
GREENHOUSE_BOARDS=acme,example npm run start -- search
```

You can also search one board explicitly with `discover:greenhouse <board>` or `discover:lever <company>`. These query public employer job board APIs, not LinkedIn. To add a LinkedIn listing, prepare a JSON file with the listing URL and details you collected:

```json
{
  "title": "Backend Engineer",
  "company": "Example Co",
  "url": "https://www.linkedin.com/jobs/view/123456789",
  "location": "Warsaw, Poland",
  "description": "Paste the job description here"
}
```

Then run `npm run start -- job:add job.json`. The command validates the URL and never opens or fetches LinkedIn.

## CLI commands

```text
cv:add <file> [--name <name>]       Import PDF, DOCX, TXT, or MD CV
cv:list                             List CVs
preferences:set --file <file>       Save search preferences
preferences:show                    Show preferences
search [--limit <n>] [--sync-sheet] Search configured public Greenhouse/Lever boards
job:add <file>                      Add a user-provided LinkedIn job record
jobs:list [--status <status>]       Review tracked jobs
job:prepare <id>                    Generate a cover letter for review
application:approve <id> --confirm  Record an application you already submitted yourself
job:update <id> --status <status>   Record interview, rejection, offer, or withdrawal
daily [--limit <n>]                 Discover, score and sync configured integrations
```

## Integrations

- **LinkedIn:** no browser automation or scraping. Import a job URL and user-provided title, company, location, and description via `job:add`.
- **Greenhouse:** set `GREENHOUSE_BOARDS` to comma-separated public board identifiers, or invoke `discover:greenhouse`.
- **Lever:** set `LEVER_COMPANIES` to comma-separated public company identifiers, or invoke `discover:lever`.
- **OpenAI:** set `OPENAI_API_KEY` for model-based matching and cover letters. Otherwise local keyword overlap is used. When enabled, CV and job text is sent to OpenAI.
- **Google Sheets:** `GOOGLE_SHEET_ID` is prefilled with your supplied sheet ID. Set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON path and grant that service account access to the sheet.
- **Notion:** `NOTION_PAGE_ID` is prefilled with your supplied page ID. Set `NOTION_API_KEY` and share the page with the integration.

If Sheets or Notion credentials are absent, `daily` skips those integrations with a message. Live access and writes have not been verified without credentials.

## Data and application safety

SQLite is the source of truth and is stored under `data/` by default. CV text is stored locally. `.env`, `data/`, and database files are Git-ignored. Use `DATABASE_PATH` to change the database location.

The agent never submits applications. `application:approve --confirm` only records an application you personally reviewed and submitted. LinkedIn CAPTCHA, MFA, login challenges, and access restrictions are never accessed or bypassed.
