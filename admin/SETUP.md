# Decap CMS (`/admin`) — setup

## What was wrong before

`config.yml` used **`backend: proxy`** → `http://localhost:8081`. That only works with **`npx decap-server`** on your PC. On **GitHub Pages**, the browser called your laptop → **fetch failed** and Settings broke.

## Current setup

- **`backend: github`** + **`local_backend: true`**
  - **On localhost** (with `decap-server`): edits go to your local repo.
  - **On the live site**: Decap uses GitHub’s API and needs **OAuth** so you can log in.

## 1. Fix `repo` if needed

In `admin/config.yml`, set:

```yaml
repo: YOUR_GITHUB_USER/YOUR_REPO
branch: main
```

## 2. GitHub OAuth App

GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**

- **Homepage URL:** your real site (e.g. `https://yaaazzcreative.com` or `https://yaaazz.github.io/website/`).
- **Authorization callback URL:** use **one** of these (depends how you authenticate — try A first):

**A — Netlify-hosted OAuth (common with Decap’s defaults)**  
`https://api.netlify.com/auth/done`  
Then follow [Netlify — GitHub auth provider](https://docs.netlify.com/security/oauth-provider-tokens/#setup-an-oauth-provider) so Netlify is allowed to complete the flow. You do **not** have to host the whole site on Netlify; many teams only use Netlify for this OAuth step.

**B — Self-hosted OAuth proxy (good if you use Cloudflare)**  
Deploy something like [decap-proxy (Cloudflare Worker)](https://github.com/sterlingwes/decap-proxy), then in `config.yml` add:

```yaml
backend:
  name: github
  repo: YOUR_USER/YOUR_REPO
  branch: main
  base_url: https://YOUR-WORKER.workers.dev
  auth_endpoint: auth
```

Use the callback URL your proxy README specifies (often `/callback` on that worker).

## 3. Client ID in `admin/index.html`

Paste your OAuth app’s **Client ID** (not the secret):

```html
<meta name="github-client-id" content="Ov23l..."/>
```

Commit and push. Open `/admin/` → you should see **Login with GitHub**. Your GitHub user needs **write** access to the content repo.

## Local editing (no OAuth)

```bash
npm run cms
```

and in another terminal `npm run dev`. Use `http://localhost:8080/admin/` (or the port Eleventy prints).

## Custom domain

If the public URL changes, update the OAuth app **Homepage URL** (and callback, if your provider requires it).
