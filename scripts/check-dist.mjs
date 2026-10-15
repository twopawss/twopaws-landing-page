import fs from "fs";
import path from "path";

/**
 * Fails the build when dist/ lacks the prerendered shop pages. Firebase Hosting
 * deploys whatever is in dist/, and a build whose SSG steps silently produced
 * nothing once shipped /shop/ as a copy of the homepage (homepage title and
 * canonical), so Google folded the whole shop into the homepage.
 */
const MIN_PRODUCT_PAGES = Number.parseInt(process.env.MIN_PRODUCT_PAGES ?? "1000", 10);

const distDir = path.join(process.cwd(), "dist");
const problems = [];

const requireFile = (relativePath) => {
  const filePath = path.join(distDir, relativePath);
  if (!fs.existsSync(filePath)) {
    problems.push(`missing ${relativePath}`);
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
};

const requireCanonical = (relativePath, canonicalUrl) => {
  const html = requireFile(relativePath);
  if (html === null) return;
  const match = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!match) {
    problems.push(`${relativePath} has no canonical link`);
  } else if (match[1] !== canonicalUrl) {
    problems.push(`${relativePath} canonical is ${match[1]}, expected ${canonicalUrl}`);
  }
};

requireFile("index.html");
requireCanonical("shop/index.html", "https://twopaws.pet/shop/");
requireCanonical("shop/suppliers/index.html", "https://twopaws.pet/shop/suppliers/");
requireCanonical("download/index.html", "https://twopaws.pet/download/");
requireFile("sitemap.xml");
requireFile("merchant-feed.xml");

const supplierDir = path.join(distDir, "shop", "supplier");
const supplierPages = fs.existsSync(supplierDir)
  ? fs.readdirSync(supplierDir).filter((id) =>
      fs.existsSync(path.join(supplierDir, id, "index.html"))
    ).length
  : 0;
if (supplierPages < 1) {
  problems.push("no dist/shop/supplier/*/index.html pages");
}

const productDir = path.join(distDir, "shop", "product");
const productPages = fs.existsSync(productDir)
  ? fs.readdirSync(productDir).filter((id) =>
      fs.existsSync(path.join(productDir, id, "index.html"))
    ).length
  : 0;
if (productPages < MIN_PRODUCT_PAGES) {
  problems.push(
    `only ${productPages} dist/shop/product/*/index.html pages, expected at least ${MIN_PRODUCT_PAGES}`
  );
}

if (problems.length) {
  console.error("check-dist: dist/ is not deployable:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `check-dist: ok (${supplierPages} supplier page(s), ${productPages} product page(s)).`
);
