/**
 * Código principal da página inicial.
 *
 * Regras importantes (o tutorial explica cada uma):
 *  1. Funções usadas em onclick="..." precisam ser colocadas em window.
 *  2. Para buscar um arquivo da pasta docs/, use window.__SM_BASE + '/caminho'.
 *  3. Para falar com o Moodle, use as funções de moodle.js.
 */
import { lerCurso as lerCursoDoMoodle } from './moodle.js';

function log(mensagem) {
    const el = document.getElementById('log');
    el.textContent += `[${new Date().toLocaleTimeString('pt-BR')}] ${mensagem}\n`;
    el.scrollTop = el.scrollHeight;
}

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function lerCurso() {
    const id = document.getElementById('curso-id').value.trim();
    const saida = document.getElementById('resultado');
    if (!/^\d+$/.test(id)) { saida.textContent = 'Digite só o número do curso.'; return; }

    saida.textContent = 'Lendo...';
    log(`Lendo o curso ${id}...`);
    try {
        const curso = await lerCursoDoMoodle(id);
        saida.innerHTML = `<b>${escapar(curso.nome)}</b> — ${curso.recursos.length} recurso(s)<ul>`
            + curso.recursos.slice(0, 20).map(r => `<li>${escapar(r.nome)}</li>`).join('')
            + '</ul>';
        log(`OK: "${curso.nome}", ${curso.recursos.length} recurso(s).`);
    } catch (erro) {
        saida.textContent = 'Erro: ' + erro.message;
        log('Erro: ' + erro.message);
    }
}

async function lerDados() {
    const saida = document.getElementById('dados');
    try {
        // window.__SM_BASE é o endereço da pasta docs/ no servidor (com o token de acesso).
        const resposta = await fetch(window.__SM_BASE + '/dados/exemplo.json');
        const dados = await resposta.json();
        saida.innerHTML = `${escapar(dados.mensagem)}<ul>${dados.itens.map(i => `<li>${escapar(i)}</li>`).join('')}</ul>`;
        log('Dados carregados.');
    } catch (erro) {
        saida.textContent = 'Erro: ' + erro.message;
    }
}

// Regra 1: deixar as funções visíveis para o onclick do HTML
window.lerCurso = lerCurso;
window.lerDados = lerDados;

log('Ferramenta pronta.');
