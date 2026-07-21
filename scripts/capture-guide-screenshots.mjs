import { readFileSync, rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const assetsDir = resolve(root, "docs/guides/assets");
const env = loadEnvironment(resolve(root, ".env.local"));
const baseUrl = required("GUIDE_BASE_URL", env).replace(/\/$/, "");
const email = required("GUIDE_USER_EMAIL", env);
const password = required("GUIDE_USER_PASSWORD", env);

mkdirSync(assetsDir, { recursive: true });
for (const file of requiredScreenshots()) {
  rmSync(resolve(assetsDir, file), { force: true });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await capturePage(page, "01-login.png");

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await Promise.all([
    page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 }),
    page.getByRole("button", { name: "Войти", exact: true }).click(),
  ]);
  await page.waitForLoadState("networkidle");
  await assertNoAccessError(page);

  await captureLocator(page, page.locator("header"), "02-navigation.png");
  await capturePage(page, "03-dashboard.png");

  await page.goto(`${baseUrl}/analytics`, { waitUntil: "networkidle" });
  await assertNoAccessError(page);
  await capturePage(page, "04-analytics-overview.png");
  await capturePanel(page, "Проекты по статусам", "05-status-chart.png");
  await capturePanel(
    page,
    "Проекты по отраслевым управлениям",
    "06-industry-chart.png",
  );
  await capturePanel(page, "CSM-матрица", "07-csm-matrix.png", 900);
  await capturePanel(
    page,
    "Директорская структура",
    "08-director-analytics.png",
    900,
  );
  await capturePanel(page, "Флагманская аналитика", "09-flagship-analytics.png");

  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
  await assertNoAccessError(page);
  await capturePage(page, "10-projects-registry.png");
  await capturePage(page, "13-csm-registry.png");

  const addProject = page.getByRole("link", { name: "Добавить проект", exact: true });
  if ((await addProject.count()) !== 1) {
    throw new Error(
      "The guide user must have editor/admin access so the Add project control is visible.",
    );
  }
  await captureLocator(page, addProject.locator("xpath=ancestor::div[1]"), "14-add-project-button.png");

  await page.goto(`${baseUrl}/projects/new`, { waitUntil: "networkidle" });
  await assertNoAccessError(page);
  await capturePage(page, "15-project-create.png");

  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
  const projectUrl = await findGuideProjectUrl(page);
  await page.goto(`${baseUrl}${projectUrl}`, { waitUntil: "networkidle" });
  await assertNoAccessError(page);
  await capturePage(page, "11-project-detail.png");
  await capturePage(page, "12-download-actions.png");
  await capturePage(page, "04-project-detail-csm.png");

  await capturePanel(page, "Паспорт проекта", "21-passport-document.png");
  await capturePanel(page, "История изменений", "22-history.png", 900);

  const editButton = page.getByRole("button", {
    name: "Редактировать проект",
    exact: true,
  });
  if ((await editButton.count()) !== 1) {
    throw new Error(
      "The selected project cannot be edited by the guide user. Use an editor/admin account.",
    );
  }
  await editButton.click();
  await page.getByText("Основная информация", { exact: true }).waitFor();
  await capturePage(page, "16-project-edit.png");

  const flagshipSection = sectionBySummary(page, "Флагманский проект");
  if ((await flagshipSection.count()) !== 1) {
    throw new Error("The flagship edit section was not found.");
  }
  const sourceFields = page
    .getByText("Что сейчас есть у клиента", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'grid')][1]");
  await captureLocator(page, sourceFields, "17-flagship-source-fields.png", 1050);
  await capturePanel(page, "Паспорт проекта", "18-passport-autofill.png");
  const generatedFields = page
    .getByText("Поля паспорта", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-md')][1]");
  await captureLocator(page, generatedFields, "19-generated-passport-fields.png");

  const descriptionIndicator = page.getByText("Описание загружено", { exact: true });
  if ((await descriptionIndicator.count()) !== 1) {
    throw new Error(
      "No existing editable flagship project with the Description uploaded indicator was found.",
    );
  }
  await captureLocator(page, flagshipSection, "20-description-uploaded.png", 520);

  validateOutputs();
  console.log(`Captured ${requiredScreenshots().length} masked guide screenshots.`);
} finally {
  await context.close();
  await browser.close();
}

function loadEnvironment(file) {
  const values = { ...process.env };
  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return values;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!values[key]) values[key] = value;
  }
  return values;
}

