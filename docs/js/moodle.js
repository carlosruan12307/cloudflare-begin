/**
 * Funções para conversar com o Moodle.
 *
 * Como a ferramenta roda DENTRO do Moodle (graças ao carregador), o navegador
 * envia o login da pessoa automaticamente em cada fetch. Não é preciso senha
 * nem token do Moodle.
 */

// Caminho onde o Moodle está instalado. Na Unifor é /ava.
// Se o seu Moodle fica na raiz do site, use ''.
export const MOODLE_PATH = '/ava';

// Endereço completo do Moodle, ex.: https://ead.unifor.br/ava
export const MOODLE = window.location.origin + MOODLE_PATH;

/** Baixa uma página do Moodle e devolve o HTML já "lido" (um Document). */
export async function buscarPagina(caminho) {
    const resposta = await fetch(MOODLE + caminho, { credentials: 'include' });
    if (!resposta.ok) throw new Error(`O Moodle respondeu ${resposta.status}`);
    const html = await resposta.text();
    return new DOMParser().parseFromString(html, 'text/html');
}

/** Lê o nome de um curso e a lista de recursos/atividades dele. */
export async function lerCurso(cursoId) {
    const doc = await buscarPagina(`/course/view.php?id=${encodeURIComponent(cursoId)}`);

    if (doc.querySelector('#login, form#login')) {
        throw new Error('O Moodle pediu login. Entre no Moodle e tente de novo.');
    }

    const nome = doc.querySelector('.page-header-headings h1, header h1, h1')?.textContent.trim()
        || doc.title;

    const recursos = [...doc.querySelectorAll('li.activity')].map(li => ({
        nome: li.querySelector('.instancename')?.childNodes[0]?.textContent.trim()
            || li.querySelector('a')?.textContent.trim() || '(sem nome)',
        link: li.querySelector('a')?.href || '',
    }));

    return { nome, recursos };
}
