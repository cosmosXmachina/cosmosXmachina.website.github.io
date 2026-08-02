import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { chromium } from "playwright";

const files = [
  "cosmos-hero.png",
  "section-problems-light.png",
  "section-services.png",
  "section-entry-light.png",
  "section-process.png",
  "section-stack-light.png",
  "section-faq.png",
  "section-contact-light.png",
  "section-portfolio.png"
];
const browser = await chromium.launch({ channel: "chromium", headless: true });
const page = await browser.newPage();

try {
  for (const file of files) {
    const source = resolve("assets", file);
    const data = (await readFile(source)).toString("base64");
    const encoded = await page.evaluate(async ({ base64, social }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return {
        webp: canvas.toDataURL("image/webp", 0.86).split(",")[1],
        social: social ? canvas.toDataURL("image/jpeg", 0.84).split(",")[1] : null
      };
    }, { base64: data, social: file === "cosmos-hero.png" });
    const output = source.replace(/\.png$/i, ".webp");
    await writeFile(output, Buffer.from(encoded.webp, "base64"));
    if (encoded.social) {
      await writeFile(resolve("assets", "cosmos-hero-og.jpg"), Buffer.from(encoded.social, "base64"));
    }
    console.log(`${basename(source)} -> ${basename(output)}`);
  }
} finally {
  await browser.close();
}
