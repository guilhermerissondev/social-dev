# Social Dev: Plano Inicial (Levantamento de Requisitos e Arquitetura)

> Status: **rascunho para discussão**. Última atualização: 2026-10-30.
> Objetivo: decidir stack, linguagem, arquitetura, infraestrutura e estratégia de escala antes de escrever código.
> Decisões registradas em [`docs/adr/`](adr/).

---

## 0. Decisões já tomadas

| #   | Tema              | Decisão                                                                                                                          | ADR                                             |
| --- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | Time              | Projeto solo, de longo prazo, priorizando qualidade sobre velocidade.                                                            | —                                               |
| 2   | Proposta de valor | "Todo mundo aqui é dev": a rede já reúne o público certo, sem precisar garimpar conexões como no X/LinkedIn.                     | —                                               |
| 3   | Conteúdo          | Formato livre, como no Facebook/X. Limite de 63.206 caracteres por post (o mesmo do Facebook).                                   | [0003](adr/0003-modelo-de-conteudo.md)          |
| 4   | Federação         | Rede federada (ActivityPub). Modelo de dados preparado desde o início, federação ativada no M5. Domínio decidido só antes do M5. | [0002](adr/0002-federacao-activitypub.md)       |
| 5   | Infraestrutura    | Por enquanto roda apenas localmente. Hospedagem será decidida perto do MVP.                                                      | [0004](adr/0004-desenvolvimento-local-first.md) |
| 6   | Stack             | TypeScript ponta a ponta (Next.js + Hono + Fedify + PostgreSQL).                                                                 | [0001](adr/0001-stack-typescript.md)            |
| 7   | Repositório       | Público, licença AGPL-3.0, também como projeto de portfólio. Código e commits em inglês, docs de produto em português.           | [0005](adr/0005-repositorio-publico.md)         |
| 8   | Cadastro          | Aberto a qualquer pessoa: login com GitHub, GitLab ou e-mail e senha.                                                            | [0006](adr/0006-autenticacao-e-cadastro.md)     |

---

## 1. Visão do produto

Rede social para a comunidade de tecnologia (desenvolvedores, DevOps, dados, QA, estudantes). Lançamento no Brasil e expansão internacional depois.

**Referências do mercado**

- Globais: dev.to, Hashnode, X/Bluesky (comunidade tech), LinkedIn, Mastodon (instâncias tech como hachyderm.io e fosstodon.org).
- Brasil: TabNews, comunidades em Discord/Telegram.

### 1.1 Proposta de valor: "todo mundo aqui é dev"

O diferencial central é o público. Isso gera requisitos concretos de produto:

- **Descoberta de pessoas desde o primeiro acesso.** No onboarding o usuário escolhe stack, área (front, back, dados, mobile...), senioridade e cidade. A rede sugere quem seguir com base nisso. O feed nunca deve começar vazio.
- **Importar conexões do GitHub.** Login com GitHub permite sugerir quem o usuário já segue lá e que também está na Social Dev. É o atalho mais forte para montar o grafo social.
- **Perfil técnico.** Stack, repos fixados, links. É o que torna as pessoas encontráveis.
- **Diretório e filtros.** "Devs de Rust em Curitiba", "pessoas de dados que seguem #python".
- **Seguir tags de tecnologia** além de pessoas.
- **Sinal de "dev de verdade"** (a avaliar): como o cadastro é aberto, contas vinculadas ao GitHub/GitLab podem ganhar um selo. Ajuda contra spam e reforça a proposta sem fechar a porta para quem não usa essas plataformas.

### 1.2 Tensão entre federação e "todo mundo aqui é dev"

Com a federação, usuários do Mastodon, Threads e outras redes poderão interagir com a Social Dev, e nem todos são devs. A proposta para manter a identidade:

