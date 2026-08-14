// Winnn service worker.
//
// HARD RULE: every branch of respondWith() must resolve to a real Response.
// caches.match() resolves to undefined on a miss, and respondWith(undefined)
// throws "Failed to fetch" and breaks the navigation entirely. v2 shipped that
// bug; the synthesized fallback below is what prevents it.
//
// Auth traffic is never touched. A cached login page or a replayed auth
// request will sign the wrong person in or serve a stale nonce.

var CACHE = "winnn-shell-v3";
var SHELL = ["/offline.html", "/manifest.webmanifest", "/icon-192.png"];

var BYPASS = ["/login", "/auth", "/api", "/_next/webpack-hmr"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .catch(function () { /* a failed precache must not block activation */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) { return k === CACHE ? null : caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

function offlineResponse() {
  return caches.match("/offline.html").then(function (hit) {
    if (hit) return hit;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Offline</title>" +
        "<body style=\"font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f8f9fa;color:#191c1d\">" +
        "<div style=\"text-align:center\"><h1>Offline</h1><p>Reconnect to continue.</p></div>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  for (var i = 0; i < BYPASS.length; i++) {
    if (url.pathname.indexOf(BYPASS[i]) === 0) return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(function () { return offlineResponse(); })
    );
    return;
  }

  e.respondWith(
    caches
      .match(req)
      .then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && res.status === 200 && res.type === "basic") {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
          }
          return res;
        });
      })
      .catch(function () {
        return new Response("", { status: 504, statusText: "Offline" });
      })
  );
});
