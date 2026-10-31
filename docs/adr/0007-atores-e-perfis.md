# 0007. Atores e perfis

- Status: **Aceito**
- Data: 2026-10-31

## Contexto

O M2 traz o perfil técnico, a primeira coisa pública de cada pessoa na Social Dev. No M5 esse mesmo perfil vira um ator ActivityPub, e pessoas de outros servidores do fediverso passam a seguir, curtir e responder. O ADR 0002 pede que o modelo de dados nasça pronto para isso.

Duas situações do M1 também pesam:

- Quem entra pelo GitHub ou GitLab chega sem nome de usuário. O Better Auth só pede o nome no cadastro com e-mail e senha.
- A tabela `users` é do Better Auth e guarda dados de conta (e-mail, verificação), que não são públicos.

## Opções consideradas

- **Campos de perfil na tabela `users`:** simples, mas mistura conta com identidade pública e não comporta pessoas de outros servidores.
- **Tabela `profiles` só para contas locais:** separa bem, mas o M5 precisaria de uma tabela paralela para atores remotos, e posts, seguidores e curtidas teriam que apontar para duas tabelas.
- **Tabela `actors` para locais e remotos:** um registro por pessoa, venha de onde vier.

## Decisão

- **Tabela `actors`.** Atores locais têm `user_id` e `domain` nulo; atores remotos terão `domain` e nenhum `user_id`. Uma restrição no banco garante uma coisa ou outra. Posts, seguidores e curtidas vão apontar para `actors`, nunca para `users`.
- **O domínio local não fica no banco.** Ele vem de configuração (ADR 0002), por isso `domain` é nulo para contas locais.
- **Nome de usuário único sem diferenciar maiúsculas** (`Ada` e `ada` são a mesma conta), exibido como a pessoa escolheu.
- **Nome de usuário imutável.** A API recusa trocas, porque ele vira o endereço `@usuario@dominio` no fediverso. Mudança controlada (atividade `Move`) fica para depois do MVP, se houver demanda.
- **Contas do GitHub/GitLab escolhem o nome em `/welcome`** antes de usar o site. O perfil é criado nesse momento; no cadastro por e-mail, é criado junto com a conta.
- **Campos do perfil no M2:** nome de exibição, bio (texto simples), local, até 4 links e até 15 tecnologias.
- **Tecnologias são tags,** as mesmas que posts e o "seguir tags" vão usar. Seguem a regra de hashtags do fediverso: letras, números e `_`, sem diferenciar maiúsculas (`#TypeScript` vira `typescript`). Nomes como `C++` e `Node.js` viram `cpp` e `nodejs`.

## Consequências

- Federar no M5 vai exigir só colunas novas em `actors` (URI, inbox, chaves), sem reescrever relacionamentos.
- O nome de exibição público fica em `actors`; ao editar o perfil, o nome da conta em `users` acompanha.
- Ficam para depois:
  - **upload de avatar,** que depende do módulo de mídia. Por enquanto vale a foto do GitHub/GitLab ou a inicial do nome;
  - **repositórios fixados do GitHub,** que entram no M4, junto com a importação de conexões do GitHub;
  - **lista curada de tecnologias com apelidos** (`c++` → `cpp`), que entra no onboarding do M4.