- **Explorar** e as sugestões de quem seguir mostram **apenas usuários locais** (da Social Dev).
- Conteúdo de fora só aparece no feed de quem **escolheu seguir** alguém remoto.
- Respostas de usuários remotos aparecem nas threads normalmente, sujeitas às regras de moderação e bloqueio de instâncias.

---

## 2. Escopo do MVP

### Dentro do MVP

| Módulo               | Funcionalidades                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conta e autenticação | Cadastro aberto. Login com GitHub, GitLab ou e-mail e senha (com verificação de e-mail e recuperação de senha). Vincular mais de um método à mesma conta. Onboarding com stack, área e tags de interesse. |
| Perfil               | Bio, avatar, stack/tecnologias, links, repos fixados do GitHub.                                                                                                                                           |
| Posts                | Markdown, blocos de código com syntax highlight, imagens, tags, menções. Até 63.206 caracteres. Editar/excluir.                                                                                           |
| Interações           | Curtir, comentar (com respostas), repostar, salvar.                                                                                                                                                       |
| Grafo social         | Seguir pessoas (locais e remotas) e tags. Bloquear e silenciar.                                                                                                                                           |
| Descoberta           | Sugestões de quem seguir, importação do GitHub, diretório com filtros.                                                                                                                                    |
| Feed                 | "Seguindo" (cronológico) e "Explorar" (populares locais por tag/período).                                                                                                                                 |
| Notificações         | In-app (curtidas, comentários, seguidores, menções). E-mail resumido opcional.                                                                                                                            |
| Busca                | Pessoas, posts e tags. Busca de contas remotas por handle (`@usuario@instancia`).                                                                                                                         |
| Federação            | Ver seção 6.7.                                                                                                                                                                                            |
| Moderação            | Denúncias, painel admin, bloqueio de instâncias remotas.                                                                                                                                                  |
| Conformidade         | Termos de uso, política de privacidade, exportação e exclusão de conta (LGPD).                                                                                                                            |

### Fora do MVP

- Mensagens diretas.
- Vagas, eventos e meetups.
- Comunidades/grupos com moderação própria.
- Feed ranqueado por algoritmo.
- Apps nativos (MVP é web responsivo/PWA).
- Monetização.

---

## 3. Requisitos não funcionais

| Requisito           | Meta                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qualidade           | Testes automatizados em todas as camadas, tipagem estrita, CI bloqueando merge com falha. Prioridade máxima por ser projeto solo e de longo prazo. |
| Manutenibilidade    | Poucas peças móveis. Cada dependência nova precisa se justificar.                                                                                  |
| Latência            | p95 < 300 ms nas APIs de leitura para usuários no Brasil (quando houver deploy).                                                                   |
| SEO                 | Posts e perfis públicos renderizados no servidor e indexáveis.                                                                                     |
| Internacionalização | i18n desde o primeiro dia (pt-BR primeiro, en-US depois).                                                                                          |
| Acessibilidade      | WCAG 2.1 AA.                                                                                                                                       |
| Segurança           | OWASP Top 10, rate limiting, anti-spam, sanitização rigorosa de conteúdo remoto, 2FA opcional.                                                     |
| Privacidade         | LGPD agora, GDPR ao expandir.                                                                                                                      |
| Interoperabilidade  | Compatível com Mastodon, Misskey, Threads e demais servidores ActivityPub.                                                                         |

---

## 4. Estimativa de escala

| Fase                  | Usuários cadastrados | DAU              | Pico estimado     |
| --------------------- | -------------------- | ---------------- | ----------------- |
| Desenvolvimento local | só você              | —                | —                 |
| Beta fechado          | até 1 mil            | ~200             | < 10 req/s        |
| Lançamento BR         | 10 mil – 100 mil     | 2 mil – 20 mil   | 50 – 300 req/s    |
| Crescimento           | 100 mil – 1 milhão   | 20 mil – 200 mil | 300 – 3.000 req/s |

