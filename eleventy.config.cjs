const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const Image = require("@11ty/eleventy-img");

// Detect pathPrefix from CLI args or env
function detectPathPrefix() {
  // Check environment variable first
  if (process.env.PATH_PREFIX && process.env.PATH_PREFIX !== '/') {
    return process.env.PATH_PREFIX;
  }
  // Check CLI argument
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--pathprefix=') || arg.startsWith('--pathPrefix=')) {
      const val = arg.split('=')[1];
      // Ensure it starts with / and ends with /
      if (val && val !== '/') {
        return val.startsWith('/') ? val : '/' + val;
      }
    }
  }
  return '/';
}
const pathPrefix = detectPathPrefix();

async function imageShortcode(src, alt, className = "", sizes = "100vw", widths = [400, 800, 1200]) {
  if (!src) return "";
  
  let fullSrc = src.startsWith('/') ? `.${src}` : src;
  
  if (src.startsWith('http')) {
     return `<img src="${src}" alt="${alt}" class="${className}" loading="lazy" decoding="async">`;
  }

  let metadata = await Image(fullSrc, {
    widths: widths,
    formats: ["webp", "auto"],
    outputDir: "./_site/img/optimized/",
    urlPath: "/img/optimized/",
    sharpOptions: {
      trim: true,
    }
  });

  let imageAttributes = {
    alt,
    class: className,
    sizes,
    loading: "lazy",
    decoding: "async",
  };

  return Image.generateHTML(metadata, imageAttributes);
}


