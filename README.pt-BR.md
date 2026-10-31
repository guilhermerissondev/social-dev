# Social Dev

**Uma rede social federada para a comunidade de tecnologia.** Lançamento primeiro no Brasil.

[Read in English](README.md)

> 🚧 Em desenvolvimento inicial. Ainda não está pronta para uso em produção.

## Por quê

Nas redes sociais genéricas, devs precisam garimpar para se encontrar. Na Social Dev, todo mundo é dev:
você se cadastra, escolhe sua stack e já encontra pessoas e conteúdo que importam para você.

- **Feita para código:** posts em Markdown com blocos de código e destaque de sintaxe.
- **Encontre sua stack:** siga pessoas e tecnologias, conecte sua conta do GitHub ou GitLab.
- **Aberta e federada:** código aberto e conectada ao Mastodon e ao resto do fediverso via ActivityPub.

## Situação

| Marco                           | Situação     |
| ------------------------------- | ------------ |
| M0. Descoberta e planejamento   | ✅ Concluído |
| M1. Fundação (autenticação, CI) | ✅ Concluído |
| M2. Núcleo social               | ✅ Concluído |
| M3. Interações                  | ✅ Concluído |
| M4. Descoberta                  | ✅ Concluído |
| M5. Federação (ActivityPub)     | ⏳ Próximo   |

O plano completo está em [`docs/plano-inicial.md`](docs/plano-inicial.md) e as decisões de arquitetura em
[`docs/adr/`](docs/adr/).

## Como rodar

Requisitos: Node.js 24 (veja `.nvmrc`), pnpm (via `corepack enable`) e Docker.

```bash
# 1. Instalar dependências
nvm use
corepack enable
pnpm install

# 2. Configurar o ambiente
cp .env.example .env
# depois preencha BETTER_AUTH_SECRET, por exemplo com: openssl rand -base64 32

# 3. Subir PostgreSQL e Mailpit e aplicar as migrações
pnpm services:up
pnpm db:migrate

# 4. Rodar a API (http://localhost:4000) e o app web (http://localhost:3000)
pnpm dev
```

Os e-mails enviados localmente (confirmação de conta, redefinição de senha) aparecem no Mailpit em
http://localhost:8025.

Login com GitHub (opcional): veja [docs/desenvolvimento/github-oauth.md](docs/desenvolvimento/github-oauth.md).

Stack, estrutura do repositório e lista de comandos estão no [README em inglês](README.md).

## Licença

[AGPL-3.0](LICENSE). Quem rodar uma versão modificada da Social Dev como serviço na internet precisa
disponibilizar o código-fonte para os usuários.
