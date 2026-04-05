/**
 * Optional HTTP Basic Auth in front of /admin on your custom domain.
 *
 * Cloudflare → Workers → admin-auth → Settings → Variables:
 *   BASIC_AUTH_USER   (plain text or Secret — your login username, e.g. email)
 *   BASIC_AUTH_PASS   (Secret — your password; supports special characters)
 *   PAGES_ORIGIN      (plain text) — GitHub Pages URL for THIS repo (owner + repo name), no trailing slash
 *                       Must match: GitHub repo Settings → Pages → site address, e.g.
 *                       https://yaaazzcreativeco.github.io/Website
 *
 * Route (Triggers): yaaazzcreative.com/admin/*
 *
 * The default *.workers.dev hostname is automatic; you do not need to remove it.
 * Decap still needs GitHub OAuth (decap-proxy Worker) after this gate.
 */
const COOKIE_NAME = "admin_gate";
const COOKIE_MAX_AGE = 86400; // 24h

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const user = env.BASIC_AUTH_USER || "";
    const pass = env.BASIC_AUTH_PASS || "";
    const originBase = (
      env.PAGES_ORIGIN || "https://yaaazzcreativeco.github.io/Website"
    ).replace(/\/$/, "");

    if (!user || !pass) {
      return new Response("Configure BASIC_AUTH_USER, BASIC_AUTH_PASS, and PAGES_ORIGIN on this Worker.", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Custom domain here causes 404 or loops — the Worker must pull files from GitHub’s *.github.io address.
    const pagesOrigin = env.PAGES_ORIGIN || "";
    if (pagesOrigin && !/github\.io/i.test(pagesOrigin)) {
      return new Response(
        [
          "PAGES_ORIGIN is wrong.",
          "",
          "Do not use your custom domain (yaaazzcreative.com) here.",
          "Use your GitHub Pages project URL, with no slash at the end, for example:",
          "https://yaaazzcreativeco.github.io/Website",
          "(Use YOUR GitHub username and YOUR repo name from github.com/yourname/yourrepo)",
          "",
          "Fix it in Cloudflare → Workers → admin-auth → Settings → Variables → PAGES_ORIGIN.",
        ].join("\n"),
        { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }

    const cookieHeader = request.headers.get("Cookie") || "";
    const hasSession = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=1(?:;|$)`).test(cookieHeader);

    if (!hasSession) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        return unauthorized();
      }
      let decoded = "";
      try {
        decoded = atob(authHeader.slice(6).trim());
      } catch {
        return unauthorized();
      }
      const colon = decoded.indexOf(":");
      const u = colon >= 0 ? decoded.slice(0, colon) : "";
      const p = colon >= 0 ? decoded.slice(colon + 1) : "";
      if (u !== user || p !== pass) {
        return unauthorized();
      }
    }

    const originUrl = `${originBase}${url.pathname}${url.search}`;
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.delete("Authorization");
    forwardHeaders.delete("Host");
    forwardHeaders.delete("Cookie");

    const init = {
      method: request.method,
      headers: forwardHeaders,
      redirect: "follow",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }
    let originRequest = new Request(originUrl, init);

    let response = await fetch(originRequest);

    // GitHub Pages may 404 on /admin/ but serve /admin/index.html
    const pathNoTrailing = url.pathname.replace(/\/+$/, "") || "/";
    if (response.status === 404 && pathNoTrailing === "/admin") {
      const indexUrl = `${originBase}/admin/index.html${url.search}`;
      const second = await fetch(new Request(indexUrl, init));
      if (second.status !== 404) {
        response = second;
      }
    }

    if (response.status === 404) {
      const tried = [originUrl];
      if (pathNoTrailing === "/admin") {
        tried.push(`${originBase}/admin/index.html`);
      }
      return new Response(
        [
          "The admin page could not be loaded from GitHub Pages (404).",
          "",
          "We tried:",
          ...tried.map((u) => "  • " + u),
          "",
          "Fix: Cloudflare → admin-auth → Variables → PAGES_ORIGIN",
          "Set it to: https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME",
          "Example for this project: https://yaaazzcreativeco.github.io/Website",
          "Check: GitHub → your repository → Settings → Pages.",
        ].join("\n"),
        { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }

    const outHeaders = new Headers(response.headers);
    outHeaders.delete("content-security-policy");

    if (!hasSession) {
      outHeaders.append(
        "Set-Cookie",
        `${COOKIE_NAME}=1; Path=/admin; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    });
  },
};

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Yaaazz Admin"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