Premissas: ~50 leituras e ~2 escritas por usuário ativo por dia, pico de ~10x a média.

**Federação muda o perfil de carga.** Cada post de um usuário com seguidores remotos gera entregas HTTP para cada instância remota, e o servidor recebe atividades de fora o tempo todo. Por isso **filas de processamento assíncrono são obrigatórias desde o início**, não uma otimização futura.

**Conclusão:** até centenas de milhares de usuários, um PostgreSQL bem indexado com filas aguenta. Não há necessidade de microsserviços.

---

## 5. Stack

### 5.1 Critérios (ajustados para projeto solo)

1. **Uma linguagem só** em todo o projeto, para não dividir atenção.
2. **Poucas peças de infraestrutura** para operar sozinho.
3. **Ecossistema maduro de ActivityPub**, já que federação é requisito.
4. SEO e caminho futuro para mobile.

### 5.2 Proposta: TypeScript ponta a ponta

| Camada         | Escolha                                                                                                        | Por quê                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linguagem      | TypeScript (modo estrito)                                                                                      | Uma linguagem para web, API, workers e, no futuro, mobile.                                                                                                      |
| Runtime        | Node.js LTS                                                                                                    | Estável, amplamente suportado.                                                                                                                                  |
| Frontend       | Next.js (React)                                                                                                | SSR para SEO, ecossistema enorme.                                                                                                                               |
| API            | Hono                                                                                                           | Leve, rápido, tipado, com integração oficial com o Fedify.                                                                                                      |
| Federação      | **Fedify**                                                                                                     | Framework ActivityPub em TypeScript: WebFinger, HTTP Signatures, NodeInfo, fila de entregas, compatibilidade com Mastodon. Evita implementar o protocolo à mão. |
| Banco          | PostgreSQL                                                                                                     | Relacional, confiável, busca full-text embutida.                                                                                                                |
| Acesso a dados | Drizzle ORM                                                                                                    | SQL explícito e tipado, migrações versionadas.                                                                                                                  |
| Validação      | Zod                                                                                                            | Schemas compartilhados entre front e back.                                                                                                                      |
| Autenticação   | Better Auth                                                                                                    | Self-hosted, OAuth (GitHub/GitLab), e-mail e senha com verificação, vínculo de contas, 2FA/passkeys.                                                            |
| Filas          | Na própria base PostgreSQL (fila do Fedify para Postgres + biblioteca de jobs como pg-boss ou Graphile Worker) | Evita subir Redis no início. Uma peça a menos.                                                                                                                  |
| Testes         | Vitest (unidade/integração), Playwright (E2E), Testcontainers (Postgres real nos testes)                       | Qualidade sem mocks frágeis de banco.                                                                                                                           |
| Monorepo       | pnpm workspaces + Turborepo                                                                                    | Compartilhar tipos e configurações.                                                                                                                             |

**Redis fica para depois.** Só entra quando houver necessidade medida (cache de feed, contadores de alto volume, rate limiting distribuído).

### 5.3 Alternativas descartadas para este contexto

- **Go + Next.js:** duas linguagens para uma pessoa só manter.
- **Elixir/Phoenix:** excelente para tempo real, mas ecossistema de ActivityPub menor e curva de aprendizado maior.
- **Ruby on Rails:** o Mastodon é Rails e há referências, mas exigiria um frontend separado em outra linguagem para ter a mesma experiência.

---

## 6. Arquitetura

### 6.1 Estilo: monólito modular

Uma aplicação backend com módulos isolados. Cada módulo é dono das suas tabelas e se comunica com os outros por interfaces e eventos internos. Ideal para projeto solo: simples de rodar e depurar, sem fechar a porta para extrair serviços depois.

