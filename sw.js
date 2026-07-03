// ==========================================================
// UTSAVhq — Service Worker
// ==========================================================
// 🛑 TEMPORARILY DISABLED CACHING (v5)
// App abhi bahut active development mein hai (roz deploy ho
// raha hai) aur cache-first ki wajah se "maine fix kiya but
// purana hi dikh raha hai" wala confusion baar-baar ho raha
// tha — isme real-time sync jaisa core-functionality wala
// fix bhi shaamil hai jo staff ke devices par turant nahi
// pahunch raha tha.
//
// Isliye is version mein fetch handler jaanbujh kar KUCH bhi
// intercept/cache nahi karta — har request seedha network par
// jaati hai, bilkul waise jaise koi Service Worker hi na ho.
// Registration abhi bhi zinda hai (PWA "installable" status ke
// liye), bas caching band hai.
//
// 👉 Jab app stable ho jaaye (frequent deploys band ho jaayein),
// mujhe bol dena — cache-first wapas smartly enable kar dunga.
// ==========================================================
const CACHE_NAME = 'utsavhq-static-v5-passthrough';

self.addEventListener('install', (event) => {
    self.skipWaiting(); // naya (pass-through) SW turant activate ho
});

// ACTIVATE: purane saare cache versions (v1/v3/v4 — jinmein index.html
// cache ho chuka tha) poori tarah saaf kar do, taaki koi bhi stale
// cached copy kahin reh na jaaye.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
            .then(() => self.clients.claim()) // already-open tabs ko turant control mein le lo
    );
});

// FETCH: jaanbujh kar khaali — kuch bhi intercept nahi karna, sab
// kuch seedha normal network request ki tarah jaaye.
self.addEventListener('fetch', (event) => {
    // no-op — respondWith call hi nahi kiya, browser apne aap default
    // (network) behavior follow karega.
});
