# Operação e publicação

Este documento reúne os requisitos para colocar a plataforma em uso contínuo.
Ele complementa as HUs, que foram validadas como entrega acadêmica.

## Segurança de contas

A V10 adiciona confirmação de e-mail, redefinição de senha, revogação de
sessões e limitação de tentativas. O token recebido por e-mail tem 32 bytes
aleatórios, expira e é armazenado somente como SHA-256 no banco. A senha nova,
o reset e o encerramento de sessões incrementam a versão da sessão e tornam
tokens anteriores inválidos.

Para ativar o envio real, configure no ambiente de publicação:

```text
FRONTEND_URL=https://seu-dominio
CORS_ORIGINS=https://seu-dominio
EMAIL_EXIGIR_CONFIRMACAO=true
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_REMETENTE=contato@seu-dominio.com
SMTP_AUTH=true
SMTP_STARTTLS=true
```

O remetente precisa ser autorizado pelo provedor. Sem SMTP válido, a criação
de uma conta nova retorna indisponibilidade em vez de cadastrar alguém sem ter
como entregar o link de ativação. Contas existentes são preservadas como
verificadas na migration.

O limite de tentativas funciona por processo: cadastro (5/h por IP), login
(8/15 min por IP+e-mail) e reenvios (3/h por IP+e-mail). Para múltiplas
instâncias, a próxima evolução é mover essas chaves para Redis ou para o WAF
do provedor de hospedagem.

## Verificação antes de publicar

O workflow [validar.yml](../.github/workflows/validar.yml) executa testes do
backend, lint, build, testes do frontend, Playwright e build das imagens Docker
a cada push e pull request.

No ambiente local, use:

```powershell
cd backend; .\mvnw.cmd test
cd ../frontend; npm run lint; npm run build; npm test; npm run test:e2e
```

O Docker ainda deve ser executado em uma máquina com Docker Desktop antes de
uma publicação. A máquina atual não possui o Docker instalado. O Compose
agora encaminha `/api` do nginx para o backend e verifica
`/actuator/health` antes de iniciar o frontend.

## Monitoramento e cópias de segurança

- `GET /actuator/health` permite health checks sem revelar detalhes internos.
- Métricas e informações do Actuator exigem ADMIN; o acesso deve ficar
  restrito à rede de operação.
- Os logs do backend devem ser enviados pelo ambiente de hospedagem para uma
  retenção compatível com o suporte do projeto. Não registrar senhas, JWTs ou
  links de e-mail.
- Como PDFs e fotos ficam no PostgreSQL, o backup do banco inclui esses
  arquivos. Habilite backup diário no Supabase e teste uma restauração em um
  projeto separado antes da primeira publicação.
- Aplique migrations somente pelo backend validado e confira o histórico do
  Flyway após cada publicação.

## Sequência de publicação

1. Configurar SMTP, domínio, `FRONTEND_URL` e `CORS_ORIGINS`.
2. Executar a suíte completa e o build das imagens.
3. Fazer backup do Supabase.
4. Publicar o backend; o Flyway aplicará a V10 uma única vez.
5. Confirmar `/actuator/health`, cadastro, confirmação, login e recuperação
   de senha em uma conta de teste.
6. Publicar o frontend e conferir que `/api` é encaminhado ao backend.
