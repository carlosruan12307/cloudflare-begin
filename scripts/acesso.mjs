// Gerencia quem pode acessar as ferramentas.
//
//   npm run acesso -- liberar "Nome da Pessoa"   cria uma chave e autoriza
//   npm run acesso -- revogar "Nome da Pessoa"   remove o acesso
//   npm run acesso -- listar                     mostra quem tem acesso
//
// A chave é mostrada só uma vez; envie-a para a pessoa por um canal privado.
// O Cloudflare guarda apenas o hash da chave. O arquivo local acessos.json
// (fora do git) guarda nome -> hash para você conseguir revogar depois.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB = path.join(ROOT, 'acessos.json');
const LOCAL = process.argv.includes('--local');      // para testes com wrangler dev
const [cmd, ...rest] = process.argv.slice(2).filter(a => a !== '--local');
const nome = rest.join(' ').trim();

const load = () => (fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : {});
const save = db => fs.writeFileSync(DB, JSON.stringify(db, null, 2));
const hashOf = key => crypto.createHash('sha256').update(key).digest('base64url');

function wrangler(...args) {
    const bin = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
    execFileSync(process.execPath, [bin, 'kv', 'key', ...args, '--binding=CHAVES', LOCAL ? '--local' : '--remote'],
        { cwd: ROOT, stdio: 'inherit' });
}

const db = load();
if (cmd === 'liberar' && nome) {
    if (db[nome]) { console.error(`"${nome}" já tem acesso. Revogue antes para gerar outra chave.`); process.exit(1); }
    const key = crypto.randomBytes(18).toString('base64url');
    const hash = hashOf(key);
    wrangler('put', hash, nome);
    db[nome] = { hash, criadoEm: new Date().toISOString() };
    save(db);
    console.log(`\nAcesso liberado para "${nome}".\nChave (envie só para essa pessoa): ${key}\n`);
} else if (cmd === 'revogar' && nome) {
    if (!db[nome]) { console.error(`"${nome}" não está em acessos.json.`); process.exit(1); }
    wrangler('delete', db[nome].hash);
    delete db[nome];
    save(db);
    console.log(`\nAcesso de "${nome}" revogado (vale em até 1 minuto).\n`);
} else if (cmd === 'listar') {
    const nomes = Object.keys(db);
    console.log(nomes.length ? nomes.map(n => `- ${n} (desde ${db[n].criadoEm.slice(0, 10)})`).join('\n') : 'Ninguém tem acesso ainda.');
} else {
    console.log('Uso:\n  npm run acesso -- liberar "Nome"\n  npm run acesso -- revogar "Nome"\n  npm run acesso -- listar');
}
