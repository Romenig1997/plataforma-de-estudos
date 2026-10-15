# Publicação no Railway

O projeto é um monorepo: o backend Java e o frontend React devem ser publicados
como **dois serviços do mesmo projeto Railway**. O `docker-compose.yml` serve
para o ambiente local; no Railway cada serviço é criado separadamente.

## 1. Serviço de backend

1. Crie um serviço a partir deste repositório.
2. Em **Settings → Source**, defina **Root Directory** como `/backend`.
3. O Railway encontrará o `backend/Dockerfile`. Não defina `start.sh` nem um
   Start Command: o `ENTRYPOINT` da imagem inicia o Spring Boot.
4. Em **Settings → Networking**, mantenha o serviço sem domínio público. A
   interface usará a rede privada do Railway para falar com ele.
5. Em **Settings → Healthcheck**, use `/actuator/health`.
6. Em **Variables**, cadastre os valores de produção: `DB_URL`, `DB_USERNAME`,
   `DB_PASSWORD`, `JWT_SECRET`, `SMTP_REMETENTE` e
   `EMAIL_EXIGIR_CONFIRMACAO=true`.
7. Para enviar e-mails pelo Brevo no Railway, use a API HTTPS, que não depende
   da porta SMTP. Cadastre também:

```text
EMAIL_TRANSPORTE=brevo
BREVO_API_KEY=<sua-chave-de-api-do-Brevo>
MAIL_HEALTH_ENABLED=false
```

   `BREVO_API_KEY` é uma chave de API do Brevo, não a senha SMTP. O último
   valor desativa somente o indicador de saúde do SMTP, que não é usado nesse
   modo e pode ser bloqueado pelo plano do Railway.

Quando o frontend receber um domínio Railway, complete no backend:

```text
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
CORS_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

Substitua `frontend` pelo nome exato dado ao serviço da interface.

## 2. Serviço de frontend

1. Crie outro serviço a partir do mesmo repositório.
2. Em **Settings → Source**, defina **Root Directory** como `/frontend`.
3. O Railway encontrará o `frontend/Dockerfile` e servirá a SPA pelo nginx.
4. Em **Settings → Networking**, gere o domínio público. Ele será o endereço
   usado pelos alunos e pelos links de confirmação de e-mail.
5. Em **Variables**, defina:

```text
API_UPSTREAM=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
```

Substitua `backend` pelo nome exato dado ao serviço Java. O endereço privado
mantém a API fora da internet e permite que o nginx encaminhe `/api` no mesmo
domínio da interface.

## 3. Conferência do primeiro deploy

1. Aguarde o health check do backend retornar `UP`.
   Se ele não ficar `UP`, abra os logs do serviço backend: a causa será uma
   variável obrigatória ausente (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD` ou
   `JWT_SECRET`) ou a conexão com o banco.
2. Abra o domínio público do frontend e crie uma conta de teste.
3. Confirme que o e-mail aponta para o domínio público, não para localhost.
4. Confirme login, recuperação de senha e carregamento de uma página protegida.
5. Depois de confirmar tudo, associe um domínio próprio ao serviço frontend e
   atualize `FRONTEND_URL` e `CORS_ORIGINS` no backend.

Os detalhes de monorepo, portas e rede privada seguem a documentação oficial
do Railway: https://docs.railway.com/deployments/monorepo e
https://docs.railway.com/networking/domains/working-with-domains.
