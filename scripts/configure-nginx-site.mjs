#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function managedBlock(source, name) {
  const match = source.match(new RegExp(`# BEGIN ${name}[\\s\\S]*?# END ${name}`));
  if (!match) throw new Error(`Template is missing the ${name} block.`);
  return match[0];
}

function removeManaged(source, name) {
  return source.replace(new RegExp(`^[ \\t]*# BEGIN ${name}[\\s\\S]*?^[ \\t]*# END ${name}[ \\t]*(?:\\r?\\n)?`, "gm"), "");
}

function serverRanges(source) {
  const ranges = [];
  const pattern = /(^|\n)[ \t]*server[ \t]*\{/g;
  let match;
  while ((match = pattern.exec(source))) {
    const start = match.index + match[1].length;
    const open = source.indexOf("{", start);
    let depth = 1;
    let quote = "";
    let comment = false;
    let end = open + 1;
    for (; end < source.length && depth; end += 1) {
      const character = source[end];
      if (comment) {
        if (character === "\n") comment = false;
        continue;
      }
      if (quote) {
        if (character === quote && source[end - 1] !== "\\") quote = "";
        continue;
      }
      if (character === "#") comment = true;
      else if (character === '"' || character === "'") quote = character;
      else if (character === "{") depth += 1;
      else if (character === "}") depth -= 1;
    }
    if (depth) throw new Error("Unbalanced braces in the existing Nginx site.");
    ranges.push({ start, open, end });
    pattern.lastIndex = end;
  }
  return ranges;
}

export function renderNginxTemplate(template, { appRoot, domain, wwwDomain }) {
  return template
    .replaceAll("/var/www/cosmosXmachina.website.github.io", appRoot)
    .replaceAll("www.cosmos-x-machina.it", wwwDomain)
    .replaceAll("cosmos-x-machina.it", domain);
}

export function mergeNginxSite(existing, renderedTemplate, { domain, wwwDomain }) {
  const format = managedBlock(renderedTemplate, "COSMOS VISIT FORMAT");
  const delivery = managedBlock(renderedTemplate, "COSMOS DELIVERY");
  let source = removeManaged(removeManaged(removeManaged(existing, "COSMOS DELIVERY"), "COSMOS VISIT FORMAT"), "COSMOS CANONICAL HOST");
  source = source.replace(/^\s*log_format\s+cosmos_visit\b[^;]*;\s*(?:\r?\n)?/gm, "");
  source = `${format}\n\n${source.trimStart()}`;

  const hostPattern = new RegExp(`server_name\\s+[^;]*(?:${escapePattern(domain)}|${escapePattern(wwwDomain)})[^;]*;`);
  const wwwPattern = new RegExp(`server_name\\s+[^;]*${escapePattern(wwwDomain)}[^;]*;`);
  const ranges = serverRanges(source).filter(({ start, end }) => hostPattern.test(source.slice(start, end)));
  if (!ranges.length) throw new Error("No matching domain server block was found in the existing Nginx site.");

  let staticBlocks = 0;
  for (const range of ranges.reverse()) {
    let block = source.slice(range.start, range.end);
    block = block.replace(/^\s*access_log\s+[^;]+;\s*(?:\r?\n)?/gm, "");
    const isStatic = /\broot\s+[^;]*\/dist\s*;/.test(block);
    if (isStatic) {
      staticBlocks += 1;
      block = block.replace(/^\s*(?:etag|gzip|gzip_vary|gzip_min_length|gzip_comp_level|gzip_types)\s+[^;]+;\s*(?:\r?\n)?/gm, "");
      block = block.replace(/(location(?:\s+\^~)?\s+\/api\/\s*\{)/, "$1\n        access_log off;");
    }
    const additions = [];
    if (wwwPattern.test(block)) {
      additions.push(`# BEGIN COSMOS CANONICAL HOST\n    if ($host = ${wwwDomain}) { return 301 https://${domain}$request_uri; }\n    # END COSMOS CANONICAL HOST`);
    }
    additions.push(isStatic ? delivery : "    access_log off;");
    block = block.replace("{", `{\n    ${additions.join("\n\n    ")}`);
    source = source.slice(0, range.start) + block + source.slice(range.end);
  }
  if (!staticBlocks) throw new Error("The existing TLS site has no static dist server block.");
  return source;
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const templatePath = option("--template");
  const existingPath = option("--existing");
  const outputPath = option("--output");
  const settings = { appRoot: option("--app-root"), domain: option("--domain"), wwwDomain: option("--www-domain") };
  if (!templatePath || !outputPath || Object.values(settings).some((value) => !value)) throw new Error("Missing required Nginx configuration argument.");
  const rendered = renderNginxTemplate(await readFile(templatePath, "utf8"), settings);
  let output = rendered;
  if (existingPath) {
    const existing = await readFile(existingPath, "utf8");
    if (/listen\s+[^;]*443|ssl_certificate/.test(existing)) output = mergeNginxSite(existing, rendered, settings);
  }
  await writeFile(outputPath, output, "utf8");
}
