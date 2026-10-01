// Prepara a pasta docs/ para publicação.
//
//   docs/       → o SEU código (HTML, CSS, JS). É aqui que você trabalha.
//   .publicar/  → cópia gerada a partir de docs/, com o JavaScript ofuscado.
//                 É esta pasta que vai para a Cloudflare. Não edite.
//   moodle/     → o arquivo que você envia ao Moodle (o "carregador").
//
// Uso: npm run build   (o npm run deploy já chama o build)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JavaScriptObfuscator from 'javascript-obfuscator';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const SRC = path.join(ROOT, 'docs');
const OUT = path.join(ROOT, '.publicar');
const SERVER_URL = String(cfg.serverUrl || '').replace(/\/+$/, '');
const VERSION = Date.now().toString(36);
const OFUSCAR = cfg.ofuscar !== false;

const posix = path.posix;
const toPosix = p => p.split(path.sep).join('/');

const obfuscate = code => !OFUSCAR ? code : JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.3,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,          // mantém as funções usadas em onclick="..."
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    target: 'browser',
}).getObfuscatedCode();

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out); else out.push(p);
    }
    return out;
}

const isExternal = v => /^(https?:|\/\/|#|data:|mailto:|javascript:|%%)/i.test(v);
const routeOf = rel => rel === 'index.html' ? 'index' : rel.replace(/\/index\.html$/, '');

if (!fs.existsSync(path.join(SRC, 'index.html'))) {
    console.error('Erro: docs/index.html não existe. Ela é a página inicial da sua ferramenta.');
    process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
let nJs = 0, nHtml = 0;

for (const file of walk(SRC)) {
    const rel = toPosix(path.relative(SRC, file));
    const dir = posix.dirname(rel) === '.' ? '' : posix.dirname(rel);
    const outFile = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });

    if (rel.endsWith('.js')) {
        fs.writeFileSync(outFile, obfuscate(fs.readFileSync(file, 'utf8')));
        nJs++;
        continue;
    }
    if (!rel.endsWith('.html')) { fs.copyFileSync(file, outFile); continue; }

    nHtml++;
    let html = fs.readFileSync(file, 'utf8');
    const resolve = v => posix.normalize(posix.join(dir || '.', v));

    // 1. Scripts escritos dentro do HTML
    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, body) => {
        if (/\bsrc\s*=/.test(attrs) || !body.trim()) return full;
        const type = attrs.match(/type\s*=\s*["']([^"']+)["']/i)?.[1];
        if (type === 'module') {
            // imports relativos precisam virar endereço completo do servidor
            body = body.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.{1,2}\/[^"']+)\2/g,
                (m, pre, q, spec) => `${pre}${q}%%BASE%%/${resolve(spec)}${q}`);
            return `<script${attrs}>${obfuscate(body)}</script>`;
        }
        if (!type || /javascript/i.test(type)) return `<script${attrs}>${obfuscate(body)}</script>`;
        return full;
    });

    // 2. Links entre páginas (<a href="sobre.html">) viram rotas do carregador (#sobre.html)
    html = html.replace(/(<a\b[^>]*?\bhref\s*=\s*)(["'])([^"']*)\2/gi, (full, pre, q, val) => {
        if (isExternal(val)) return full;
        const [p, hash] = val.split('#');
        const isDir = p === '' || p.endsWith('/');
        if (!isDir && !/\.html$/i.test(p)) return full;
        let target = resolve(p || '.');
        if (isDir) target = posix.join(target, 'index.html');
        return `${pre}${q}#${routeOf(target.replace(/^\.\//, ''))}${hash ? '&' + hash : ''}${q}`;
    });

    // 3. Demais caminhos relativos (css, js, imagens) → endereço completo do servidor
    html = html.replace(/<(script|link|img|source|video|audio|iframe|embed|a)\b[^>]*>/gi, tag =>
        tag.replace(/\b(src|href)\s*=\s*(["'])([^"']*)\2/gi, (full, attr, q, val) => {
            if (!val || isExternal(val)) return full;
            const v = /\.(css|js)$/i.test(val) ? `?v=${VERSION}` : '';
            return `${attr}=${q}%%BASE%%/${encodeURI(resolve(val))}${v}${q}`;
        }));

    fs.writeFileSync(outFile, html);
}

// Carregador que vai para o Moodle
fs.mkdirSync(path.join(ROOT, 'moodle'), { recursive: true });
const tpl = fs.readFileSync(path.join(ROOT, 'loader.template.html'), 'utf8');
fs.writeFileSync(path.join(ROOT, 'moodle', 'carregador.html'), tpl.replace('%%SERVER_URL%%', JSON.stringify(SERVER_URL)));

console.log(`OK: ${nHtml} página(s), ${nJs} arquivo(s) JS ${OFUSCAR ? 'ofuscado(s)' : '(sem ofuscação)'}.`);
console.log('Arquivo para o Moodle: moodle/carregador.html');
if (/SEU-SUBDOMINIO/.test(SERVER_URL)) console.warn('ATENÇÃO: coloque o endereço do seu Worker em "serverUrl" no config.json e rode de novo.');