```
       Navegador                  Outros servidores do fediverso
           │                      (Mastodon, Misskey, Threads...)
           ▼                                   │
  ┌─────────────────┐                          │ ActivityPub
  │ apps/web        │                          │ (WebFinger, inbox,
  │ Next.js (SSR)   │                          │  outbox, actors)
  └────────┬────────┘                          ▼
           │ REST              ┌──────────────────────────────┐
           └──────────────────▶│ apps/api  (Hono + Fedify)    │
                               │ monólito modular             │
                               └───────┬──────────────────────┘
                                       │ grava + enfileira
                                       ▼
                               ┌──────────────┐      ┌──────────────────┐
                               │ PostgreSQL   │◀────▶│ apps/worker      │
                               │ dados + filas│      │ entregas AP,     │
                               └──────────────┘      │ notificações,    │
                                                     │ e-mail, mídia    │
                                                     └──────────────────┘
```

`api` e `worker` são o mesmo código com pontos de entrada diferentes.

**Módulos:** `identity` · `profiles` · `posts` · `social-graph` · `feed` · `notifications` · `search` · `media` · `federation` · `moderation` · `admin`.

### 6.2 Dados

- **PostgreSQL** como fonte única de verdade, incluindo filas.
- **Atores locais e remotos no mesmo modelo.** Usuários e posts têm uma `uri` ActivityPub e uma marcação de origem (local ou remoto). Assim feed, curtidas, menções e notificações funcionam igual para os dois.
- **IDs ordenáveis por tempo** (UUIDv7) e **paginação por cursor**.
- **Arquivos** atrás de uma interface de storage: disco local em desenvolvimento, S3/R2 em produção.
- **Busca:** Postgres Full-Text Search. Motor dedicado só se for necessário.

### 6.3 Feed

1. **Início:** montado na leitura ("posts de quem eu sigo, ordenados por ID"), com índices adequados.
2. **Com escala:** timelines pré-montadas na publicação (fan-out on write), modelo híbrido para contas grandes.
3. **Depois:** feed ranqueado.

### 6.4 Assíncrono

- Padrão **outbox transacional**: a ação do usuário e o evento são gravados na mesma transação, e o worker processa em seguida. Nada se perde se o processo cair.
- Entregas ActivityPub com **retry e backoff exponencial**. Instâncias remotas ficam fora do ar com frequência.

### 6.5 Autenticação

- **Cadastro aberto** com três caminhos: GitHub, GitLab ou e-mail e senha.
- E-mail e senha exige verificação de e-mail antes de postar, recuperação de senha e senha com hash forte (o Better Auth usa scrypt por padrão).
- **Vínculo de contas:** a mesma pessoa pode entrar por GitHub e por senha na mesma conta. Vínculo automático só quando o e-mail vier verificado pelo provedor.
- Login com GitHub continua sendo o caminho incentivado, porque permite importar conexões e mostrar repos.
- Proteção do cadastro: CAPTCHA (Cloudflare Turnstile), rate limiting por IP, bloqueio de e-mails descartáveis.
- Sessões em cookie `httpOnly`. 2FA/passkeys opcional depois do MVP.

### 6.6 API

- REST com contrato OpenAPI, consumida pelo Next.js e, no futuro, pelo app mobile.
- Avaliar compatibilidade parcial com a **API do Mastodon** no futuro: permitiria usar apps clientes existentes (Ivory, Tusky, Elk) com a Social Dev.

### 6.7 Federação (ActivityPub)

**Por que ActivityPub e não AT Protocol (Bluesky):**

- No ActivityPub cada servidor é dono dos próprios dados e regras, o que combina com ter uma rede com identidade própria. O AT Protocol separa dados, indexação e app em peças diferentes e é bem mais pesado para uma pessoa só operar.
- O ActivityPub suporta posts curtos e longos nativamente (`Note` e `Article`). O post padrão do Bluesky tem limite de 300 caracteres.
- Existe o **Fedify**, framework maduro em TypeScript.
- O alcance no Bluesky (grande no Brasil) vem pela ponte **Bridgy Fed**, que conecta ActivityPub e Bluesky sem esforço de implementação. A adesão à ponte é opcional, por usuário.

