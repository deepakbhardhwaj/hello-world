// ================================================================
// Cloudflare Pages Function — Nexa AI Proxy
// Path in your repo MUST be: /functions/api/nexa-chat.js
// This runs on Cloudflare's servers, never in the user's browser.
// The Gemini API key lives only in Cloudflare's encrypted
// environment variable (GEMINI_API_KEY) — it is never sent to
// the browser and never appears in your GitHub code.
// ================================================================

const GEMINI_MODEL = 'gemini-2.0-flash';

export async function onRequestPost(context) {
    const { request, env } = context;

    if (!env.GEMINI_API_KEY) {
        return new Response(
            JSON.stringify({ error: { message: 'Server misconfigured: GEMINI_API_KEY secret not set in Cloudflare Pages settings.' } }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: { message: 'Invalid JSON body' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    try {
        const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await geminiRes.json();
        return new Response(JSON.stringify(data), {
            status: geminiRes.status,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: { message: 'Upstream error: ' + e.message } }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
}

// Handles CORS preflight — harmless to keep even for same-origin calls
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
