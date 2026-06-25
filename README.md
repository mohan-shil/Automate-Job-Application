# Automate-Job-Application

This repository contains a Playwright + JavaScript starter for automating LinkedIn Easy Apply submissions using your CV.

> Important: LinkedIn may block automated actions and may require additional verification or captcha solving. Use this script only for personal experimentation and make sure to follow LinkedIn's terms of service.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Install Playwright browsers:

```bash
npx playwright install
```

3. Copy `.env.example` to `.env` and add your credentials and the target job URL:

```bash
cp .env.example .env
```

4. Open `.env` and fill in your actual values. Do not store real credentials in `.env.example` or commit `.env`.

5. Put your resume file in the path referenced by `LINKEDIN_RESUME_PATH`.

## Run

```bash
npm start
```

## How it works

- Logs in to LinkedIn using `LINKEDIN_EMAIL` and `LINKEDIN_PASSWORD`
- Navigates to the job posting specified by `LINKEDIN_JOB_URL`
- Clicks `Easy Apply`
- Attempts to upload your resume and move through the apply wizard
- Clicks the final `Submit application` button if it is available

## Customization

- If the target job uses a non-`Easy Apply` flow, this script will not work as-is.
- Update selectors in `src/apply-linkedin.js` if LinkedIn changes the page structure.
- Use `LINKEDIN_PHONE` in `.env` if the job form requires a phone number.
- If your resume path contains spaces, wrap the path value in quotes in `.env`.

## Notes

- This is a starting point, not a complete production-ready bot.
- LinkedIn updates often, so maintain the script and validate the application flow manually.
