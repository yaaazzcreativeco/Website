# Yaaazz Creative Co.

Static shop website built with Eleventy, deployed on GitHub Pages.

## Local preview

```bash
npm install
npm run serve
```

Open the URL Eleventy prints (usually `http://localhost:8080`).

## Deploy on GitHub Pages

1. Push this folder to a new **GitHub** repository.
2. Go to **Settings → Pages** in your repo.
3. Under **Source**, select **GitHub Actions**.
4. The `deploy.yml` workflow will automatically build and deploy your site every time you push to `main`.
5. Your site will be live at: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

## Deploy on Netlify (alternative)

1. Push this folder to a new **GitHub** repository.
2. In [admin/config.yml](admin/config.yml), set `repo:` to `your-username/your-repo-name` and the branch you use (`main`).
3. In **Netlify**: New site from Git → pick the repo → build settings are read from [netlify.toml](netlify.toml) (`npm run build`, publish `_site`).
4. Under **Forms**, enable notifications for `checkout` and `contact` so you get emails (optional backup alongside Messenger).

## Facebook Messenger

1. Create or use your **Facebook Page** for the shop.
2. In Meta Business Suite, set a **Page username** (short name).
3. In **Decap** → *Site settings* → *General*, fill **Facebook Page username** (e.g. `YaaazzCo`) **or** paste a full `https://m.me/...` link.
4. Customers use **Copy order summary** on checkout, then **Open Messenger** and paste.

## Decap CMS (`/admin/`)

The admin UI uses the **GitHub** backend on the live site (not the old localhost proxy). See **[admin/SETUP.md](admin/SETUP.md)** for OAuth, `github-client-id` in `admin/index.html`, and local `decap-server` usage.

For a **custom domain** on GitHub Pages + Cloudflare DNS, see **[docs/Custom-domain-GitHub-Cloudflare.md](docs/Custom-domain-GitHub-Cloudflare.md)** (and set GitHub Actions variable `PATH_PREFIX` to `/`).

Products live in `content/products/*.md`. Store settings live in `content/settings/general.json`. Uploaded images go to `static/img/uploads/`.

## Messenger vs Netlify Forms

- **Messenger**: uncapped for day-to-day orders; copy/paste flow described above.
- **Netlify Forms**: optional email backup; free tier has monthly limits depending on your Netlify plan.

## Legacy Stitch exports

Original Google Stitch HTML exports are kept in subfolders (`*_cohesive_brand_update/`). The live site is built from `src/` and `content/`.
