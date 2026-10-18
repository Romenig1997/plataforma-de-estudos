# Publicação no Railway

O projeto é um monorepo: o backend Java e o frontend React devem ser publicados
como **dois serviços do mesmo projeto Railway**. O `docker-compose.yml` serve
para o ambiente local; no Railway cada serviço é criado separadamente.

## 1. Serviço de backend

1. Crie um serviço a partir deste repositório.
2. Em **Settings → Source**, defina **Root Directory** como `/backend`.
3. O Railway encontrará o `backend/Dockerfile`. Não defina `start.sh` nem um
   Start Command: o `ENTRYPOINT` da imagem inicia o Spring Boot.
4. Em **Settings → Networking**, gere um domínio público para a API. A
   interface o usará como upstream HTTPS; os endpoints continuam protegidos
   pela autenticação da aplicação.
5. Em **Settings → Healthcheck**, use `/actuator/health`.
6. Em **Variables**, cadastre os valores de produção:

```text
DB_URL=jdbc:postgresql://<pooler>.supabase.com:5432/postgres?sslmode=require
DB_USERNAME=postgres.<ref-do-projeto>
DB_PASSWORD=<senha-do-banco>
SUPABASE_URL=https://<ref-do-projeto>.supabase.co
SUPABASE_ANON_KEY=<chave-anon-ou-publishable>
SUPABASE_BUCKET_FOTOS=avatars
SUPABASE_BUCKET_PDFS=editais-pdf
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

   - `SUPABASE_URL` é obrigatória: sem ela o backend não sobe.
   - `SUPABASE_JWT_SECRET` só é necessária se o projeto ainda assina os tokens
     com o segredo legado (HS256). Confira em *Project Settings → JWT Keys*:
     com chaves assimétricas (ES256/RS256) deixe-a ausente, pois o backend lê
     o JWKS público. Quando usada, é um **segredo**: cadastre como variável
     selada no Railway.
   - Nunca use a chave `service_role` em nenhum dos serviços.
   - Substitua `frontend` pelo nome exato dado ao serviço da interface.

7. Remova as variáveis da autenticação antiga, que não são mais lidas:
   `JWT_SECRET`, `FRONTEND_URL`, `EMAIL_*`, `SMTP_*`, `BREVO_API_KEY` e
   `MAIL_HEALTH_ENABLED`. Os e-mails de conta passaram para o Supabase Auth.

## 2. Serviço de frontend

1. Crie outro serviço a partir do mesmo repositório.
2. Em **Settings → Source**, defina **Root Directory** como `/frontend`.
3. O Railway encontrará o `frontend/Dockerfile` e servirá a SPA pelo nginx.
4. Em **Settings → Networking**, gere o domínio público. Ele será o endereço
   usado pelos alunos e pelos links de confirmação de e-mail.
5. Em **Variables**, defina:

```text
API_UPSTREAM=https://<dominio-publico-do-backend>
VITE_SUPABASE_URL=https://<ref-do-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave-anon-ou-publishable>
```

As variáveis `VITE_*` são lidas no **build** (o `frontend/Dockerfile` as
declara com `ARG`) e vão para o bundle: use apenas a chave pública. Depois de
alterá-las, faça um novo deploy do frontend; reiniciar não basta.

No projeto atual, o valor é `https://plataformaestuda-api.up.railway.app`.
O nginx encaminha `/api` no mesmo domínio da interface, portanto o navegador
não chama a API diretamente.

## 3. Supabase Auth

1. *Authentication → URL Configuration*: **Site URL** com o domínio público do
   frontend e, em **Redirect URLs**, `https://<frontend-publicado>/**`. Sem
   isso os links de confirmação e de redefinição voltam para localhost.
2. *Authentication → Emails → SMTP Settings*: configure um SMTP próprio (ex.:
   Brevo). O e-mail embutido do Supabase envia poucas mensagens por hora e só
   para membros do projeto.
3. Aplique `supabase/migrations` na ordem descrita no README, depois do
   primeiro deploy do backend (o Flyway aplica a V17 e a V18).

## 4. Publicação coordenada

O frontend novo não chama mais `POST /api/usuarios` e o backend novo não tem
mais esse endpoint: publique os dois serviços a partir do **mesmo commit**.
Cadastre as variáveis das seções 1 e 2 **antes** do deploy; o backend sem
`SUPABASE_URL` falha na inicialização.

## 5. Conferência do deploy

1. Aguarde o health check do backend retornar `UP`. Se não ficar `UP`, a
   causa estará nos logs: variável obrigatória ausente (`DB_URL`,
   `DB_USERNAME`, `DB_PASSWORD` ou `SUPABASE_URL`) ou conexão com o banco.
2. Abra o domínio público do frontend e crie uma conta de teste.
3. Confirme que o e-mail de confirmação aponta para o domínio público.
4. Confirme login, logout, recuperação de senha e uma página protegida.
5. Se o cadastro falhar com `unexpected_failure`, execute
   `supabase/verificacao/diagnosticar_cadastro.sql` (somente leitura) no SQL
   Editor e corrija o item que divergir do esperado.

Os detalhes de monorepo, portas e rede privada seguem a documentação oficial
do Railway: https://docs.railway.com/deployments/monorepo e
https://docs.railway.com/networking/domains/working-with-domains.
