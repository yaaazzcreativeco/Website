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

A second Worker on `yaaazzcreative.com/admin/*` adds the **browser** username/password dialog (the small “Sign in to yaaazzcreative.com” window). It does **not** replace GitHub OAuth — after this gate, Decap still uses **Login with GitHub**.

### Why email/password “did not work” before

If the Worker compared a **precomputed Base64** string to `Authorization: Basic …`, any typo, wrong encoder, or special character in the password breaks the match. **Do not** hard-code Base64 in the Worker.

Use **`admin/cloudflare-admin-basic-auth.worker.js`**: credentials come from **Worker variables** (see below).

### Cloudflare → `admin-auth` Worker

1. **Edit code** — paste the full contents of **`admin/cloudflare-admin-basic-auth.worker.js`**.
2. **Settings → Variables** add:

| Name | Type | Example |
|------|------|--------|
| `BASIC_AUTH_USER` | Variable or Secret | Your login name (e.g. full email) |
| `BASIC_AUTH_PASS` | **Secret** | Same password you want the dialog to accept |
| `PAGES_ORIGIN` | Variable | Your **GitHub Pages** address (no trailing slash). **Do not** use your custom domain. Find it: GitHub → your repo → **Settings** → **Pages** (or open `https://YOUR_USER.github.io/YOUR_REPO/` in a browser). This project’s remote is `yaaazzcreativeco/Website`, so the value is **`https://yaaazzcreativeco.github.io/Website`**. Wrong user or repo name → **404** after login. |

3. **Save and deploy.**

The Worker sets a **session cookie** after the first successful Basic Auth so you are not prompted again while the browser stays open. When you **fully quit the browser** and come back, the cookie is gone and the custom login asks again. (This does not log you out of GitHub.)

### Wrong-password lockout (5 tries → wait 10 minutes)

1. Cloudflare dashboard → **Workers & Pages** → **KV** → **Create a namespace** (name e.g. `admin-auth-rate-limit`).
2. Open your **`admin-auth`** Worker → **Settings** → **Bindings** → **Add binding** → **KV Namespace**.
3. **Variable name** must be exactly: **`ADMIN_AUTH_KV`**  
4. **KV namespace**: choose the namespace you created → **Save** → redeploy the Worker (paste the latest `cloudflare-admin-basic-auth.worker.js` if needed).

After **5 wrong** username/password attempts from the **same internet connection** (same public IP), the Worker returns **429** and asks to wait **about 10 minutes** before trying again. Successful login **clears** the counter.

**Café / shared Wi‑Fi:** everyone on that Wi‑Fi usually shares **one public IP**, so lockout applies to **that network**, not only one PC. **Autofill:** the browser may still offer a **saved** Basic Auth password; the Worker cannot turn that off. For untrusted PCs, use a **private window** and avoid saving the password when the browser asks.

### Routes: what to keep or remove

| Entry | What it is | Action |
|--------|------------|--------|
| **Route** `yaaazzcreative.com/admin/*` | Puts the password wall on your real admin URL | **Keep** if you want the wall. **Delete this route only** if you want to remove the wall entirely. |
| **`admin-auth.yaaazz-creativeco.workers.dev`** | Default `workers.dev` URL for that Worker | **Ignore.** Cloudflare always shows it; it does not add a second password prompt on your domain. You cannot “clean” it without deleting the whole Worker. |

**Do not** delete the **`decap-proxy`** Worker or its secrets — that one finishes GitHub login for Decap.

### Cloudflare: “old client secrets” (OAuth)

Cloudflare **never shows** past values of a secret after you save them. There is **no list of old secrets** to compare.

- For **`GITHUB_OAUTH_SECRET`** on **`decap-proxy`**: you only ever have **one stored value** per name. Updating it **replaces** the previous value.
- **GitHub** → your OAuth App → **Client secrets**: here you may see **more than one** row if you clicked “Generate new client secret” several times. **Remove** any secret you are **not** using (keep the one whose value you last pasted into Cloudflare). If you are unsure, generate **one new** secret in GitHub, paste it into Cloudflare as `GITHUB_OAUTH_SECRET`, deploy, then **delete all other** client secrets on that OAuth app so only the new one remains.

I cannot see your GitHub screen, so I cannot name an exact secret “ID” to delete — only you can see the list under **Developer settings → OAuth Apps → your app → Client secrets**.

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
