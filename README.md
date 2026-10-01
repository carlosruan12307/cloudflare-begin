# cloudflare-begin

Modelo para criar uma ferramenta web que abre **dentro do Moodle**, com o código
guardado na **Cloudflare** (gratuito), **ofuscado**, e liberado só para quem tem
uma **chave de acesso** dada por você.

👉 **Primeira vez? Leia o [TUTORIAL.md](TUTORIAL.md).** Ele explica tudo do zero.

## Em uma frase

Você coloca seu HTML, CSS e JS em `docs/`, roda `npm run deploy` e envia
`moodle/carregador.html` para o Moodle uma única vez.

## Comandos

```
npm install                               primeira vez
npm run deploy                            publicar (sempre que mudar o código)
npm run acesso -- liberar "Nome"          dar acesso (mostra a chave uma vez)
npm run acesso -- revogar "Nome"          tirar acesso
npm run acesso -- listar                  ver quem tem acesso
npm run logs                              ver o Worker em tempo real
```

## Pastas

| Pasta / arquivo | Para quê |
|---|---|
| `docs/` | **O seu código.** Já vem com um exemplo que lê cursos do Moodle. |
| `config.json` | Endereço do Worker e liga/desliga a ofuscação. |
| `wrangler.jsonc` | Configuração do Worker (nome, KV, endereço do Moodle permitido). |
| `worker/` | O "porteiro" que confere as chaves. |
| `scripts/acesso.mjs` | Liberar, revogar e listar pessoas. |
| `moodle/carregador.html` | Gerado no build. É o arquivo que vai para o Moodle. |
| `acessos.json` | Gerado ao liberar pessoas. Fica só no seu computador. Faça backup. |