**O que precisa estar no modelo desde o primeiro dia:**

- **Domínio configurável.** O domínio não será decidido agora. O código lê o domínio de uma variável de ambiente e nunca o fixa no código ou no banco. A escolha definitiva fica para antes do M5, já que os handles serão `@usuario@dominio` e trocar de domínio depois de federar quebra as contas no fediverso.
- **Username imutável** (ou com mudança controlada via `Move`).
- **Par de chaves por usuário** para assinar requisições (gerenciado pelo Fedify).
- **Tabelas de atores, posts e interações** que aceitam origem local ou remota.

**Funcionalidades federadas no MVP:**

- WebFinger e NodeInfo (a Social Dev é encontrável).
- Perfil como `Actor` (visível a partir do Mastodon).
- Seguir e ser seguido por contas remotas (`Follow`, `Accept`, `Undo`).
- Publicar, editar e excluir posts federados (`Create`, `Update`, `Delete`).
- Receber curtidas, respostas, repostagens e menções remotas (`Like`, `Announce`, respostas como `Note`).
- Denúncias federadas (`Flag`) e **bloqueio de instâncias** (defederação).

**Riscos e cuidados:**

- **Conteúdo remoto é entrada não confiável:** sanitizar HTML, limitar tamanho, verificar assinaturas, cachear mídia remota com cuidado.
- **Exclusão não é garantida fora da Social Dev:** quando o usuário apaga um post ou a conta, um `Delete` é enviado, mas servidores remotos podem não cumprir. Isso precisa constar na política de privacidade (LGPD).
- **Moderação mais complexa:** spam e assédio podem vir de instâncias que você não controla.

**Desenvolvimento local:** servidores remotos não alcançam `localhost`. O CLI do Fedify tem um túnel que expõe o servidor local com HTTPS público temporário, além de ferramentas de inspeção (`lookup`) e uma caixa de entrada efêmera para testes.

**Sequência sugerida:** modelo de dados federável desde o início, WebFinger/Actor cedo, e o fluxo completo de federação implementado depois que o núcleo local (perfis, posts, seguir, feed) estiver sólido. Ver roadmap.

---

## 7. Infraestrutura

### 7.1 Agora: tudo local

**Docker Compose** sobe as dependências:

- PostgreSQL
- Mailpit (captura e-mails enviados, para testar magic link e notificações)

Os apps (`web`, `api`, `worker`) rodam direto na máquina com hot reload. Arquivos enviados ficam em disco local.

Mesmo sem deploy, desde o início:

- **CI no GitHub Actions** (gratuito para repositórios públicos): lint, checagem de tipos, testes, varredura de segredos.
- **Containers** para os apps, para que o deploy futuro seja simples.
- **Variáveis de ambiente** validadas na inicialização, segredos nunca no repositório.

### 7.2 Depois: caminho para o MVP

Decisão adiada (ver [ADR 0004](adr/0004-desenvolvimento-local-first.md)). Opções mapeadas para quando chegar a hora:

| Opção                                                | Prós                             | Contras                                          |
| ---------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| PaaS (Railway, Render, Fly.io) + Postgres gerenciado | Muito simples, barato no início  | Custo cresce em escala, poucas regiões no Brasil |
| AWS/GCP em São Paulo                                 | Escala, latência baixa no Brasil | Mais complexo e mais caro                        |
| VPS (Hetzner, DigitalOcean) + Coolify/Kamal          | Custo muito baixo                | Mais operação manual                             |

Em qualquer caso: **Cloudflare na frente** (DNS, CDN, WAF) e **R2/S3** para mídia.

### 7.3 Observabilidade

Logs estruturados e OpenTelemetry desde o começo (ajudam a depurar até localmente). Sentry e alertas quando houver deploy.

---

## 8. Segurança, legal e moderação

