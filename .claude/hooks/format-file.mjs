#!/usr/bin/env node
// PostToolUse hook: al crear/editar un archivo (1) recorta espacios en
// blanco sobrantes, (2) aplica eslint --fix y (3) formatea con Prettier
// (última pasada, ya que es la autoridad final de estilo). Silencioso ante
// errores: nunca debe bloquear el flujo de Claude Code.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const FORMAT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".mdx", ".css", ".json"]);
const LINT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const TRIM_SKIP_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2"]);

function readStdin() {
  try {
    const data = readFileSync(0, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function trimWhitespace(filePath) {
  const original = readFileSync(filePath, "utf-8");
  const trimmed = original
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  if (trimmed !== original) {
    writeFileSync(filePath, trimmed, "utf-8");
  }
}

const payload = readStdin();
const filePath = payload?.tool_input?.file_path;

if (filePath && existsSync(filePath)) {
  const ext = path.extname(filePath).toLowerCase();

  if (!TRIM_SKIP_EXTENSIONS.has(ext)) {
    try {
      trimWhitespace(filePath);
    } catch {
      // ignore: never block on cleanup failures
    }
  }

  if (LINT_EXTENSIONS.has(ext)) {
    spawnSync("npx", ["eslint", "--fix", filePath], {
      cwd: payload.cwd,
      stdio: "ignore",
      shell: true,
    });
  }

  if (FORMAT_EXTENSIONS.has(ext)) {
    spawnSync("npx", ["prettier", "--write", filePath], {
      cwd: payload.cwd,
      stdio: "ignore",
      shell: true,
    });
  }
}

process.exit(0);