function required(name, values) {
  const value = values[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local or the command environment; never commit its value.`,
    );
  }
  return value;
}

async function maskSensitiveText(page) {
  await page.evaluate(() => {
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (emailPattern.test(node.textContent ?? "")) {
        node.textContent = (node.textContent ?? "").replace(
          emailPattern,
          "user@example.com",
        );
      }
      emailPattern.lastIndex = 0;
    }

    let csmIndex = 0;
    for (const link of document.querySelectorAll('a[href*="csm="]')) {
      csmIndex += 1;
      link.textContent = `CSM ${csmIndex}`;
    }

    let directorIndex = 0;
    for (const link of document.querySelectorAll('a[href*="director="]')) {
      directorIndex += 1;
      link.textContent = `Директор ${directorIndex}`;
    }

    for (const term of document.querySelectorAll("dt")) {
      const label = term.textContent?.trim();
      const value = term.nextElementSibling;
      if (!value) continue;
      if (label === "CSM") value.textContent = "CSM (пример)";
      if (label === "Директор") value.textContent = "Директор (пример)";
      if (label === "Кто загрузил") value.textContent = "Пользователь";
    }

    const historyHeading = Array.from(document.querySelectorAll("h3")).find(
      (heading) => heading.textContent?.trim() === "История изменений",
    );
    const historySection = historyHeading?.closest("section");
    for (const paragraph of historySection?.querySelectorAll("article > p") ?? []) {
      paragraph.textContent = (paragraph.textContent ?? "").replace(
        /^(.+?,)\s+(.+?)\s+[—-]\s+/,
        "$1 Пользователь - ",
      );
    }
  });
  await page.addStyleTag({
    content: `
      header p.truncate { color: transparent !important; position: relative; }
      header p.truncate::after {
        content: "user@example.com";
        color: #1e293b;
        position: absolute;
        inset: 0;
      }
    `,
  });
}

async function capturePage(page, fileName) {
  await maskSensitiveText(page);
  await page.screenshot({
    path: resolve(assetsDir, fileName),
    fullPage: false,
    animations: "disabled",
  });
}

async function captureLocator(page, locator, fileName, maxHeight = null) {
  await maskSensitiveText(page);
  await locator.scrollIntoViewIfNeeded();
  if (maxHeight) {
    await locator.evaluate((element, height) => {
      element.style.maxHeight = `${height}px`;
      element.style.overflow = "hidden";
    }, maxHeight);
  }
  await locator.screenshot({
    path: resolve(assetsDir, fileName),
    animations: "disabled",
  });
}

async function capturePanel(page, heading, fileName, maxHeight = null) {
  const title = page.getByText(heading, { exact: true });
  if ((await title.count()) !== 1) {
    throw new Error(`Required guide panel was not found: ${heading}`);
  }
  const section = title.locator("xpath=ancestor::section[1]");
  await captureLocator(page, section, fileName, maxHeight);
}

function sectionBySummary(page, summary) {
  return page
    .getByText(summary, { exact: true })
    .locator("xpath=ancestor::details[1]");
}

async function findGuideProjectUrl(page) {
  const flagshipCard = page
    .locator("article")
    .filter({ hasText: "Флагман" })
    .locator('a[href^="/projects/"]:not([href="/projects/new"])');
  if ((await flagshipCard.count()) > 0) {
    return await flagshipCard.first().getAttribute("href");
  }

  const anyProject = page.locator(
    'a[href^="/projects/"]:not([href="/projects/new"])',
  );
  if ((await anyProject.count()) === 0) {
    throw new Error("No accessible project cards were found for guide screenshots.");
  }
  return await anyProject.first().getAttribute("href");
}

async function assertNoAccessError(page) {
  const body = await page.locator("body").innerText();
  if (
    body.includes("permission denied") ||
    body.includes("Не удалось загрузить данные из Supabase") ||
    body.includes("Доступ ограничен")
  ) {
    throw new Error(
      "The guide account cannot access a required screen. Check its role and data permissions.",
    );
  }
}

function requiredScreenshots() {
  return [
    "01-login.png",
    "02-navigation.png",
    "03-dashboard.png",
    "04-analytics-overview.png",
    "05-status-chart.png",
    "06-industry-chart.png",
    "07-csm-matrix.png",
    "08-director-analytics.png",
    "09-flagship-analytics.png",
    "10-projects-registry.png",
    "11-project-detail.png",
    "12-download-actions.png",
    "13-csm-registry.png",
    "14-add-project-button.png",
    "15-project-create.png",
    "16-project-edit.png",
    "17-flagship-source-fields.png",
    "18-passport-autofill.png",
    "19-generated-passport-fields.png",
    "20-description-uploaded.png",
    "21-passport-document.png",
    "22-history.png",
    "04-project-detail-csm.png",
  ];
}

function validateOutputs() {
  for (const file of requiredScreenshots()) {
    try {
      const size = readFileSync(resolve(assetsDir, file)).byteLength;
      if (size < 2_000) throw new Error("file is unexpectedly small");
    } catch (error) {
      throw new Error(`Screenshot validation failed for ${file}: ${error.message}`);
    }
  }
}