- **LGPD:** base legal por dado coletado, consentimento para comunicações, exportação e exclusão de conta, encarregado (DPO), aviso sobre limites da exclusão em servidores federados.
- **Marco Civil da Internet:** guardar registros de acesso (IP, data e hora) por 6 meses, com acesso restrito.
- **ECA Digital (Lei 15.211/2025):** regras de proteção a crianças e adolescentes. Definir idade mínima e verificação. **Validar com assessoria jurídica antes do lançamento.**
- **Moderação:** fila de denúncias (locais e federadas), ações de admin, bloqueio de instâncias, log de auditoria.
- **Anti-abuso:** rate limiting, CAPTCHA no cadastro (Cloudflare Turnstile), detecção de contas em massa, verificação de assinaturas HTTP em toda atividade recebida.
- **Aplicação:** sanitização de Markdown/HTML, CSP, dependências auditadas (Renovate/Dependabot).

---

## 9. Roadmap (marcos, sem prazo fixo)

Projeto solo e sem pressa: cada marco só fecha quando estiver testado e estável.

| Marco                            | Entregas                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M0. Descoberta** (agora)       | Este documento, ADRs, licença, convenções do repositório, publicação no GitHub.                                                                        |
| **M1. Fundação**                 | Monorepo, Docker Compose, CI, padrões de código, testes com Postgres real, i18n, autenticação (GitHub, GitLab, e-mail e senha). Detalhado na seção 10. |
| **M2. Núcleo social local**      | Perfil técnico, posts em Markdown, seguir pessoas e tags, feed "Seguindo".                                                                             |
| **M3. Interações**               | Curtidas, comentários, repostagens, salvos, menções, notificações in-app.                                                                              |
| **M4. Descoberta**               | Onboarding por stack, sugestões de quem seguir, importação do GitHub, Explorar, busca, diretório.                                                      |
| **M5. Federação**                | WebFinger, Actor, seguir/ser seguido remoto, publicar/receber posts e interações, testes contra Mastodon real via túnel.                               |
| **M6. Confiança e conformidade** | Moderação, bloqueio de instâncias, denúncias, exportação/exclusão de conta, termos e privacidade.                                                      |
| **M7. Primeiro deploy**          | Escolha de hospedagem, staging, observabilidade, beta fechado com convidados.                                                                          |
| **M8. Lançamento BR**            | Abertura pública.                                                                                                                                      |
| **Depois**                       | Inglês, apps mobile, feed ranqueado, DMs, vagas, comunidades.                                                                                          |

### Estrutura do repositório

```
social-dev/
├── apps/
│   ├── web/          # Next.js
│   ├── api/          # Hono + Fedify (monólito modular)
│   └── worker/       # filas: entregas ActivityPub, notificações, e-mail
├── packages/
│   ├── core/         # módulos de domínio (compartilhados por api e worker)
│   ├── db/           # schema Drizzle e migrações
│   ├── shared/       # tipos e schemas Zod
│   ├── ui/           # design system
│   └── config/       # eslint, tsconfig etc.
├── infra/
│   └── docker-compose.yml
└── docs/
    ├── plano-inicial.md
    └── adr/
```

---

## 10. Pronto para começar

### 10.1 Checklist do M0

- [x] Stack definida (TypeScript)
- [x] Conteúdo e limite de caracteres
- [x] Modelo de cadastro e autenticação
- [x] Federação: abordagem definida, domínio adiado para antes do M5
- [x] Infraestrutura local
- [x] Repositório público
- [x] Licença: AGPL-3.0
- [x] Idioma: código e commits em inglês, docs de produto em português
- [x] Branch `master` renomeada para `main`
- [x] README, LICENSE, `.gitignore`, `SECURITY.md`
- [x] Publicado em https://github.com/guilhermerissondev/social-dev

### 10.2 M1: entregue