function readSettings(filename) {
  const p = path.join(__dirname, "content", "settings", filename);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readProducts() {
  const dir = path.join(__dirname, "content", "products");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data, content } = matter(raw);
      const slug = data.slug || f.replace(/\.md$/, "");
      return {
        ...data,
        slug,
        body: content.trim(),
      };
    })
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function readCategories() {
  const dir = path.join(__dirname, "content", "categories");
  if (!fs.existsSync(dir)) return [];
  const cats = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data } = matter(raw);
      const slug = data.slug || f.replace(/\.md$/, "");
      return {
        ...data,
        slug
      };
    })
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  // Prepend "All" category for filtering
  return [
    { name: "All", slug: "all", icon: "storefront" },
    ...cats
  ];
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("static");
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });

  eleventyConfig.addWatchTarget("./content/");
  eleventyConfig.addWatchTarget("./static/img/uploads/");

  // Prevent Eleventy's dev server from reloading the CMS admin page
  // when content files change (the CMS manages its own state)
  eleventyConfig.setServerOptions({
    middleware: [],
    domDiff: true,
    // BrowserSync-compatible snippet that skips reload on /admin/ pages
    watch: ["_site/**/*.html", "_site/**/*.css", "_site/**/*.js"],
  });
  eleventyConfig.setBrowserSyncConfig && eleventyConfig.setBrowserSyncConfig({
    snippetOptions: {
      rule: {
        match: /<\/body>/i,
        fn: function (snippet) {
          // Wrap the BrowserSync snippet so it won't reload /admin/ pages
          return `<script>
            if (window.location.pathname.indexOf('/admin') !== 0) {
              document.write(${JSON.stringify(snippet)});
            }
          </script></body>`;
        }
      }
    }
  });

  eleventyConfig.addGlobalData("settings", () => readSettings("general.json"));
  eleventyConfig.addGlobalData("homepageSettings", () => readSettings("homepage.json"));
  eleventyConfig.addGlobalData("categoryList", () => readCategories().filter(c => c.is_page_active && c.slug !== "all"));
  eleventyConfig.addGlobalData("shopCategories", () => ({ categories: readCategories() }));
  eleventyConfig.addGlobalData("devotionalsSettings", () => readSettings("devotionals.json"));
  eleventyConfig.addGlobalData("clubHubSettings", () => readSettings("club-hub.json"));
  eleventyConfig.addGlobalData("ourStorySettings", () => readSettings("our-story.json"));
  eleventyConfig.addGlobalData("contactSettings", () => readSettings("contact.json"));
  eleventyConfig.addGlobalData("checkoutSettings", () => readSettings("checkout.json"));
  eleventyConfig.addGlobalData("shippingSettings", () => readSettings("shipping.json"));
  eleventyConfig.addGlobalData("privacySettings", () => readSettings("privacy.json"));
  eleventyConfig.addGlobalData("products", () => readProducts());

  eleventyConfig.addNunjucksAsyncShortcode("image", async (src, alt, className = "", sizes = "100vw", widths = [400, 800, 1200]) => {
    if (!src) return "";
    
    let fullSrc = src.startsWith('/') ? `.${src}` : src;
    
    if (src.startsWith('http')) {
       return `<img src="${src}" alt="${alt}" class="${className}" loading="lazy" decoding="async">`;
    }

    let metadata = await Image(fullSrc, {
      widths: widths,
      formats: ["webp", "auto"],
      outputDir: "./_site/img/optimized/",
      urlPath: "/img/optimized/",
      sharpOptions: {
        trim: true,
      }
    });

    let imageAttributes = {
      alt,
      class: className,
      sizes,
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(metadata, imageAttributes);
  });
  
  eleventyConfig.addNunjucksAsyncShortcode("logo", async (src, alt, width = 180, className = "") => {
    if (!src) return "";
    let fullSrc = src.startsWith('/') ? `.${src}` : src;
    
    if (src.startsWith('http')) {
      return `<img src="${src}" alt="${alt}" width="${width}" class="${className}" loading="lazy">`;
    }

    const sharp = require('sharp');
    const input = sharp(fullSrc).ensureAlpha().trim();
    const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
    
    const rKey = data[0], gKey = data[1], bKey = data[2];
    const tolerance = 40;

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (Math.abs(r - rKey) < tolerance && Math.abs(g - gKey) < tolerance && Math.abs(b - bKey) < tolerance) {
        data[i+info.channels - 1] = 0;
      }
    }

    const cleanBuffer = await sharp(data, { 
      raw: { width: info.width, height: info.height, channels: info.channels } 
    }).png().toBuffer();

    let metadata = await Image(cleanBuffer, {
      widths: [width, width * 2],
      formats: ["webp", "png"],
      outputDir: "./_site/img/logo/",
      urlPath: "/img/logo/",
    });

    let imageAttributes = {
      alt,
      class: className,
      sizes: `${width}px`,
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(metadata, imageAttributes);
  });


  eleventyConfig.addFilter("sitePath", (p) => {
    if (p == null || p === "") return "/";
    const s = String(p).trim();
    if (/^https?:\/\//i.test(s) || s.startsWith("//") || s.startsWith("#") || s.startsWith("mailto:")) {
      return s;
    }
    let o = s.startsWith("/") ? s : `/${s}`;
    if (!o.includes("?") && !o.endsWith("/")) o += "/";
    return o;
  });

  eleventyConfig.addFilter("resolveNav", (item, categoryList) => {
    // 1. If custom_href is set, use it (highest priority)
    if (item.custom_href) return item.custom_href;

    // 2. No category list? Fallback to the slug
    if (!categoryList || !Array.isArray(categoryList)) return item.href;

    // 3. Try to find the category by SLUG (href)
    const categoryBySlug = categoryList.find(c => c.slug === item.href);
    if (categoryBySlug) return `/${categoryBySlug.slug}/`;

    // 4. SELF-HEALING: If slug doesn't match, fall back to matching by Label/Name
    // This handles cases where the client changed the slug but kept the name.
    const categoryByName = categoryList.find(c => c.name === item.label);
    if (categoryByName) return `/${categoryByName.slug}/`;

    // 5. Final fallback: use the slug as is
    return item.href || "/";
  });

  eleventyConfig.addFilter("moneyPHP", (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return "₱0";
    return `₱${n.toLocaleString("en-PH")}`;
  });

  eleventyConfig.addFilter("concat", (arr, val) => {
    return (Array.isArray(arr) ? arr : []).concat(val);
  });

  eleventyConfig.addFilter("curatorPicks", (products, limit) => {
    const list = Array.isArray(products) ? products : [];
    const picks = list.filter((p) => p.is_curator_pick === true);
    return typeof limit === "number" ? picks.slice(0, limit) : picks;
  });

  eleventyConfig.addFilter("shopProducts", (products) => {
    return (Array.isArray(products) ? products : []).filter(
      (p) => p.show_in_shop !== false
    );
  });

  eleventyConfig.addFilter("devotionalProducts", (products) => {
    return (Array.isArray(products) ? products : []).filter(
      (p) => p.category === "devotional"
    );
  });

  eleventyConfig.addFilter("productsByCategory", (products, category) => {
    return (Array.isArray(products) ? products : []).filter(
      (p) => p.category === category
    );
  });

  eleventyConfig.addFilter("bestSellers", (products) => {
    return (Array.isArray(products) ? products : []).filter(
      (p) => p.is_best_seller === true
    );
  });

  eleventyConfig.addFilter("newArrivals", (products) => {
    return (Array.isArray(products) ? products : []).filter(
      (p) => p.is_new_arrival === true
    );
  });

  eleventyConfig.addFilter("preOrderProducts", (products) => {
    return (Array.isArray(products) ? products : []).filter(
      (p) => p.stock_status === "pre_order"
    );
  });

  eleventyConfig.addFilter("relatedProducts", (products, slugs) => {
    if (!Array.isArray(slugs) || !slugs.length) return [];
    return (Array.isArray(products) ? products : []).filter(
      (p) => slugs.includes(p.slug)
    );
  });

  eleventyConfig.addFilter("productBySlug", (products, slug) => {
    if (!slug || !Array.isArray(products)) return null;
    return products.find((p) => p.slug === slug) || null;
  });

  eleventyConfig.addFilter("markdownToHtml", (text) => {
    if (!text) return "";
    return text
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
  });

  const htmlmin = require("html-minifier-terser");
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
    }
    return content;
  });

  // Rewrite root-relative paths for GitHub Pages subdirectory deploys (idempotent; also fixes srcset, CSS url(), data-image)
  eleventyConfig.addTransform("pathPrefixRewrite", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html") || !pathPrefix || pathPrefix === "/") {
      return content;
    }
    const cleanPrefix = pathPrefix.replace(/\/$/, "");

    function shouldSkip(p) {
      if (!p || p === "#") return true;
      if (p.startsWith("//")) return true;
      if (/^https?:/i.test(p)) return true;
      if (p.startsWith("data:") || p.startsWith("mailto:")) return true;
      if (p.startsWith(cleanPrefix + "/")) return true;
      return false;
    }

    function prefixPath(p) {
      if (!p.startsWith("/")) return p;
      if (shouldSkip(p)) return p;
      return cleanPrefix + p;
    }

    content = content.replace(/\b(href|src|data-image|action)="([^"]*)"/g, (full, attr, val) => {
      if (val === "" || val === "#") return full;
      if (attr === "action" && (/^https?:/i.test(val) || val.startsWith("//"))) return full;
      return `${attr}="${prefixPath(val)}"`;
    });

    content = content.replace(/\bsrcset="([^"]*)"/g, (full, val) => {
      const trimmed = val.trim();
      if (!trimmed) return full;
      const parts = trimmed.split(",").map((chunk) => {
        const t = chunk.trim();
        const sp = t.indexOf(" ");
        if (sp === -1) return prefixPath(t);
        return prefixPath(t.slice(0, sp)) + t.slice(sp);
      });
      return `srcset="${parts.join(", ")}"`;
    });

    content = content.replace(/url\(\s*(\/[^)\s"']+)\s*\)/gi, (full, pathPart) => {
      if (pathPart.startsWith("//")) return full;
      if (shouldSkip(pathPart)) return full;
      return `url(${prefixPath(pathPart)})`;
    });

    return content;
  });

  return {
    pathPrefix: process.env.PATH_PREFIX || "/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    filters: {
      slug: (text) => {
        if (!text) return "";
        return text.toString().toLowerCase()
          .replace(/\s+/g, '-')           // Replace spaces with -
          .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
          .replace(/\-\-+/g, '-')         // Replace multiple - with single -
          .replace(/^-+/, '')              // Trim - from start
          .replace(/-+$/, '');            // Trim - from end
      }
    }
  };
};
