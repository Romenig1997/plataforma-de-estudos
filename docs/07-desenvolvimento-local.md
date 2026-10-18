# Desenvolvimento local

Todo desenvolvimento e teste acontece na máquina, com um **Supabase local**
(Postgres, Auth, Storage e caixa de e-mail falsa) rodando no Docker. Nada
disso consome a cota do projeto Supabase de produção nem envia e-mail real.
O deploy no Railway só é feito quando um conjunto de mudanças estiver pronto
e testado aqui.

| Serviço | Endereço |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Spring Boot) | http://localhost:8080 |
| Supabase API / Auth | http://127.0.0.1:54321 |
| Banco Postgres | `127.0.0.1:54322`, usuário `postgres`, senha `postgres` |
| Supabase Studio (ver e editar dados) | http://127.0.0.1:54323 |
| Mailpit (e-mails de confirmação e senha) | http://127.0.0.1:54324 |

Os valores locais são os padrões públicos do Supabase CLI e só funcionam em
`127.0.0.1`. As credenciais de produção continuam apenas no Railway e no seu
`backend/.env`, que o perfil local ignora.

## Pré-requisitos

- **Docker Desktop** em execução.
- Java 17, Node.js 22 (os mesmos do README).

## Primeira vez

Na raiz do repositório (PowerShell):

```powershell
# 1. Supabase local (a primeira execução baixa as imagens, alguns minutos)
npx supabase@2.121.0 start

# 2. Backend com o perfil local: o Flyway cria as tabelas no banco local
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

Com o backend no ar (`Started PlataformaApplication`), em **outro terminal**,
na raiz:

```powershell
# 3. Gatilho de cadastro, RLS e Storage (depende das tabelas do passo 2)
.\scripts\aplicar-supabase-local.ps1

# 4. Frontend apontando para o Supabase local
cd frontend
npm install
npm run dev:local
```

No macOS/Linux o passo 3 é `./scripts/aplicar-supabase-local.sh`.

Se `npx supabase start` falhar baixando imagens de `public.ecr.aws`, rode com
o Docker Hub: `$env:SUPABASE_INTERNAL_IMAGE_REGISTRY = "docker.io"` antes do
comando.

## Dia a dia

```powershell
npx supabase@2.121.0 start                                   # se não estiver rodando
cd backend;  .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
cd frontend; npm run dev:local
```

Os dados ficam salvos entre reinícios. `npx supabase@2.121.0 stop` desliga os
containers e mantém os dados.

## Testando de ponta a ponta

1. Abra http://localhost:5173/cadastro e cadastre-se com qualquer e-mail
   (pode ser inventado, nenhum e-mail sai da máquina).
2. Abra o Mailpit (http://127.0.0.1:54324), abra o e-mail de confirmação e
   clique no link. Ele volta para `localhost:5173`.
3. Entre com o e-mail e a senha cadastrados.
4. Confira no Studio (http://127.0.0.1:54323 → *Table Editor* → `usuario`)
   que a linha foi criada com `auth_id` preenchido, e acompanhe ali cada dado
   gravado pelas telas.

Primeiro administrador local, no *SQL Editor* do Studio:

```sql
update public.usuario
   set perfil_id = (select id from public.perfil where nome = 'ADMIN')
 where email = '<seu-email-local>';
```

## Mudanças no banco

- Tabelas e colunas: nova migration Flyway em
  `backend/src/main/resources/db/migration` (ex.: `V19__...sql`). Ela roda ao
  reiniciar o backend local.
- Toda tabela nova precisa de RLS: acrescente a política em um novo arquivo
  de `supabase/migrations` e rode de novo o script do passo 3.
- Para recomeçar o banco local do zero: `npx supabase@2.121.0 db reset`, e
  depois os passos 2 e 3.

## Antes do deploy

1. Testes automáticos: `.\mvnw.cmd test` (backend) e
   `npm run lint; npm run build; npm test` (frontend).
2. Fluxo completo testado localmente, como acima.
3. Só então: PR para `main` e merge, que publica no Railway. Migrations novas
   do Flyway são aplicadas no banco de produção quando o backend sobe; as de
   `supabase/migrations` são aplicadas à mão no SQL Editor de produção.
