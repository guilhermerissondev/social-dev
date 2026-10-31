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

### Detalhes definidos no M2 (2026-10-31)

- **Renderização:** pacote `@social-dev/markdown` (unified/remark/rehype), com GFM (tabelas, tachado, listas de tarefas) e destaque de sintaxe nos blocos de código que indicam a linguagem. O HTML é gerado ao salvar e guardado junto com o Markdown.
- **HTML escrito no post aparece como texto.** "Use o `<Button>`" sem crases mostra `<Button>` em vez de sumir com a tag. Nada é interpretado como marcação, e o resultado ainda passa por sanitização.
- **Imagens viram links** até existir upload de mídia com proxy. Exibir imagens de qualquer endereço faria o navegador de cada leitor buscar arquivos em servidores de terceiros.
- **Links externos** recebem `rel="nofollow ugc noopener noreferrer"`.
- **Hashtags** seguem a regra de tags do ADR 0007 e são ignoradas dentro de código, links e URLs. Até 30 por post entram no índice de tags.
- **Contagem de caracteres** por grafema: um emoji ou uma letra acentuada conta como um, igual ao que a pessoa vê.

## Consequências

- Modelo simples: um tipo de conteúdo, um fluxo de publicação.
- Servidores remotos podem exibir posts longos de forma diferente (o Mastodon, por exemplo, mostra `Article` de forma resumida).
- A sanitização de HTML é crítica para segurança (XSS).
