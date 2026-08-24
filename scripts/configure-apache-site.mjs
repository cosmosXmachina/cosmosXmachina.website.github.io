#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DELIVERY_BLOCK = "COSMOS APACHE DELIVERY";
const PRIVATE_LOG_BLOCK = "COSMOS APACHE PRIVATE LOG";

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function managedBlock(source, name) {
  const match = source.match(new RegExp(`# BEGIN ${name}[\\s\\S]*?# END ${name}`));
  if (!match) throw new Error(`Template is missing the ${name} block.`);
  return match[0];
}

function removeManaged(source, name) {
  return source.replace(new RegExp(`^[ \\t]*# BEGIN ${name}[\\s\\S]*?^[ \\t]*# END ${name}[ \\t]*(?:\\r?\\n)?`, "gmi"), "");
}

function virtualHosts(source) {
  const ranges = [];
  const pattern = /<VirtualHost\b[^>]*>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const close = source.slice(pattern.lastIndex).search(/<\/VirtualHost\s*>/i);
    if (close < 0) throw new Error("Apache site contains an unclosed VirtualHost block.");
    const end = pattern.lastIndex + close + source.slice(pattern.lastIndex + close).match(/^<\/VirtualHost\s*>/i)[0].length;
    ranges.push({ start: match.index, end, opening: match[0] });
    pattern.lastIndex = end;
  }
  return ranges;
}

function namesIn(block) {
  return [...block.matchAll(/^\s*Server(?:Name|Alias)\s+([^#\r\n]+)/gmi)]
    .flatMap((match) => match[1].trim().split(/\s+/));
}

function isTls(range, block) {
  return /:443\b/.test(range.opening) || /^\s*SSLEngine\s+on\b/gmi.test(block);
}

function sanitizeVirtualHost(block) {
  return block.split(/\r?\n/).filter((line) => {
    const directive = line.trim();
    if (/^(?:DocumentRoot|CustomLog|TransferLog)\b/i.test(directive)) return false;
    if (/^ProxyPass(?:Reverse|Match)?\b/i.test(directive)) return false;
    if (/^(?:RewriteEngine|RewriteCond|RewriteRule|Redirect|RedirectMatch)\b/i.test(directive)) return false;
    if (/^(?:Alias|ScriptAlias)\b/i.test(directive) && !/\/\.well-known\/acme-challenge\/?/i.test(directive)) return false;
    return true;
  }).join("\n");
}

export function renderApacheTemplate(template, { appRoot, domain, wwwDomain }) {
  return template
    .replaceAll("@COSMOS_ROOT@", appRoot.replace(/\/$/, ""))
    .replaceAll("@DOMAIN@", domain)
    .replaceAll("@WWW_DOMAIN@", wwwDomain);
}

export function mergeApacheSite(existing, renderedTemplate, { domain, wwwDomain, mode = "auto" }) {
  let source = removeManaged(removeManaged(existing, DELIVERY_BLOCK), PRIVATE_LOG_BLOCK);
  const delivery = managedBlock(renderedTemplate, DELIVERY_BLOCK);
  const privateLog = managedBlock(renderedTemplate, PRIVATE_LOG_BLOCK);
  const accepted = new RegExp(`^(?:${escapePattern(domain)}|${escapePattern(wwwDomain)})$`, "i");
  const matches = virtualHosts(source).filter((range) => namesIn(source.slice(range.start, range.end)).some((name) => accepted.test(name)));
  if (!matches.length) throw new Error("No Apache VirtualHost matches the configured domain.");
  const tls = matches.filter((range) => isTls(range, source.slice(range.start, range.end)));
  if (!["auto", "delivery", "http"].includes(mode)) throw new Error(`Unsupported Apache merge mode: ${mode}`);
  const targets = mode === "http" ? [] : mode === "delivery" ? matches : tls.length ? tls : matches;
  const targetStarts = new Set(targets.map((range) => range.start));

  for (const range of matches.reverse()) {
    let block = sanitizeVirtualHost(source.slice(range.start, range.end));
    const managed = targetStarts.has(range.start) ? delivery : privateLog;
    block = block.replace(/\s*<\/VirtualHost\s*>\s*$/i, `\n\n${managed}\n</VirtualHost>`);
    source = source.slice(0, range.start) + block + source.slice(range.end);
  }
  return source.trimEnd() + "\n";
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const templatePath = option("--template");
  const existingPath = option("--existing");
  const outputPath = option("--output");
  const settings = {
    appRoot: option("--app-root"),
    domain: option("--domain"),
    wwwDomain: option("--www-domain"),
    mode: option("--mode") || "auto"
  };
  if (!templatePath || !existingPath || !outputPath || !settings.appRoot || !settings.domain || !settings.wwwDomain) {
    throw new Error("Missing required Apache configuration argument.");
  }
  const template = renderApacheTemplate(await readFile(templatePath, "utf8"), settings);
  const existing = await readFile(existingPath, "utf8");
  await writeFile(outputPath, mergeApacheSite(existing, template, settings), "utf8");
}
