/**
 * Optional HTTP Basic Auth in front of /admin on your custom domain.
 *
 * Cloudflare → Workers → admin-auth → Settings → Variables:
 *   BASIC_AUTH_USER   (plain text or Secret — your login username, e.g. email)
 *   BASIC_AUTH_PASS   (Secret — your password; supports special characters)
 *   PAGES_ORIGIN      (plain text) — GitHub Pages URL for THIS repo (owner + repo name), no trailing slash
 *                       Example: https://yaaazzcreativeco.github.io/Website
 *
 * Rate limit (5 wrong passwords → wait 10 minutes):
 *   Workers → KV → Create a namespace (e.g. admin-auth-rate-limit)
 *   admin-auth → Settings → Bindings → KV Namespace
 *     Variable name: ADMIN_AUTH_KV  (must match exactly)
 *     KV namespace: (pick the one you created)
 *   Save and deploy. Without this binding, lockout is disabled (auth still works).
 *
 * Session cookie (no Max-Age): cleared when the browser fully quits → custom login again.
 * Note: Browsers may still offer saved Basic Auth passwords; use a private window in cafés
 * or remove saved passwords for your site if you do not want autofill.
 *
 * Route: yaaazzcreative.com/admin/*
 */
const COOKIE_NAME = "admin_gate";
const MAX_PASSWORD_FAILS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;
const KV_TTL_SEC = 20 * 60; // auto-delete KV row after 20 min idle

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const user = env.BASIC_AUTH_USER || "";
    const pass = env.BASIC_AUTH_PASS || "";
    const originBase = (
      env.PAGES_ORIGIN || "https://yaaazzcreativeco.github.io/Website"
    ).replace(/\/$/, "");
    const kv = env.ADMIN_AUTH_KV;
    const ip = clientIp(request);

    if (!user || !pass) {
      return new Response("Configure BASIC_AUTH_USER, BASIC_AUTH_PASS, and PAGES_ORIGIN on this Worker.", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

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

    if (!hasSession && kv) {
      const locked = await checkLockout(kv, ip);
      if (locked) {
        return locked;
      }
    }

    if (!hasSession) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        return unauthorized();
      }
      let decoded = "";
      try {
        decoded = atob(authHeader.slice(6).trim());
      } catch {
        return await recordBadPassword(kv, ip);
      }
      const colon = decoded.indexOf(":");
      const u = colon >= 0 ? decoded.slice(0, colon) : "";
      const p = colon >= 0 ? decoded.slice(colon + 1) : "";
      if (u !== user || p !== pass) {
        return await recordBadPassword(kv, ip);
      }
      await clearRateLimit(kv, ip);
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
    outHeaders.set("Cache-Control", "private, no-store, must-revalidate");

    if (!hasSession) {
      outHeaders.append(
        "Set-Cookie",
        `${COOKIE_NAME}=1; Path=/admin; HttpOnly; Secure; SameSite=Lax`,
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    });
  },
};

function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateKey(ip) {
  return "rl:v1:" + ip.replace(/[^0-9a-fA-F.:]/g, "_");
}

async function checkLockout(kv, ip) {
  if (!kv) {
    return null;
  }
  const raw = await kv.get(rateKey(ip));
  if (!raw) {
    return null;
  }
  const state = JSON.parse(raw);
  if (state.u && Date.now() < state.u) {
    return lockedResponse(state.u);
  }
  return null;
}

async function recordBadPassword(kv, ip) {
  if (!kv) {
    return unauthorized();
  }
  const k = rateKey(ip);
  const raw = await kv.get(k);
  let state = raw ? JSON.parse(raw) : { f: 0, u: 0 };
  if (state.u && Date.now() < state.u) {
    return lockedResponse(state.u);
  }
  const fails = (state.f || 0) + 1;
  if (fails >= MAX_PASSWORD_FAILS) {
    const until = Date.now() + LOCKOUT_MS;
    await kv.put(k, JSON.stringify({ f: 0, u: until }), { expirationTtl: KV_TTL_SEC });
    return lockedResponse(until);
  }
  await kv.put(k, JSON.stringify({ f: fails, u: 0 }), { expirationTtl: KV_TTL_SEC });
  return unauthorized();
}

async function clearRateLimit(kv, ip) {
  if (!kv) {
    return;
  }
  await kv.delete(rateKey(ip));
}

function lockedResponse(untilMs) {
  const retrySec = Math.max(1, Math.ceil((untilMs - Date.now()) / 1000));
  const mins = Math.ceil(retrySec / 60);
  return new Response(
    [
      "Too many wrong passwords for this network connection.",
      "",
      `Wait about ${mins} minute(s), then try again.`,
      "",
      "If you are the owner, double-check BASIC_AUTH_USER and BASIC_AUTH_PASS in Cloudflare.",
    ].join("\n"),
    {
      status: 429,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": String(retrySec),
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Yaaazz Admin"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}
