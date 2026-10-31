# 0001. Stack em TypeScript

- Status: **Aceito**
- Data: 2026-10-30

## Contexto

Projeto desenvolvido por uma pessoa só, de longo prazo, com foco em qualidade. Precisa de SEO (posts públicos indexáveis), federação ActivityPub e, no futuro, app mobile.

## Opções consideradas

- **TypeScript ponta a ponta** (Next.js + Hono + Fedify + PostgreSQL).
- **Go no backend + Next.js:** desempenho alto, mas duas linguagens para manter.
- **Elixir/Phoenix:** ótimo para tempo real, ecossistema de ActivityPub menor.
- **Ruby on Rails:** referência no Mastodon, mas frontend separado em outra linguagem.

## Decisão

TypeScript em todas as camadas:

- Next.js (web, SSR), Hono (API), Fedify (ActivityPub), Drizzle + PostgreSQL (dados e filas), Zod (validação), Better Auth (autenticação), Vitest + Playwright + Testcontainers (testes), pnpm + Turborepo (monorepo).

## Consequências

- Uma linguagem só, tipos compartilhados entre front, API e workers.
- Fedify cuida das partes difíceis do protocolo (assinaturas, WebFinger, entregas).
- Caminho para mobile com React Native/Expo reaproveitando tipos e validação.
- Desempenho por instância menor que Go, irrelevante na escala prevista para os próximos anos.
- Exige disciplina de arquitetura (monólito modular com fronteiras claras).
