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

## 2. Choose how GitHub OAuth is completed

Decap’s “Login with GitHub” does **not** use your email/password for the CMS by itself. It opens GitHub so GitHub can issue an API token. You still need a **working OAuth flow** (Netlify **or** a proxy).

### A — Netlify-hosted OAuth

`https://api.netlify.com/auth/done` as the OAuth callback, plus Netlify’s GitHub provider setup. Works even if the site is not hosted on Netlify, **as long as** your Netlify account can use OAuth (not paused / over limits).

### B — Cloudflare Worker proxy (recommended if Netlify is unavailable)

Use the official flow from [sterlingwes/decap-proxy](https://github.com/sterlingwes/decap-proxy) — or paste **`admin/cloudflare-decap-proxy.worker.js`** into your Worker in the Cloudflare dashboard.

**Why custom “hash redirect” / wrong `postMessage` breaks login:** Decap’s client only accepts messages in this exact sequence (see `decap-cms-lib-auth`):

1. Popup (your Worker origin) sends the string **`authorizing:github`** to the opener.
2. Decap echoes that same string back to the popup.
3. Popup sends **`authorization:github:success:`** + `JSON.stringify({ token })` (a **string**, not a JSON object as `postMessage` data).

If you skip the handshake or use the wrong string, Decap stays on the login screen even though GitHub returned a token.

**GitHub OAuth App when `base_url` is your Worker** (per decap-proxy README):

| Field | Value |
|--------|--------|
| **Homepage URL** | `https://YOUR-WORKER.workers.dev` (the proxy URL, not the marketing site) |
| **Authorization callback URL** | `https://YOUR-WORKER.workers.dev/callback?provider=github` (must include `?provider=github`) |

**Cloudflare Worker secrets** (do **not** commit the client secret to git):

- `GITHUB_OAUTH_ID` — OAuth App Client ID  
- `GITHUB_OAUTH_SECRET` — OAuth App Client Secret (**Secret** type in Cloudflare)  
- Optional: `GITHUB_REPO_PRIVATE` = `1` if the repo is **private** (uses `repo` scope; public repos use `public_repo,user`)

**`admin/config.yml`:**

```yaml
backend:
  name: github
  repo: YOUR_USER/YOUR_REPO
  branch: main
  base_url: https://YOUR-WORKER.workers.dev
  auth_endpoint: auth
```

Decap opens: `https://YOUR-WORKER.workers.dev/auth?provider=github&site_id=YOUR_DOMAIN&scope=repo` — your Worker’s `/auth` handler must accept `provider=github` (the reference file does).

## 3. Client ID in `admin/index.html`

Keep the **Client ID** meta tag (Decap still expects it for the GitHub backend UI):

```html
<meta name="github-client-id" content="Ov23l..."/>
```

Commit and push. Your GitHub user needs **write** access to the content repo.

## 4. Optional: Basic Auth on `/admin` (Cloudflare route)

A second Worker on `yaaazzcreative.com/admin/*` only adds a **browser** username/password gate. It does **not** replace GitHub OAuth — Decap still needs a token to talk to GitHub.

If you proxy to GitHub Pages from that Worker, use the **repository** Pages URL so paths match your project (example for repo `website` under user `yaaazz`):

`https://yaaazz.github.io/website` + `request` path + query

Using only `https://yaaazz.github.io` (no repo segment) will 404 for project sites.

Use **HttpOnly session cookies** after the first Basic Auth success so the OAuth return does not ask for Basic Auth twice.

## Local editing (no OAuth)

```bash
npm run cms
```

and in another terminal `npm run dev`. Use `http://localhost:8080/admin/` (or the port Eleventy prints).

## Custom domain

If the public URL changes, update anything that still points at the old host. For **Worker-based OAuth**, the GitHub OAuth App **Homepage** and **callback** stay on the **Worker URL**, not the custom domain.

## GitHub “does not support password sign-in” in the OAuth popup

That message is from **GitHub**, not Decap. Accounts using **passkeys / SSO / certain security settings** may not use a classic password in that flow. Options: sign in to GitHub in the same browser profile first, use a GitHub session that supports the prompt, or use **Cloudflare Access** in front of `/admin` and keep GitHub OAuth for API access only.

## If a client secret was ever pasted into chat or committed

**Rotate** it: GitHub → OAuth App → generate a new client secret, update Cloudflare Worker secrets, and remove any copy from git history if it was committed.
