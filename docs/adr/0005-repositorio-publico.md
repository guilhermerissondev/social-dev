# 0005. Repositório público

- Status: **Aceito**
- Data: 2026-10-30

## Contexto

O código da Social Dev será aberto desde o início. Além do produto, o projeto é uma peça importante do portfólio do autor.

## Decisão

- Repositório público no GitHub.
- O histórico do repositório faz parte do portfólio: PRs pequenos e descritivos, Conventional Commits, CI visível, ADRs publicados.
- Arquivos obrigatórios: `README`, `LICENSE`, `SECURITY.md` (como reportar vulnerabilidades), `.env.example`.
- **Licença:** AGPL-3.0 (inicialmente GPL-3.0, trocada em 2026-10-31). Além das regras da GPL-3.0, quem rodar uma versão modificada como serviço na internet precisa oferecer o código-fonte aos usuários. É a licença usada por Mastodon, Misskey e outros projetos do fediverso, e impede que alguém feche o código e lance uma rede concorrente com ele.
- A própria Social Dev cumpre a seção 13 da AGPL com um link para o código-fonte no rodapé do site.
- **Idioma:** código, commits, issues e PRs em inglês. README em inglês com versão em português (`README.pt-BR.md`). Documentação de produto e ADRs em português.

## Consequências

- Nenhum segredo pode entrar no histórico: varredura com gitleaks no CI e pre-commit, segredos apenas em `.env` ignorado pelo git.
- Vulnerabilidades ficam visíveis para todos: Dependabot/Renovate e alertas de segurança do GitHub ativados.
- Qualquer pessoa pode abrir issues e PRs. `CONTRIBUTING.md` e regras de contribuição podem esperar até o projeto estar mais maduro.
- Dados reais de usuários nunca são usados em seeds, fixtures ou testes.
