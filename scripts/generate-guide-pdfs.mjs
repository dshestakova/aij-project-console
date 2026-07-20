import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

const bundledPython = `${homedir()}/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`;
const candidates = [process.env.CODEX_PYTHON, bundledPython, "python3"].filter(Boolean);

for (const python of candidates) {
  if (python.includes("/") && !existsSync(python)) {
    continue;
  }

  const check = spawnSync(python, ["-c", "import reportlab"], {
    stdio: "ignore",
  });

  if (check.status !== 0) {
    continue;
  }

  const result = spawnSync(python, ["scripts/generate-guide-pdfs.py"], {
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

console.error(
  "PDF generation requires Python with reportlab. Install it with: python3 -m pip install reportlab pypdf pdfplumber",
);
process.exit(1);
