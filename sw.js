// ==========================================================
// UTSAVhq — Service Worker
// Cache-First strategy for STATIC ASSETS ONLY.
// ==========================================================
// ⚠️ IMPORTANT — READ BEFORE YOU DEPLOY A NEW index.html:
// Cache-first means once a file is cached, it is served WITHOUT
// checking the network again. So every time you change index.html
// (or this sw.js file) and re-deploy, you MUST bump the version
// below (v1 -> v2 -> v3 ...). That is what tells the browser
// "throw away the old cache, this is a new app version".
// If you forget this step, users will keep seeing the OLD app
// until they manually clear site data.
// ==========================================================
const CACHE_NAME = 'utsavhq-static-v1';

// App-shell files we know about up front. Everything else
// (Firebase SDK scripts, chart.js, etc.) gets cached the first
// time it's actually requested — see the fetch handler below.
const PRECACHE_URLS = [
    './',
    './index.html',
    './favicon.png'
];

// ---------- INSTALL: pre-cache the app shell ----------
self.addEventListener('install', (event) => {
    self.skipWaiting(); // naya SW turant activate hone ke liye ready ho jaaye
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                PRECACHE_URLS.map((url) =>
                    cache.add(url).catch((err) => {
                        // Ek file precache na ho paaye toh poora install fail nahi hona chahiye
                        console.warn('[SW] Precache skipped for', url, err);
                    })
                )
            );
        })
    );
});

// ---------- ACTIVATE: purane cache versions saaf karo ----------
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim()) // already-open tabs ko bhi turant control mein le lo
    );
});

// ---------- Helper: kaunse requests cache karne hain ----------
// Firestore / Auth / Storage / Cloudinary jaisi DATA/API calls kabhi
// cache NAHI honi chahiye — sirf app shell + rarely-changing CDN assets.
function isCacheableStaticAsset(url) {
    const neverCacheHosts = [
        'firestore.googleapis.com',
        'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com',
        'firebasestorage.googleapis.com',
        'firebaseinstallations.googleapis.com',
        'www.googleapis.com',
        'api.cloudinary.com',
        'res.cloudinary.com'
    ];
    if (neverCacheHosts.includes(url.hostname)) return false;

    if (url.origin === self.location.origin) return true;   // index.html, favicon.png, sw.js khud, etc.
    if (url.hostname.endsWith('gstatic.com')) return true;   // Firebase SDK CDN scripts
    if (url.hostname.endsWith('jsdelivr.net')) return true;  // chart.js CDN

    return false; // baaki sab (unknown third-party) ko chhedo mat — seedha network
}

// ---------- FETCH: Cache-First for static assets ----------
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // writes/POST ko kabhi intercept mat karo

    let url;
    try { url = new URL(req.url); } catch (e) { return; }
    if (!isCacheableStaticAsset(url)) return; // Firestore/Cloudinary/etc — seedha network se jaane do

    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached; // ⚡ instant — cache mein mil gaya, network round-trip hi nahi

            return fetch(req).then((networkResponse) => {
                // Sirf theek response hi cache karo (opaque = cross-origin no-cors, wo bhi valid hai)
                if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
                    let copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                }
                return networkResponse;
            }).catch(() => {
                // Offline ho aur ye specific file kabhi cache hi nahi hui —
                // page navigation ke liye app-shell dikhane ki koshish karo.
                if (req.mode === 'navigate') return caches.match('./index.html');
                return Response.error();
            });
        })
    );
});
