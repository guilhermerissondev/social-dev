# Login com GitHub no ambiente local

O login com GitHub é opcional para rodar o projeto, mas a etapa 5 do M4 (importar conexões e mostrar repositórios fixados) só pode ser testada à mão com ele configurado. Os testes automáticos não precisam disso: eles simulam a API do GitHub.

## 1. Criar o OAuth App

1. Acesse https://github.com/settings/developers e clique em **New OAuth App**.
2. Preencha:

   | Campo                      | Valor                                            |
   | -------------------------- | ------------------------------------------------ |
   | Application name           | `Social Dev (local)`                             |
   | Homepage URL               | `http://localhost:3000`                          |
   | Application description    | opcional                                         |
   | Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |
   | Enable Device Flow         | deixe desmarcado                                 |

3. Clique em **Register application**.
4. Na página do app, copie o **Client ID** e clique em **Generate a new client secret**. O secret aparece uma vez só.

Use um app separado para cada ambiente (local, staging, produção): a URL de callback é fixa por app.

## 2. Configurar o `.env`

```bash
GITHUB_CLIENT_ID=<Client ID>
GITHUB_CLIENT_SECRET=<Client secret>
```

O `.env` não vai para o Git (está no `.gitignore`). A API só liga o GitHub quando as duas variáveis estão preenchidas; uma sem a outra impede a API de subir, com a mensagem de erro indicando qual falta.

## 3. Testar

1. Reinicie a API (`pnpm dev`).
2. Em http://localhost:3000/login deve aparecer **Continuar com GitHub**.
3. Entre com sua conta. Na primeira vez, o GitHub pede autorização; depois a Social Dev pede o nome de usuário (`/welcome`) e abre o onboarding.

Se o e-mail da sua conta no GitHub for o mesmo de uma conta da Social Dev criada com e-mail e senha, as duas são vinculadas automaticamente (o GitHub confirma o e-mail).

Para conectar o GitHub a uma conta que já existe, use **Configurações → GitHub** (`/settings/github`). Por segurança, só funciona se o e-mail principal do GitHub for o mesmo da conta.

## Permissões pedidas

O login usa os escopos padrão do Better Auth para o GitHub: `read:user` e `user:email`. São suficientes para a etapa 5, que só lê dados públicos (quem a pessoa segue e os repositórios fixados). Nenhum escopo de escrita ou de repositórios privados é pedido.

## Problemas comuns

- **"redirect_uri is not associated with this application"**: a URL de callback do app não é exatamente `http://localhost:3000/api/auth/callback/github` (atenção a `https`, porta e barra no final).
- **O botão do GitHub não aparece**: a API não leu as variáveis. Confira o `.env` na raiz do repositório e reinicie a API.
- **Erro de estado/state mismatch**: o login começou em uma origem e terminou em outra (por exemplo, `127.0.0.1` em vez de `localhost`). Use sempre `http://localhost:3000`.
