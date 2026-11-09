import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter(file => file.endsWith(".html"));
const required = ["index.html", "startups.html", "developers.html", "about.html", "register.html", "login.html", "privacy.html", "terms.html", "404.html"];
const errors = [];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required page: ${file}`);
}

for (const file of htmlFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (!/<html\s+lang=["']ru["']/.test(source)) errors.push(`${file}: missing Russian document language`);
  if (!/<meta\s+name=["']viewport["']/.test(source)) errors.push(`${file}: missing viewport metadata`);
  const refs = [...source.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref)) continue;
    const clean = decodeURIComponent(ref.split(/[?#]/, 1)[0]);
    if (!clean) continue;
    const target = path.resolve(root, clean);
    if (!target.startsWith(root + path.sep) && target !== root) errors.push(`${file}: path escapes project root: ${ref}`);
    else if (!fs.existsSync(target)) errors.push(`${file}: missing local asset or page: ${ref}`);
  }
}

try {
  execFileSync(process.execPath, ["--check", "auth.js"], { stdio: "pipe" });
} catch (error) {
  errors.push("auth.js: JavaScript syntax check failed");
  if (error.stderr) process.stderr.write(error.stderr);
}

if (errors.length) {
  console.error("Startupium checks failed:");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}
console.log(`Startupium checks passed: ${htmlFiles.length} HTML pages, local references and auth.js syntax.`);
