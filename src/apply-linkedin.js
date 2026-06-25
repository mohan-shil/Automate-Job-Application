const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
require('dotenv').config();

const email = process.env.LINKEDIN_EMAIL;
const password = process.env.LINKEDIN_PASSWORD;
const jobUrl = process.env.LINKEDIN_JOB_URL;
const resumePath = process.env.LINKEDIN_RESUME_PATH || path.join(process.cwd(), 'resume.pdf');

const isCodespaces = process.env.CODESPACES === 'true';
const requestedHeaded = process.argv.includes('--headed');
const shouldUseHeaded = requestedHeaded && !isCodespaces;
const headlessMode = !shouldUseHeaded;

if (isCodespaces && requestedHeaded) {
  console.warn('Detected GitHub Codespaces. Ignoring --headed and forcing headless mode.');
}

console.log(`Playwright launch mode: ${headlessMode ? 'headless' : 'headed'}${isCodespaces ? ' (Codespaces detected)' : ''}`);

if (!email || !password || !jobUrl) {
  console.error('\nMissing environment variables.\nPlease copy .env.example to .env and set LINKEDIN_EMAIL, LINKEDIN_PASSWORD, and LINKEDIN_JOB_URL in .env.');
  process.exit(1);
}

if (!fs.existsSync(resumePath)) {
  console.error(`\nResume file not found at ${resumePath}.\nSet LINKEDIN_RESUME_PATH to a valid PDF or DOCX file path.`);
  process.exit(1);
}

async function login(page) {
  console.log('Logging into LinkedIn...');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });
  await page.fill('input#username', email);
  await page.fill('input#password', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);

  if (page.url().includes('/checkpoint/') || page.url().includes('/verify/')) {
    throw new Error('LinkedIn requested extra verification. Complete it manually and restart when possible.');
  }

  console.log('Logged in successfully.');
}

async function applyToJob(page) {
  console.log(`Navigating to job posting: ${jobUrl}`);
  await page.goto(jobUrl, { waitUntil: 'networkidle' });

  const easyApplyButton = await page.$('button:has-text("Easy Apply")');
  if (!easyApplyButton) {
    throw new Error('Easy Apply button not found on this job posting. This script only supports LinkedIn Easy Apply flows.');
  }

  await easyApplyButton.click();
  await page.waitForTimeout(2000);

  console.log('Easy Apply dialog opened.');

  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('Uploading resume...');
    await fileInput.setInputFiles(resumePath);
  }

  const phoneInput = await page.$('input[name*="phone"]');
  if (phoneInput) {
    const phoneValue = process.env.LINKEDIN_PHONE || '';
    if (phoneValue) {
      await phoneInput.fill(phoneValue);
    }
  }

  for (let step = 0; step < 6; step += 1) {
    await page.waitForTimeout(1500);

    const submitButton = await page.$('button:has-text("Submit application")');
    if (submitButton) {
      console.log('Submitting application...');
      await submitButton.click();
      await page.waitForTimeout(3000);
      return;
    }

    const reviewButton = await page.$('button:has-text("Review")');
    if (reviewButton) {
      console.log('Reviewing application...');
      await reviewButton.click();
      await page.waitForTimeout(2000);
      continue;
    }

    const nextButton = await page.$('button:has-text("Next")');
    if (nextButton) {
      console.log('Advancing to next step...');
      await nextButton.click();
      continue;
    }

    const progressButtons = await page.$$('button');
    if (!submitButton && !reviewButton && !nextButton && progressButtons.length === 0) {
      break;
    }
  }

  throw new Error('Could not complete the application flow automatically. LinkedIn may have changed the UI or require extra fields.');
}

async function createBrowser() {
  try {
    return await chromium.launch({ headless: headlessMode });
  } catch (launchError) {
    console.error('\nBrowser launch error:', launchError.message || launchError);
    if (isCodespaces) {
      console.error('GitHub Codespaces detected: ensure headless mode is used and the environment supports Playwright browsers.');
    }
    process.exit(1);
  }
}

(async () => {
  let browser;
  try {
    browser = await createBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page);
    await applyToJob(page);
    console.log('Application flow finished. Please verify the result in the browser.');
  } catch (error) {
    console.error('\nAutomation error:', error.message || error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
