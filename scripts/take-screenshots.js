#!/usr/bin/env node
/**
 * take-screenshots.js
 *
 * Captures README-quality screenshots of the SigmaSpend app.
 * Requires the backend (port 8100) and frontend (port 5173 dev / 8101 preview) to already be running.
 *
 * Usage (from repo root):
 *   node scripts/take-screenshots.js
 *
 * Output: docs/screenshots/*.png  (2880×1800 retina — 1440px logical)
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "..", "docs", "screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 900 };
const BASE_URL = "http://localhost:8101";

async function save(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ saved ${name}.png`);
}

async function settle(page, ms = 800) {
  await page.waitForTimeout(ms);
}

/** Scroll a .sectionCard whose h3 matches `heading` into view. */
async function scrollToCard(page, heading) {
  await page.evaluate((h) => {
    const cards = Array.from(document.querySelectorAll(".sectionCard"));
    const card = cards.find((c) => {
      const el = c.querySelector("h2, h3");
      return el && el.textContent.trim().startsWith(h);
    });
    if (card) card.scrollIntoView({ behavior: "instant", block: "start" });
  }, heading);
  await page.waitForTimeout(400);
}

/** Click a button whose visible text starts with `label` (case-insensitive). */
async function clickButton(page, label) {
  const btn = page.getByRole("button", { name: new RegExp(`^${label}`, "i") }).first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(600);
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("Loading app...");
  await page.goto(BASE_URL, { waitUntil: "networkidle" });

  // Trigger lazy rendering by scrolling to bottom then back
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await settle(page, 1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 1000);

  // ── 0. Import Bank Statement ──────────────────────────────────────────────
  console.log("\n[0/5] Import Bank Statement");
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 600);
  await save(page, "00-import");

  // ── 1. Financial Summaries (analytics charts) ─────────────────────────────
  console.log("\n[1/5] Financial Summaries");
  await scrollToCard(page, "Financial Summaries");
  // Switch to Year view to show the full 2026 picture
  await clickButton(page, "Year");
  await settle(page, 1200);
  // Scroll back into view after button click may have moved the page
  await scrollToCard(page, "Financial Summaries");
  await settle(page);
  await save(page, "01-analytics");

  // ── 2. Budget Planner ─────────────────────────────────────────────────────
  console.log("[2/5] Budget Planner");
  await scrollToCard(page, "Budget Planner");
  await settle(page, 400);
  // Expand if collapsed
  const budgetToggle = page.locator(".sectionCard").filter({ hasText: "Budget Planner" }).locator("button").first();
  const budgetToggleText = await budgetToggle.textContent().catch(() => "");
  if (budgetToggleText.includes("▸") || budgetToggleText.includes("▶")) {
    await budgetToggle.click();
    await settle(page, 1200);
  }
  await scrollToCard(page, "Budget Planner");
  await settle(page, 600);
  await save(page, "02-budget-planner");

  // ── 3. Holiday Summaries ──────────────────────────────────────────────────
  console.log("[3/5] Holiday Summaries");
  await scrollToCard(page, "Holiday Summaries");
  await settle(page, 400);
  // Expand if collapsed (the card header has a toggle button)
  const holidayToggle = page.locator(".sectionCard").filter({ hasText: "Holiday Summaries" }).locator("button").first();
  const toggleText = await holidayToggle.textContent().catch(() => "");
  if (toggleText.includes("▸") || toggleText.includes("▶")) {
    await holidayToggle.click();
    await settle(page, 1000);
  }
  await scrollToCard(page, "Holiday Summaries");
  await settle(page, 600);
  await save(page, "03-holiday-analytics");

  // ── 4. Transaction Ledger ─────────────────────────────────────────────────
  console.log("[4/5] Transaction Ledger");
  await scrollToCard(page, "Transaction Ledger");
  await settle(page);
  await save(page, "04-ledger");

  // ── 5. Expense detail sidebar ─────────────────────────────────────────────
  console.log("[5/5] Expense detail sidebar");
  // The description is the 3rd td in each ledger row (no class, plain text)
  // Click the first one to open the sidebar
  const descCell = page.locator("table tbody tr").first().locator("td").nth(2);
  if (await descCell.isVisible({ timeout: 3000 }).catch(() => false)) {
    await descCell.click();
    await settle(page, 700);
    await save(page, "05-expense-sidebar");
  } else {
    console.log("  ⚠ Could not find description cell — skipping sidebar shot");
  }

  await browser.close();
  console.log(`\nAll screenshots saved to docs/screenshots/`);
})();
