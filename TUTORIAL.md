# Tutorial: sua ferramenta no Moodle, protegida pela Cloudflare

Este tutorial é para quem **nunca** fez isso. Siga na ordem. No fim você terá:

- uma ferramenta (HTML, CSS e JavaScript) que abre **dentro do Moodle**;
- o código guardado na Cloudflare, **ofuscado** e longe dos curiosos;
- uma **chave de acesso** pessoal para cada pessoa autorizada, que você pode cancelar quando quiser;
- tudo de graça.

O projeto já vem com um exemplo que funciona. Primeiro você publica o exemplo.
Depois troca pelo seu código.

---

## Sumário

1. [A ideia em uma imagem](#1-a-ideia-em-uma-imagem)
2. [Palavras que você vai ver](#2-palavras-que-você-vai-ver)
3. [O que você precisa ter](#3-o-que-você-precisa-ter)
4. [Conhecendo as pastas](#4-conhecendo-as-pastas)
5. [Parte 1: preparar o computador](#5-parte-1-preparar-o-computador)
6. [Parte 2: configurar a Cloudflare](#6-parte-2-configurar-a-cloudflare)
7. [Parte 3: criar a sua chave de acesso](#7-parte-3-criar-a-sua-chave-de-acesso)
8. [Parte 4: colocar no Moodle](#8-parte-4-colocar-no-moodle)
9. [Parte 5: colocar o SEU código](#9-parte-5-colocar-o-seu-código)
10. [Como funciona por dentro](#10-como-funciona-por-dentro)
11. [Dar e tirar acesso](#11-dar-e-tirar-acesso)
12. [Problemas comuns](#12-problemas-comuns)
13. [Resumo dos comandos](#13-resumo-dos-comandos)

---

## 1. A ideia em uma imagem

```
   SEU COMPUTADOR                 CLOUDFLARE (grátis)               MOODLE
   ──────────────                 ───────────────────               ──────
   pasta docs/                    Worker = "porteiro"               carregador.html
   (seu código)                   ┌─────────────────┐               (arquivo pequeno)
        │                         │ confere a chave │                     │
        │  npm run deploy         │ entrega o código│ ◀── pede o código ──┤
        └───────────────────────▶ │ só para quem    │                     │
          (ofusca e envia)        │ tem permissão   │ ── código ────────▶ │
                                  └─────────────────┘                     ▼
                                                              a ferramenta aparece
                                                              dentro do Moodle
```

Em palavras:

1. Você escreve a ferramenta na pasta `docs/`.
2. Um comando embaralha o código (ofuscação) e envia para a Cloudflare.
3. No Moodle fica só um arquivo pequeno, o **carregador**.
4. Quando alguém abre o carregador, ele pede a chave de acesso, confere na
   Cloudflare e, se estiver tudo certo, mostra a ferramenta ali dentro do Moodle.

### Por que não colocar o código direto no Moodle?

Daria para enviar os arquivos ao Moodle, mas qualquer pessoa com acesso ao
curso poderia abrir, ler e copiar o código. Aqui o código fica na Cloudflare,
embaralhado, e só sai para quem tem chave.

### Por que a ferramenta precisa aparecer *dentro* do Moodle?

Para a ferramenta conseguir ler e alterar coisas no Moodle usando o login da
pessoa. O navegador só permite isso para páginas abertas no mesmo endereço do
Moodle (`ead.unifor.br`). O carregador resolve isso: ele está no Moodle e
desenha a ferramenta ali.

---

## 2. Palavras que você vai ver

| Palavra | Explicação simples |
|---|---|
| **Terminal** | Janela onde você digita comandos. No VS Code: menu **Terminal → New Terminal**. |
| **Node.js / npm** | Programa que roda os comandos deste projeto. O `npm` vem junto com o Node. |
| **Cloudflare** | Empresa que hospeda sites e programas. Tem plano gratuito. |
| **Worker** | Um pequeno programa que fica rodando na Cloudflare 24 horas por dia. Aqui ele é o "porteiro". |
| **KV** | Uma lista guardada na Cloudflare. Aqui guarda quem tem permissão. |
| **Secret** | Uma senha guardada na Cloudflare. Depois de salva, ninguém consegue ler. |
| **wrangler** | O programa da Cloudflare para o terminal. Já vem no projeto. |
| **Chave de acesso** | Senha pessoal que você entrega para cada pessoa autorizada. |
| **Token** | "Crachá" de 8 horas que o porteiro dá depois de conferir a chave. Funciona sozinho, ninguém precisa mexer. |
| **Ofuscar** | Embaralhar o JavaScript para ficar quase impossível de entender. Ele continua funcionando igual. |
| **Build** | Preparar os arquivos para publicar (ofuscar, ajustar caminhos). |
| **Deploy** | Enviar a versão nova para a Cloudflare. |

---

## 3. O que você precisa ter

- [ ] Um computador com **Windows, Mac ou Linux**.
- [ ] **Node.js** versão 20 ou mais nova. Baixe a versão "LTS" em https://nodejs.org e instale clicando em "Avançar".
- [ ] **VS Code** (recomendado): https://code.visualstudio.com.
- [ ] Uma conta gratuita na **Cloudflare**: https://dash.cloudflare.com/sign-up.
- [ ] No Moodle, permissão para **adicionar um recurso "Arquivo"** em algum curso.

Para conferir se o Node está instalado, abra um terminal e digite:

```
node -v
```

Deve aparecer algo como `v20.11.0`. Se aparecer "não reconhecido", reinstale o Node e feche e abra o terminal de novo.

---

## 4. Conhecendo as pastas

```
cloudflare-begin/
│
├── docs/                    ← ✏️ O SEU CÓDIGO FICA AQUI
│   ├── index.html           página inicial (obrigatória)
│   ├── sobre.html           outra página (exemplo)
│   ├── css/estilo.css       estilos
│   ├── js/app.js            JavaScript da página inicial
│   ├── js/moodle.js         funções prontas para falar com o Moodle
│   └── dados/exemplo.json   um arquivo de dados qualquer
│
├── config.json              ⚙️ endereço do seu Worker e se deve ofuscar
├── wrangler.jsonc           ⚙️ configuração do Worker na Cloudflare
│
├── worker/index.js          🔒 o "porteiro" (não precisa mexer)
├── loader.template.html     🔒 modelo do carregador (não precisa mexer)
├── build.mjs                🔒 script que prepara a publicação (não precisa mexer)
├── scripts/acesso.mjs       🔒 liberar e revogar pessoas (não precisa mexer)
│
│   Pastas e arquivos criados automaticamente:
├── .publicar/               cópia ofuscada da docs/ que vai para a Cloudflare
├── moodle/carregador.html   📤 o arquivo que você envia ao Moodle
├── acessos.json             lista de quem tem acesso (fica só no seu computador)
└── node_modules/            programas instalados pelo npm
```

Regra de ouro: **você só edita `docs/`, `config.json` e `wrangler.jsonc`**.

---

## 5. Parte 1: preparar o computador

1. Abra a pasta `cloudflare-begin` no VS Code (**File → Open Folder**).
2. Abra o terminal (**Terminal → New Terminal**). Ele já abre dentro da pasta certa.
3. Instale as dependências (só na primeira vez):
   ```
   npm install
   ```
   Espere terminar. Vai aparecer algo como `added 147 packages`.

---

## 6. Parte 2: configurar a Cloudflare

Faça só uma vez. Todos os comandos são no terminal, dentro de `cloudflare-begin`.

### 6.1 Entrar na conta

```
npx wrangler login
```

O navegador abre. Clique em **Allow**. Volte ao terminal. Para conferir:

```
npx wrangler whoami
```

Deve mostrar o seu e-mail.

### 6.2 (Opcional) Dar um nome para a ferramenta

Abra `wrangler.jsonc` e troque `"name": "cloudflare-begin"` por um nome seu,
como `"name": "minha-ferramenta"`. Use só letras minúsculas, números e hífen.

> Se você já tem outro Worker na mesma conta (por exemplo `sync-moodle`), cada
> projeto precisa de um nome diferente. Senão um substitui o outro.

### 6.3 Criar a lista de chaves (KV)

```
npx wrangler kv namespace create CHAVES
```

Ele pergunta se deve adicionar a configuração ao seu arquivo. Responda **Y**
(sim) e Enter. Depois abra `wrangler.jsonc` e confira que ficou **uma** entrada só:

```jsonc
"kv_namespaces": [
    { "binding": "CHAVES", "id": "um-codigo-grande" }
]
```

> ⚠️ Se aparecer duas entradas `"binding": "CHAVES"`, apague uma. Com duas, o
> deploy dá o erro *"CHAVES assigned to multiple KV Namespace bindings"*.

### 6.4 Criar a senha dos tokens (secret)

```
npx wrangler secret put TOKEN_SECRET
```

- `TOKEN_SECRET` é o **nome**. Já está no comando, não mude.
- Quando ele pedir *"Enter a secret value"*, digite o **valor**: um texto longo e
  aleatório, como `x7Gq2-mP9vLr-48TzKw-Qe1nYb-u5Hs3d`. Você não precisa anotar.
- Se perguntar *"There doesn't seem to be a Worker called ... create a new Worker?"*,
  responda **Y**. É normal na primeira vez.

Para conferir:

```
npx wrangler secret list
```

Deve aparecer `"name": "TOKEN_SECRET"`. Se aparecer outro nome esquisito, você
digitou o valor no lugar do nome. Apague com
`npx wrangler secret delete <nome-esquisito>` e repita o passo.

### 6.5 Primeira publicação

```
npm run deploy
```

Na primeira vez em uma conta nova, ele pergunta:

1. *"Would you like to register a workers.dev subdomain now?"* → **yes**.
2. *"What would you like your workers.dev subdomain to be?"* → digite um nome
   neutro, como `ferramentas-ead`. Esse nome vale para a conta inteira.

No final aparece o endereço do seu Worker:

```
https://cloudflare-begin.ferramentas-ead.workers.dev
```

### 6.6 Colocar o endereço no projeto

Abra `config.json` e coloque o endereço em `serverUrl`:

```json
{
  "serverUrl": "https://cloudflare-begin.ferramentas-ead.workers.dev",
  "ofuscar": true
}
```

Publique de novo, para o carregador saber o endereço:

```
npm run deploy
```

> O endereço novo pode levar alguns minutos para funcionar na primeira vez.

### 6.7 Conferir se o porteiro está funcionando

Abra no navegador o seu endereço + `/index.html`, por exemplo
`https://cloudflare-begin.ferramentas-ead.workers.dev/index.html`.

Deve aparecer **"Não encontrado"**. Isso é bom: sem chave, ninguém vê nada.

---

## 7. Parte 3: criar a sua chave de acesso

```
npm run acesso -- liberar "Seu Nome"
```

Aparece:

```
Acesso liberado para "Seu Nome".
Chave (envie só para essa pessoa): 5lQspW74dlv6kezhSA0-1gPL
```

**Copie a chave agora.** Ela não aparece de novo.

---

## 8. Parte 4: colocar no Moodle

O arquivo que vai para o Moodle é **`moodle/carregador.html`**. Só ele. Não
precisa de zip nem de mais nada.

1. Entre no Moodle e abra um curso onde você pode editar.
2. Clique em **Ativar edição**.
3. Na seção desejada, clique em **Adicionar uma atividade ou recurso → Arquivo**.
4. Dê um nome, por exemplo "Minha Ferramenta".
5. Arraste o arquivo `moodle/carregador.html` para a área de envio.
6. Em **Aparência → Exibir**, escolha **Abrir**.
7. Clique em **Salvar e mostrar**.

Deve aparecer a tela "Informe a chave de acesso". Digite a chave da Parte 3.
A página de exemplo aparece. Teste:

- Digite o ID de um curso e clique em **Ler curso**. Aparecem o nome e os recursos dele.
- Clique em **Carregar dados**. Aparece o conteúdo de `docs/dados/exemplo.json`.
- Clique em **Sobre** para ir à segunda página.

Se tudo funcionou, a parte difícil acabou. 🎉

> Dica: em **Restrições de acesso** do recurso no Moodle você também pode
> limitar quem vê o link. A chave continua sendo a proteção principal.

---

## 9. Parte 5: colocar o SEU código

### 9.1 O ciclo de trabalho

```
 editar arquivos em docs/  ──▶  npm run deploy  ──▶  recarregar a página no Moodle (Ctrl+F5)
```

Não é preciso mexer no Moodle de novo. O carregador sempre busca a versão mais nova.

### 9.2 Onde colocar cada coisa

| O que | Onde |
|---|---|
| Página inicial | `docs/index.html` (obrigatória, é a primeira que abre) |
| Outras páginas | `docs/qualquer-nome.html` ou em subpastas |
| Estilos | `docs/css/...` |
| JavaScript | `docs/js/...` |
| Imagens | `docs/img/...` |
| Dados (JSON, CSV) | `docs/dados/...` |

Pode apagar os arquivos de exemplo. Só não apague o `docs/index.html`: troque
o conteúdo dele pelo seu.

### 9.3 As 7 regras

Seguindo estas regras, o seu código funciona igual no seu computador e dentro do Moodle.

#### Regra 1: use caminhos relativos para CSS, JS e imagens

```html
✅ <link rel="stylesheet" href="css/estilo.css">
✅ <script type="module" src="js/app.js"></script>
✅ <img src="img/logo.png">

❌ <script src="C:\Users\eu\projeto\js/app.js"></script>      (caminho do seu PC)
❌ <link rel="stylesheet" href="https://meusite.com/estilo.css"> (seu arquivo em outro site: não passa pelo porteiro)
```

O build troca esses caminhos pelo endereço do Worker automaticamente.

#### Regra 2: links entre páginas, use o nome do arquivo

```html
✅ <a href="sobre.html">Sobre</a>
✅ <a href="relatorios/index.html">Relatórios</a>
```

O build transforma em `#sobre.html`. O carregador entende e abre a página certa.

#### Regra 3: funções chamadas pelo HTML precisam ir para `window`

Se o HTML tem `onclick="salvar()"` e o seu JS é um módulo (`type="module"`),
a função não fica visível para o HTML sozinha. Coloque no fim do arquivo JS:

```js
function salvar() { /* ... */ }

window.salvar = salvar;   // ✅ agora o onclick="salvar()" funciona
```

#### Regra 4: para ler arquivos da `docs/`, use `window.__SM_BASE`

Dentro do Moodle, um `fetch('dados/x.json')` procuraria o arquivo no Moodle, não na
Cloudflare. Use:

```js
✅ const r = await fetch(window.__SM_BASE + '/dados/x.json');
❌ const r = await fetch('dados/x.json');
```

`window.__SM_BASE` é criado pelo carregador e já inclui a autorização.

#### Regra 5: para falar com o Moodle, use `js/moodle.js`

```js
import { buscarPagina, lerCurso, MOODLE } from './moodle.js';

const curso = await lerCurso(12345);              // { nome, recursos: [...] }
const doc = await buscarPagina('/my/');           // qualquer página do Moodle
const resposta = await fetch(MOODLE + '/user/profile.php');
```

`MOODLE` vale `https://ead.unifor.br/ava`. Se o seu Moodle não fica em `/ava`,
mude `MOODLE_PATH` no começo de `js/moodle.js`.

Como a página roda dentro do Moodle, o login da pessoa vai junto
automaticamente. Ela só consegue fazer o que já pode fazer no Moodle.

#### Regra 6: bibliotecas externas, use o endereço completo

Bibliotecas de sites públicos funcionam normalmente:

```html
✅ <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```

Elas não são ofuscadas (não são suas) e não passam pelo porteiro.

#### Regra 7: nunca coloque senhas no código

Nada de senha, token do Moodle ou chave de API escrita no JavaScript. Mesmo
ofuscado, quem tem acesso consegue achar. Se a ferramenta precisa de uma chave
(por exemplo, da API Gemini), peça para a pessoa digitar na tela.

### 9.4 Exemplo: trazer uma página que você já tem

Imagine que você já tem `minha-tela.html` + `script.js` + `estilo.css`.

1. Copie os três para `docs/`.
2. Renomeie `minha-tela.html` para `index.html`, ou apague o `index.html` de
   exemplo e renomeie o seu.
3. Confira as regras:
   - Os caminhos no HTML são relativos? (Regra 1)
   - Usa `onclick` com `type="module"`? Coloque as funções em `window`. (Regra 3)
   - Faz `fetch` de algum arquivo seu? Use `window.__SM_BASE`. (Regra 4)
   - Acessa o Moodle? Use `window.location.origin + '/ava/...'` ou `js/moodle.js`. (Regra 5)
4. Rode `npm run deploy`.
5. Abra o recurso no Moodle e aperte Ctrl+F5.

### 9.5 Testar antes de publicar

Você pode abrir `docs/index.html` direto no navegador para conferir visual e
botões. As partes que falam com o Moodle e o `window.__SM_BASE` só funcionam
depois de publicar e abrir pelo Moodle.

Se o seu JS usa `import`, abrir o arquivo direto (`file://`) não funciona. Use a
extensão **Live Server** do VS Code (clique com o botão direito no
`index.html` → **Open with Live Server**).

### 9.6 Desligar a ofuscação (para achar erros)

Em `config.json`, mude `"ofuscar": true` para `"ofuscar": false` e rode
`npm run deploy`. O código sai legível, e os erros no console do navegador (F12)
mostram nomes de funções que você reconhece. **Lembre de voltar para `true`.**

---

## 10. Como funciona por dentro

Não é preciso entender esta parte para usar. Ela ajuda quando algo dá errado.

### O que o build faz (`npm run build`, chamado pelo deploy)

1. Copia `docs/` para `.publicar/`.
2. Ofusca todos os arquivos `.js` e os `<script>` escritos dentro dos HTMLs.
3. Troca caminhos relativos por `%%BASE%%/caminho`. O carregador troca
   `%%BASE%%` pelo endereço real, com o token.
4. Troca links de página (`sobre.html`) por rotas (`#sobre.html`).
5. Gera `moodle/carregador.html` com o endereço que está no `config.json`.

### O caminho de um acesso

1. A pessoa abre `carregador.html` no Moodle.
2. O carregador procura uma chave salva no navegador. Se não tiver, mostra a tela de chave.
3. Envia a chave para o Worker em `/auth`.
4. O Worker calcula a "impressão digital" (hash) da chave e procura no KV `CHAVES`.
   Se achar, devolve um token assinado com o `TOKEN_SECRET`, válido por 8 horas.
5. O carregador busca `index.html` em `/t/<token>/index.html` e desenha a página.
6. Cada arquivo seguinte (CSS, JS, imagens) também passa pelo Worker, que confere
   o token e se a chave ainda está no KV.

### Por que é seguro

- Sem token, o Worker responde "Não encontrado" para tudo.
- O Worker só atende páginas abertas no endereço do Moodle (`ALLOWED_ORIGINS` no `wrangler.jsonc`).
- A Cloudflare guarda só o hash das chaves, nunca a chave.
- Revogar uma chave derruba o acesso em até 1 minuto.

### O que não é protegido

- Quem tem chave consegue baixar o JS ofuscado. É muito difícil de entender, mas não impossível.
- HTML e CSS não são ofuscados.
- Uma pessoa pode repassar a chave. Se acontecer, revogue e gere outra.

---

## 11. Dar e tirar acesso

```
npm run acesso -- liberar "Maria Silva"     cria a chave (aparece uma vez só)
npm run acesso -- revogar "Maria Silva"     tira o acesso (vale em até 1 minuto)
npm run acesso -- listar                    mostra quem tem acesso
```

- Mande a chave por um canal privado (mensagem direta, não em grupo).
- A pessoa digita a chave uma vez. O navegador lembra.
- Pessoa perdeu a chave? Revogue e libere de novo para gerar outra.

**Cortar o acesso de todo mundo de uma vez:**

```
npx wrangler secret put TOKEN_SECRET
```

Digite um valor novo. Todas as sessões caem. Quem ainda tem chave válida entra
de novo, então revogue também as chaves de quem não deve mais entrar.

**Guarde uma cópia do `acessos.json`.** É ele que liga o nome da pessoa à chave
dela. Se perder, as chaves continuam funcionando, mas para revogar você terá que
ir ao painel: **dash.cloudflare.com → Storage & Databases → KV → CHAVES**, achar
a linha cujo valor é o nome da pessoa e apagar.

---

## 12. Problemas comuns

| O que aparece | Por quê | Como resolver |
|---|---|---|
| `CHAVES assigned to multiple KV Namespace bindings` | Duas entradas `CHAVES` no `wrangler.jsonc`. | Deixe só uma, a que tem o id verdadeiro (6.3). |
| `TOKEN_SECRET não configurado` | O secret não existe ou foi criado com outro nome. | Veja o passo 6.4. Confira com `npx wrangler secret list`. |
| `KV CHAVES não configurado` | Faltou o passo 6.3. | Crie o KV e publique de novo. |
| "Erro ao carregar: Failed to fetch" | O Moodle está em um endereço diferente de `ALLOWED_ORIGINS`, ou o `serverUrl` está errado. | Confira o endereço do Moodle no navegador (ex.: `https://ead.unifor.br`) e o `wrangler.jsonc`. Confira o `config.json`. Rode `npm run deploy` e reenvie o carregador se o `serverUrl` mudou. |
| "Chave inválida ou revogada." | Chave digitada errada, ou revogada. | Gere uma nova (seção 11). |
| O Moodle baixa o arquivo em vez de abrir | Configuração do recurso. | **Aparência → Exibir: Abrir**. |
| Mudei o código e nada mudou | Faltou o deploy, ou o navegador guardou a versão antiga. | `npm run deploy` e Ctrl+F5. |
| Um botão não faz nada | A função do `onclick` não está em `window`. | Regra 3. Aperte F12 e veja a aba Console. |
| CSS ou imagem não aparece | Caminho absoluto ou errado. | Regra 1. |
| `fetch` de um arquivo seu dá erro 404 | Faltou o `window.__SM_BASE`. | Regra 4. |
| "O Moodle pediu login" | A sessão do Moodle expirou. | Entre no Moodle de novo. |
| `docs/index.html não existe` | Apagou ou renomeou a página inicial. | Toda ferramenta precisa de `docs/index.html`. |
| `wrangler` pede login de novo | O login expirou ou é outro computador. | `npx wrangler login`. |

**Ver o que o Worker está fazendo em tempo real:**

```
npm run logs
```

Deixe aberto, use a ferramenta no Moodle e veja as requisições aparecendo.
Ctrl+C para sair.

**Ver erros do navegador:** na página da ferramenta, aperte **F12** e abra a aba **Console**.

---

## 13. Resumo dos comandos

| Comando | Quando usar |
|---|---|
| `npm install` | Primeira vez no computador. |
| `npx wrangler login` | Entrar na conta Cloudflare. |
| `npx wrangler kv namespace create CHAVES` | Primeira configuração (6.3). |
| `npx wrangler secret put TOKEN_SECRET` | Primeira configuração (6.4), ou para derrubar todas as sessões. |
| `npm run deploy` | **Toda vez que mudar o código.** |
| `npm run build` | Só preparar os arquivos, sem enviar. |
| `npm run acesso -- liberar "Nome"` | Dar acesso. |
| `npm run acesso -- revogar "Nome"` | Tirar acesso. |
| `npm run acesso -- listar` | Ver quem tem acesso. |
| `npm run logs` | Ver o Worker em tempo real. |

### Limites do plano gratuito

- 100 mil requisições por dia. Cada abertura da ferramenta usa algumas dezenas.
- Até 1.000 escritas por dia no KV (liberar e revogar usam isso, então não é problema).
- Arquivos de até 25 MB cada.
