/**
 * Decap CMS GitHub OAuth proxy for Cloudflare Workers.
 *
 * Must match the handshake Decap expects (see decap-cms-lib-auth NetlifyAuthenticator):
 * 1) Popup sends:  postMessage("authorizing:github", "*")
 * 2) Parent echoes the same string back to the popup
 * 3) Popup sends: postMessage("authorization:github:success:" + JSON.stringify({ token }), "*")
 *
 * Do NOT put GITHUB_OAUTH_SECRET in this file. In Cloudflare:
 * Workers → your proxy → Settings → Variables → add secrets:
 *   GITHUB_OAUTH_ID     (or use plain text variable)
 *   GITHUB_OAUTH_SECRET (type: Secret)
 *
 * Optional: GITHUB_REPO_PRIVATE = "1" if the repo is private (uses repo scope).
 *
 * GitHub OAuth App (when using THIS worker as base_url):
 *   Homepage URL:            https://YOUR-WORKER.workers.dev
 *   Authorization callback:  https://YOUR-WORKER.workers.dev/callback?provider=github
 *
 * admin/config.yml:
 *   base_url: https://YOUR-WORKER.workers.dev
 *   auth_endpoint: auth
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientId = env.GITHUB_OAUTH_ID;
    const clientSecret = env.GITHUB_OAUTH_SECRET;

    if (!clientId || !clientSecret) {
      return new Response("Missing GITHUB_OAUTH_ID or GITHUB_OAUTH_SECRET worker bindings.", {
        status: 500,
      });
    }

    if (url.pathname === "/auth") {
      const provider = url.searchParams.get("provider");
      if (provider !== "github") {
        return new Response("Invalid provider", { status: 400 });
      }

      const repoPrivate = env.GITHUB_REPO_PRIVATE === "1" || env.GITHUB_REPO_PRIVATE === "true";
      const scope = repoPrivate ? "repo,user" : "public_repo,user";
      const redirectUri = `https://${url.hostname}/callback?provider=github`;
      const state = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

      const gh = new URL("https://github.com/login/oauth/authorize");
      gh.searchParams.set("client_id", clientId);
      gh.searchParams.set("redirect_uri", redirectUri);
      gh.searchParams.set("scope", scope);
      gh.searchParams.set("state", state);

      return Response.redirect(gh.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const provider = url.searchParams.get("provider");
      if (provider !== "github") {
        return new Response("Invalid provider", { status: 400 });
      }

      const err = url.searchParams.get("error");
      if (err) {
        return new Response(`OAuth error: ${err}`, { status: 400 });
      }

      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing code", { status: 400 });
      }

      const redirectUri = `https://${url.hostname}/callback?provider=github`;
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) {
        return new Response(`Token exchange failed: ${JSON.stringify(tokenJson)}`, { status: 400 });
      }

      const token = tokenJson.access_token;
      const payload = JSON.stringify({ token });
      const html =
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Authorizing…</title></head><body>" +
        "<p>Authorizing Decap…</p>" +
        "<scr" +
        "ipt>" +
        "(function(){" +
        "var p=" +
        payload +
        ";" +
        "var receiveMessage=function(){" +
        "if(window.opener){window.opener.postMessage(\"authorization:github:success:\"+JSON.stringify(p),\"*\");}" +
        "window.removeEventListener(\"message\",receiveMessage,false);" +
        "};" +
        "window.addEventListener(\"message\",receiveMessage,false);" +
        "if(window.opener){window.opener.postMessage(\"authorizing:github\",\"*\");}" +
        "})();" +
        "</scr" +
        "ipt></body></html>";

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Hello 👋 — Decap OAuth proxy", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
