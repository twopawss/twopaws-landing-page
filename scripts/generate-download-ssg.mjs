import fs from "fs";
import path from "path";

/**
 * Writes dist/download/index.html. The /download/ route is a client-side
 * redirect to the app stores and is deliberately noindex (see
 * client/src/pages/download.tsx), but without a static page Hosting served it
 * the homepage HTML, whose canonical points at https://twopaws.pet. The static
 * page carries the route's own title, a self-referencing canonical and the
 * same noindex the React page sets, so crawlers never see the homepage
 * canonical on this URL. It is not in the sitemap because it is noindex.
 * react-snap cannot prerender it: the page redirects on mount.
 */
const DEFAULT_BASE_URL = "https://twopaws.pet";

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split("=");
      acc[key] = rest.join("=").trim();
      return acc;
    }, {});
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const upsertTag = (html, pattern, tag) =>
  pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);

const upsertMetaByName = (html, name, content) =>
  upsertTag(
    html,
    new RegExp(`<meta\s+name=["']${name}["'][^>]*>`, "i"),
    `<meta name="${name}" content="${escapeHtml(content)}" />`
  );

const root = process.cwd();
const distDir = path.join(root, "dist");
const templatePath = path.join(distDir, "index.html");
if (!fs.existsSync(templatePath)) {
  console.error("Download SSG: dist/index.html not found. Run vite build first.");
  process.exit(1);
}

const env = { ...readEnvFile(path.join(root, "client", ".env")), ...process.env };
const baseUrl = (env.VITE_SITE_URL || env.SITE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
const canonicalUrl = `${baseUrl}/download/`;
const title = "Download TwoPaws";
const description = "Get the TwoPaws app on the App Store or Google Play.";

let html = fs.readFileSync(templatePath, "utf8");
html = upsertTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
html = upsertMetaByName(html, "description", description);
html = upsertMetaByName(html, "robots", "noindex,follow");
html = upsertMetaByName(html, "googlebot", "noindex,follow");
html = upsertTag(
  html,
  /<link\s+rel=["']canonical["'][^>]*>/i,
  `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
);

const outDir = path.join(distDir, "download");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
console.log("Download SSG: wrote dist/download/index.html (noindex, self-canonical).");
