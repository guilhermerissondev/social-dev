# 0006. Autenticação e cadastro aberto

- Status: **Aceito**
- Data: 2026-10-30

## Contexto

A rede é voltada para devs, mas não deve exigir conta no GitHub ou GitLab para entrar. Qualquer pessoa pode se cadastrar.

## Opções consideradas

- Somente GitHub/GitLab: reforça "todo mundo aqui é dev", mas exclui quem não usa essas plataformas.
- **GitHub, GitLab e e-mail e senha:** cadastro aberto, com login social como caminho incentivado.
- Magic link no lugar de senha: menos atrito, mas depende de e-mail a cada login.

## Decisão

- Biblioteca: Better Auth (self-hosted).
- Métodos: GitHub, GitLab, e-mail e senha.
- E-mail e senha: verificação de e-mail obrigatória antes de publicar, recuperação de senha, hash scrypt.
- Vínculo de contas: uma pessoa pode usar mais de um método na mesma conta. Vínculo automático apenas quando o provedor confirma o e-mail.
- Proteção: CAPTCHA no cadastro (Cloudflare Turnstile), rate limiting por IP e por conta, bloqueio de e-mails descartáveis.
- Sessões em cookie `httpOnly`, `Secure`, `SameSite=Lax`.
- Depois do MVP: 2FA (TOTP), passkeys, outros provedores (ex.: Google).

## Consequências

- Mais superfície de ataque do que só OAuth (senhas, recuperação, enumeração de e-mails). Respostas de login e recuperação não podem revelar se um e-mail existe.
- Spam fica mais fácil que em cadastro só via GitHub; a moderação e o selo de conta vinculada ao GitHub/GitLab ganham importância.
- Envio de e-mail é necessário desde o M1 (Mailpit local; provedor transacional quando houver deploy).
- O rate limiting depende do IP real do cliente. Em produção, o proxy reverso na frente da API informa o IP em um cabeçalho confiável (`CLIENT_IP_HEADER`) e a API não fica exposta diretamente.
