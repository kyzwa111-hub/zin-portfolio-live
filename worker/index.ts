interface Env {
    ASSETS: { fetch(request: Request): Promise<Response> };
}

const MANUS_BACKEND = "https://zinportfolio-ghrs3ies.manus.space";

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
          const incoming = new URL(request.url);

      // Keep Manus as the source of truth for Telegram approvals and webhook state.
      if (incoming.pathname === "/api" || incoming.pathname.startsWith("/api/")) {
              const target = new URL(incoming.pathname + incoming.search, MANUS_BACKEND);
              const upstream = new Request(target, request);
              const headers = new Headers(upstream.headers);
              headers.set("x-forwarded-host", incoming.host);
              headers.set("x-forwarded-proto", "https");
              headers.set("cache-control", "no-cache, no-store");

            const forwarded = new Request(upstream, { headers });
              const response = await fetch(forwarded);
              const responseHeaders = new Headers(response.headers);
              responseHeaders.set("cache-control", "no-store, private");
              return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: responseHeaders,
              });
      }

      return env.ASSETS.fetch(request);
    },
};
