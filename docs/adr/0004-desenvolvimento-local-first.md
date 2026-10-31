# 0004. Desenvolvimento apenas local por enquanto

- Status: **Aceito**
- Data: 2026-10-30

## Contexto

No momento o projeto vai rodar só na máquina do autor. A hospedagem será decidida quando o produto estiver perto de um MVP.

## Decisão

- Docker Compose para dependências locais: PostgreSQL e Mailpit (captura de e-mails).
- Sem Redis no início: filas e jobs rodam no próprio PostgreSQL.
- Arquivos em disco local, atrás de uma interface de storage que depois aponta para S3/R2.
- Desde já: CI no GitHub Actions, apps containerizáveis, configuração por variáveis de ambiente validadas.

## Consequências

- Custo zero de infraestrutura agora.
- Deploy futuro facilitado: apps já em containers e sem dependência de serviço específico de nuvem.
- Federação real só pode ser testada com túnel HTTPS temporário até existir um ambiente público.
- A escolha de hospedagem (PaaS, nuvem em São Paulo ou VPS) fica para o marco M7.