1. [x] **Monorepo:** pnpm workspaces, Turborepo, TypeScript estrito, ESLint, Prettier, Node 24 fixado (`.nvmrc`/`engines`).
2. [x] **Convenções:** Conventional Commits (commitlint), pre-commit com lint-staged, EditorConfig.
3. [x] **CI:** GitHub Actions com formatação, lint, typecheck, testes, E2E e varredura de segredos (gitleaks). Dependabot.
4. [x] **Ambiente local:** Docker Compose com PostgreSQL 18 e Mailpit. Variáveis de ambiente validadas com Zod.
5. [x] **Banco:** pacote `db` com Drizzle, IDs UUIDv7 gerados pelo PostgreSQL, migrações, testes com Testcontainers.
6. [x] **API:** Hono com healthcheck, logs estruturados (pino), request id, erros padronizados e documento OpenAPI.
7. [x] **Web:** Next.js 16 com i18n (pt-BR sem prefixo, `/en`), Tailwind CSS 4 e pacote `ui`.
8. [x] **Autenticação:** cadastro com e-mail e senha (confirmação obrigatória), login por e-mail ou nome de usuário, recuperação de senha, GitHub e GitLab (quando configurados), vínculo de contas, rate limiting.
9. [x] **E2E:** Playwright cobrindo cadastro, confirmação de e-mail, login, logout, senha errada e recuperação de senha.

Ficou para depois (anotado para os próximos marcos):

- **CAPTCHA no cadastro** (Cloudflare Turnstile) e **bloqueio de e-mails descartáveis:** entram antes do beta (M7), quando houver domínio e chaves.
- **IP real do cliente:** o proxy do Next.js em desenvolvimento não repassa o IP de quem acessa, então localmente todas as requisições dividem o mesmo limite de tentativas. Em produção, o proxy da frente (Cloudflare ou load balancer) precisa informar o IP real, configurado em `CLIENT_IP_HEADER`, e a API não pode ficar acessível diretamente. Decisão de infraestrutura do M7.
- **E-mails em inglês:** os templates estão só em português até o idioma do usuário ser salvo no perfil.

### 10.3 M2: entregue

Um PR por etapa:

1. [x] **Perfil técnico:** tabela de atores pronta para a federação ([ADR 0007](adr/0007-atores-e-perfis.md)), página pública em `/@usuario`, edição de perfil (nome, bio, local, links, tecnologias), escolha de nome de usuário para contas do GitHub/GitLab, proteção contra CSRF na API.
2. [x] **Posts em Markdown:** publicar (com pré-visualização), editar e excluir; HTML sanitizado gerado no servidor; destaque de sintaxe; hashtags viram tags; posts no perfil, página do post e página da tag. Detalhes no [ADR 0003](adr/0003-modelo-de-conteudo.md).
3. [x] **Seguir pessoas e tags:** seguir e deixar de seguir, contadores e listas de seguidores e seguidos no perfil, botão de seguir na página da tag. As tecnologias do perfil levam à página da tag. Os follows já ligam ator a ator, então seguidores remotos (M5) entram na mesma tabela; o estado "pendente" que o ActivityPub exige entra junto com a federação.
4. [x] **Feed "Seguindo":** seus posts, os de quem você segue e os das tags que você segue, em ordem cronológica, com paginação por cursor. Montado na leitura (seção 6.3); o compositor fica no topo e o post publicado aparece em seguida.

Ficou para depois: upload de avatar e de imagens nos posts (módulo de mídia), repositórios fixados do GitHub e lista curada de tecnologias (M4), limite de posts por minuto (anti-spam, antes do beta).

### 10.4 M3: entregue

Um PR por etapa. As notificações vêm cedo para que cada etapa seguinte já traga as suas.

