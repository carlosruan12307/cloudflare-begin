// Cloudflare Worker: só entrega as ferramentas para quem tem uma chave autorizada.
//
// POST /auth            { key }  -> { token, nome, exp }   (chave válida no KV CHAVES)
// GET  /t/<token>/<arq>          -> arquivo de ../docs     (token válido e chave não revogada)
// qualquer outra rota            -> 404
//
// KV CHAVES:     sha256(chave) -> nome da pessoa   (a chave em si nunca é guardada)
// TOKEN_SECRET:  segredo para assinar os tokens (wrangler secret put TOKEN_SECRET)

const enc = new TextEncoder();

function b64url(buf) {
    let s = '';
    for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256(text) {
    return b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}
async function hmac(secret, data) {
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let r = 0;
    for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
}

function corsHeaders(env, req) {
    const origin = req.headers.get('Origin');
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const h = { 'Vary': 'Origin' };
    if (origin && allowed.includes(origin)) {
        h['Access-Control-Allow-Origin'] = origin;
        h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
        h['Access-Control-Allow-Headers'] = 'Content-Type';
        h['Access-Control-Max-Age'] = '86400';
    }
    return h;
}

function json(body, status, extra) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
    });
}

async function lookupKey(env, keyHash) {
    return env.CHAVES.get(keyHash, { cacheTtl: 60 });
}

async function handleAuth(req, env, cors) {
    let key = '';
    try { key = String((await req.json()).key || '').trim(); } catch (_) { /* corpo inválido */ }
    if (!key || key.length > 200) return json({ error: 'chave inválida' }, 401, cors);

    const keyHash = await sha256(key);
    const nome = await lookupKey(env, keyHash);
    if (!nome) return json({ error: 'chave inválida ou revogada' }, 401, cors);

    const ttlH = Number(env.TOKEN_TTL_HOURS) || 8;
    const exp = Math.floor(Date.now() / 1000) + ttlH * 3600;
    const sig = await hmac(env.TOKEN_SECRET, `${keyHash}.${exp}`);
    return json({ token: `${keyHash}.${exp}.${sig}`, nome, exp }, 200, cors);
}

async function verifyToken(token, env) {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [keyHash, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!exp || exp < Date.now() / 1000) return false;
    if (!safeEqual(sig, await hmac(env.TOKEN_SECRET, `${keyHash}.${exp}`))) return false;
    return !!(await lookupKey(env, keyHash));     // chave revogada derruba o token em até ~60 s
}

async function handleFile(req, env, cors, token, filePath) {
    if (!(await verifyToken(token, env))) return new Response('Não autorizado', { status: 401, headers: cors });

    const url = new URL(req.url);
    url.pathname = '/' + filePath;
    url.search = '';
    const res = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
    if (!res.ok) return new Response('Não encontrado', { status: 404, headers: cors });

    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    headers.set('Cache-Control', /\.html$/i.test(filePath) ? 'no-store' : 'private, max-age=600');
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(res.body, { status: res.status, headers });
}

export default {
    async fetch(req, env) {
        const cors = corsHeaders(env, req);
        if (!env.TOKEN_SECRET) return new Response('TOKEN_SECRET não configurado', { status: 500 });
        if (!env.CHAVES) return new Response('KV CHAVES não configurado', { status: 500 });
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

        const { pathname } = new URL(req.url);
        if (pathname === '/auth' && req.method === 'POST') return handleAuth(req, env, cors);

        const m = pathname.match(/^\/t\/([\w-]+\.\d+\.[\w-]+)\/(.+)$/);
        if (m && req.method === 'GET') {
            const filePath = decodeURIComponent(m[2]);
            if (filePath.split('/').includes('..')) return new Response('Inválido', { status: 400 });
            return handleFile(req, env, cors, m[1], filePath);
        }
        return new Response('Não encontrado', { status: 404 });
    },
};
