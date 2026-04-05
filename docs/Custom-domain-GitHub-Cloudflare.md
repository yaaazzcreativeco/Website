# Custom domain on GitHub Pages (DNS on Cloudflare)

Use this when your site is built with this repo’s **GitHub Actions** workflow and you own a domain (e.g. `yaaazzcreative.com`) on **Cloudflare**.

## 1. GitHub repository

1. Open the repo on GitHub → **Settings → Pages**.
2. Under **Custom domain**, enter:
   - **Apex:** `yaaazzcreative.com`, or  
   - **WWW:** `www.yaaazzcreative.com` (pick one primary; you can redirect the other later).
3. Save. GitHub will show the **DNS records** it expects (usually **A** records to GitHub IPs and/or a **CNAME** for `www`).

Enable **Enforce HTTPS** after DNS validates.

## 2. Cloudflare DNS

In **Cloudflare → your domain → DNS → Records**:

- For **apex** (`yaaazzcreative.com`), add the **A** records GitHub lists (often four IPs, see [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)).
- For **www**, a **CNAME** from `www` to `YOURUSER.github.io` (or the target GitHub shows).

**Proxy status:** Orange cloud (proxied) is OK; if SSL errors appear, set SSL/TLS mode to **Full** (or **Full (strict)** once origin is valid).

Remove old **A/CNAME** rows that pointed to Netlify or other hosts.

## 3. Build path (`PATH_PREFIX`)

When the site is served at the **domain root** (`https://yaaazzcreative.com/`), asset URLs must **not** use `/repo-name/`.

In GitHub: **Settings → Secrets and variables → Actions → Variables** → add:

| Name          | Value |
|---------------|--------|
| `PATH_PREFIX` | `/`    |

Redeploy (push to `main` or re-run the workflow). Without this, links and images may still target `/website/...` and break.

## 4. Optional: `CNAME` in the repo

GitHub may add a `CNAME` file automatically. If you use the **www** subdomain as canonical, ensure the file contains `www.yaaazzcreative.com` (or your chosen host) and is committed on the branch that builds Pages.

## 5. Checklist

- [ ] DNS propagates (can take up to 48 hours; often minutes on Cloudflare).
- [ ] GitHub Pages shows “DNS check successful”.
- [ ] `PATH_PREFIX` is `/` for apex/www custom domain.
- [ ] Decap OAuth app **Homepage URL** updated to the new domain (see `admin/SETUP.md`).
- [ ] FormSubmit / Tawk / other third-party allowed origins updated if they whitelist domains.
