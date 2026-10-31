# 0002. Federação via ActivityPub

- Status: **Aceito**
- Data: 2026-10-30

## Contexto
A Social Dev será uma rede federada desde a concepção. O público dev já tem presença forte no fediverso (Mastodon) e no Bluesky, este último muito popular no Brasil.

## Opções consideradas
- **ActivityPub:** padrão W3C, usado por Mastodon, Misskey, Threads e outros. Cada servidor é dono dos seus dados. Suporta posts curtos (`Note`) e longos (`Article`). Framework maduro em TypeScript (Fedify).
- **AT Protocol (Bluesky):** separa armazenamento (PDS), indexação (AppView) e relay. Post padrão limitado a 300 caracteres. Operação bem mais pesada para uma pessoa só.
- **Os dois nativamente:** dobra a complexidade.

## Decisão
ActivityPub, usando o Fedify. O alcance no Bluesky fica a cargo da ponte Bridgy Fed (opcional por usuário), sem implementação própria de AT Protocol.

## Consequências
- O domínio não é decidido agora. Ele vem de configuração (variável de ambiente), nunca fixo no código ou no banco. A escolha definitiva acontece antes do M5, quando a federação for ativada, porque handles serão `@usuario@dominio` e trocar de domínio depois de federar quebra as contas.
- Até o M5 a federação fica desligada. O modelo de dados já nasce preparado para ela.
- Usernames imutáveis ou com migração controlada.
- Modelo de dados unificado para atores e conteúdos locais e remotos (campo `uri` + origem).
- Filas com retry são obrigatórias desde o início (entregas para servidores remotos).
- Conteúdo remoto é entrada não confiável: sanitização, verificação de assinatura, limites de tamanho.
- Moderação inclui bloqueio de instâncias e denúncias federadas (`Flag`).
- Exclusão de conteúdo em servidores remotos não é garantida; precisa constar na política de privacidade.
- Explorar e sugestões mostram apenas usuários locais, preservando a proposta "todo mundo aqui é dev".
- Testes locais exigem túnel HTTPS público (CLI do Fedify).
