// ==========================================================
// UTSAVhq — Service Worker
// Network-First for the APP SHELL (index.html), Cache-First
// for rarely-changing CDN libraries (Firebase SDK, chart.js).
// ==========================================================
// 🐛 CHANGED FROM v3: index.html pehle pure Cache-First tha —
// matlab ek baar cache hone ke baad, naya deploy bhi purana hi
// dikhata rehta tha jab tak CACHE_NAME manually bump na karo.
// Abhi app active development mein hai (baar-baar deploy ho raha
// hai), isliye index.html ko ab NETWORK-FIRST bana diya hai: har
// baar pehle fresh copy ki koshish karta hai, sirf offline hone
// par hi cache se serve karta hai. Isse "maine fix kiya but site
// par purana hi dikh raha hai" wala confusion khatam ho jaata hai.
//
// Firebase SDK / chart.js jaise CDN scripts abhi bhi Cache-First
// hain, kyunki wo rarely change hote hain aur unhe baar-baar
// (large) download karna faltu hai.
//
// ⚠️ Agar future mein app stable ho jaaye aur deploy frequency
// kam ho jaaye, index.html ko bhi wapas Cache-First kiya ja sakta
// hai speed ke liye — abhi correctness zyada zaroori hai.
// ==========================================================
const CACHE_NAME = 'utsavhq-static-v4';

const PRECACHE_URLS = [
    './favicon.png'
];

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                PRECACHE_URLS.map((url) =>
                    cache.add(url).catch((err) => console.warn('[SW] Precache skipped for', url, err))
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
            .then(() => self.clients.claim())
    );
});

// ---------- Helper: rarely-changing CDN libraries — Cache-First ----------
function isCacheFirstAsset(url) {
    if (url.hostname.endsWith('gstatic.com')) return true;   // Firebase SDK CDN
    if (url.hostname.endsWith('jsdelivr.net')) return true;  // chart.js CDN
    if (url.origin === self.location.origin && /\.(png|jpg|jpeg|svg|ico|webp)$/i.test(url.pathname)) return true; // images/icons
    return false;
}

// Firestore / Auth / Storage / Cloudinary — kabhi cache nahi, hamesha seedha network
function isNeverCache(url) {
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
    return neverCacheHosts.includes(url.hostname);
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // writes/POST kabhi intercept mat karo

    let url;
    try { url = new URL(req.url); } catch (e) { return; }
    if (isNeverCache(url)) return; // Firestore/Cloudinary/etc — seedha network

    // 🔴 APP SHELL (HTML navigation) — NETWORK-FIRST
    // Har baar pehle latest index.html laane ki koshish; sirf offline
    // hone par hi last-known cached copy dikhati hai.
    if (req.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname === '/' || url.pathname.endsWith('index.html')))) {
        event.respondWith(
            fetch(req).then((networkResponse) => {
                let copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                return networkResponse;
            }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    // ⚡ CDN libraries / static images — CACHE-FIRST (instant, rarely change)
    if (isCacheFirstAsset(url)) {
        event.respondWith(
            caches.match(req).then((cached) => {
                if (cached) return cached;
                return fetch(req).then((networkResponse) => {
                    if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
                        let copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                    }
                    return networkResponse;
                }).catch(() => cached);
            })
        );
        return;
    }

    // Baaki sab (unknown requests) — chhedo mat, seedha network
});
