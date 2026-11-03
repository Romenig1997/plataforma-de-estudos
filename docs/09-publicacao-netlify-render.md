# Publicação no Netlify (frontend) e no Render (backend)

**Esta é a publicação em produção desde 03/11/2026.** O Railway
([06-publicacao-no-railway.md](06-publicacao-no-railway.md)) foi desligado;
os passos abaixo ficam como referência para recriar os serviços.

| Parte | Onde roda | Arquivo de configuração |
| --- | --- | --- |
| Interface (React) | Netlify | `netlify.toml` |
| API (Spring Boot, Docker) | Render, plano gratuito | `render.yaml` + `backend/Dockerfile` |
| Banco, Auth e Storage | Supabase (não muda) | — |

O navegador fala só com o domínio do Netlify. O Netlify repassa `/api/*`
para o Render, como o nginx faz no Railway. Por isso o código do frontend
não muda e os links da agenda (`.ics`) usam o endereço do Netlify.

> Na migração, o Railway ficou ligado até o passo 5 e depois foi desligado.
> Onde abaixo diz "igual ao Railway", use os valores atuais do Render/Netlify.

## 1. Backend no Render

1. Entre em <https://render.com> com a conta do GitHub e autorize o
   repositório `plataforma-de-estudos`.
2. **New → Blueprint** → escolha o repositório. O Render lê o `render.yaml`
   e mostra o serviço `plataforma-estudos-api` (Docker, plano Free).
3. Preencha as variáveis pedidas com **os mesmos valores do Railway**
   (serviço do backend → *Variables*):

   | Variável | Valor |
   | --- | --- |
   | `DB_URL` | igual ao Railway |
   | `DB_USERNAME` | igual ao Railway |
   | `DB_PASSWORD` | igual ao Railway |
   | `SUPABASE_URL` | igual ao Railway |
   | `SUPABASE_ANON_KEY` | igual ao Railway (chave pública, nunca a `service_role`) |
   | `CORS_ORIGINS` | deixe `https://exemplo.netlify.app` por enquanto; o passo 3 corrige |

   Se o Railway tiver outras variáveis no backend (por exemplo
   `PLATAFORMA_IA_TIPO`, `IA_API_KEY` ou `SUPABASE_JWT_SECRET`), cadastre-as
   também em *Environment* no Render, com o mesmo valor.
4. **Apply**. O primeiro build leva de 5 a 10 minutos.
5. Anote a URL do serviço (ex.: `https://plataforma-estudos-api.onrender.com`)
   e abra `<URL>/actuator/health`. Deve aparecer `{"status":"UP"}`.

Se a URL for diferente de `https://plataforma-estudos-api.onrender.com`
(nome já usado por outra pessoa), avise para trocar o endereço no
`netlify.toml` (regra `/api/*`).

## 2. Frontend no Netlify

1. Entre em <https://app.netlify.com> com a conta do GitHub.
2. **Add new site → Import an existing project → GitHub** → escolha o
   repositório. O Netlify lê o `netlify.toml`: não mude base, comando nem
   pasta de publicação.
3. Antes do deploy, em **Environment variables**, adicione (mesmos valores
   do serviço de frontend no Railway):

   ```text
   VITE_SUPABASE_URL=<igual ao Railway>
   VITE_SUPABASE_ANON_KEY=<igual ao Railway>
   ```

   Elas vão para o código do site, por isso só a chave pública.
4. **Deploy**. Anote a URL (ex.: `https://<nome>.netlify.app`). Em
   *Site configuration → Change site name* dá para escolher um nome melhor.

## 3. Ligar as duas partes

1. No Render → serviço → **Environment**: troque `CORS_ORIGINS` pela URL do
   Netlify, sem barra no final (ex.: `https://<nome>.netlify.app`). Salve; o
   Render reinicia o serviço.

   O proxy do Netlify repassa o cabeçalho `Origin` do navegador, e o backend
   recusa origens fora dessa lista.

## 4. Supabase Auth

Em **Authentication → URL Configuration**:

1. **Site URL**: troque pela URL do Netlify.
2. **Redirect URLs**: adicione `https://<nome>.netlify.app/**`.

Sem isso, a confirmação de cadastro e o "esqueci a senha" mandam o aluno
para o Railway.

## 5. Teste antes de desligar o Railway

- `https://<render>/actuator/health` → `UP`.
- `https://<netlify>/` abre a tela inicial.
- `https://<netlify>/api/editais` sem login → erro 401 (prova que o proxy
  chega ao backend).
- Cadastro de um aluno novo: o e-mail de confirmação volta para o Netlify.
- Login, curso com PDF, planner, cronograma, questões, desempenho.
- Cronograma → *Adicionar à minha agenda*: o link começa com o endereço do
  Netlify. Quem já assinou a agenda pelo endereço do Railway precisa assinar
  de novo.
- Admin → importar um edital em PDF grande.

Tudo certo? Aí sim, no Railway, apague ou pause os dois serviços.

## Limites do plano gratuito

- O backend no Render **dorme após 15 minutos sem acesso** e leva cerca de
  1 minuto para acordar. O proxy do Netlify espera no máximo uns 26 s: na
  primeira visita depois de dormir, o site mostra a tela "O servidor gratuito
  está acordando…" e tenta de novo sozinho até o backend responder.
- Antes de apresentar ou gravar, abra `https://<render>/actuator/health` e
  espere o `UP`.
- 750 horas de execução por mês no Render, o suficiente para um serviço.
- O Supabase gratuito pausa o projeto após 7 dias sem uso: acesse o site
  pelo menos uma vez por semana.