1. [x] **Curtidas e salvos:** curtir e salvar posts, contador de curtidas, página "Salvos" e links "Início" e "Salvos" no cabeçalho. Curtidas são públicas (viram `Like` no M5); salvos são privados e nunca federam.
2. [x] **Notificações in-app:** novos seguidores e curtidas, contador de não lidas no cabeçalho, página de notificações. Gravadas na mesma transação da ação; repetir a ação não notifica de novo, e desfazê-la remove a notificação. Abrir a página marca como lidas só as que foram exibidas. Atualização em tempo real e o resumo por e-mail ficam para depois.
3. [x] **Comentários com respostas:** comentários são posts que respondem a outro (`replyToId`, o `inReplyTo` do ActivityPub) e guardam o início da conversa (`threadId`). A página do post mostra a conversa em árvore e permite responder em qualquer nível; o recuo para no 4º nível para o texto continuar legível. Respostas não aparecem no feed nem nas listas, não têm título e notificam o autor do post respondido. Se um post é excluído, as respostas a ele continuam na conversa, como no fediverso. Conversas carregam até 500 respostas; paginação quando houver conversas desse tamanho.
4. [x] **Repostagens:** repostar posts (`Announce` no M5), que entram no feed de quem segue quem repostou e no perfil de quem repostou, com a indicação "Fulano repostou". Repostagens têm id próprio ordenado pelo tempo, então aparecem no momento em que foram feitas, intercaladas com os posts. Notificam o autor. Um post repostado por duas pessoas que você segue aparece duas vezes no feed; agrupar fica para quando incomodar.
5. [x] **Menções:** `@usuario` vira link para o perfil e notifica a pessoa (só contas que existem; `@usuario@instancia` fica para o M5). Ignoradas dentro de código, links e e-mails. Editar o post notifica só quem passou a ser mencionado e remove a notificação de quem saiu. Quem já recebe a notificação de resposta não recebe também a de menção.

Ficou para depois: notificações em tempo real e resumo por e-mail, agrupar repostagens repetidas no feed, autocompletar `@usuario` no editor, paginação de conversas muito longas.

### 10.5 M4: descoberta (em andamento)

Um PR por etapa:

1. [x] **Explorar:** posts populares do dia, da semana ou do mês (curtidas + respostas + repostagens em dobro, porque levam o post a gente nova), tags em alta e filtro por tag. Aberto a visitantes, com link no cabeçalho e no feed vazio. A pontuação é calculada na leitura; guardar pronta fica para quando o volume pedir.
2. [x] **Busca:** pessoas, posts e tags, pelo campo no cabeçalho ou em `/search`. Posts usam a busca de texto do PostgreSQL com uma configuração própria (`social_dev`): português, sem diferenciar acentos ("programacao" acha "programação"), título pesando mais que o conteúdo, e sintaxe de buscador ("frase exata", -excluir). Pessoas são encontradas por parte do nome ou do usuário (trigramas, `pg_trgm`), com o usuário exato primeiro. Tags, pelo começo do nome. O stemmer do português do PostgreSQL não trata todas as flexões (ex.: "funcional" e "funcionais" ficam diferentes); se incomodar, avaliar outro dicionário.
3. [x] **Perfil ampliado e diretório:** área (12 opções, de front-end a embarcados) e senioridade (de estudante a staff) no perfil, opcionais e validadas também no banco. Diretório em `/directory` com filtros por tecnologia, área, senioridade e local (sem diferenciar acentos: "sao paulo" acha "São Paulo"), mais seguidos primeiro. Os filtros ficam na URL, então dá para compartilhar uma busca. Área, senioridade e local no perfil levam ao diretório filtrado; o Explorar e as páginas de tag também apontam para ele.
4. [ ] **Onboarding e sugestões de quem seguir:** depois do cadastro, escolher stack, área e tags de interesse e receber sugestões, para o feed nunca começar vazio.
5. [ ] **GitHub:** sugerir quem a pessoa já segue no GitHub e está na Social Dev, e mostrar repositórios fixados no perfil.
