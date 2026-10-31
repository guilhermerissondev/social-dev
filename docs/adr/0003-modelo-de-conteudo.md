# 0003. Modelo de conteúdo livre

- Status: **Aceito**
- Data: 2026-10-30

## Contexto
O usuário deve postar o que quiser, curto ou longo, como no Facebook ou no X. Não haverá separação entre "post" e "artigo" na experiência.

## Decisão
- Uma única entidade `Post`, com corpo em Markdown (blocos de código com syntax highlight, imagens, tags, menções).
- Limite de 63.206 caracteres por post, o mesmo usado pelo Facebook. Textos longos aparecem truncados no feed com "ver mais".
- O limite é validado no servidor (schema Zod compartilhado) e contado sobre o Markdown original, não sobre o HTML gerado.
- Título opcional. Na federação, post sem título vira `Note`; post com título vira `Article`.
- O Markdown é convertido para HTML sanitizado no servidor, que é o formato esperado pelo fediverso.

## Consequências
- Modelo simples: um tipo de conteúdo, um fluxo de publicação.
- Servidores remotos podem exibir posts longos de forma diferente (o Mastodon, por exemplo, mostra `Article` de forma resumida).
- A sanitização de HTML é crítica para segurança (XSS).
