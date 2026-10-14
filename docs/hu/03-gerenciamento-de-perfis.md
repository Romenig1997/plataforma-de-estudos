# HU03 — Gerenciamento de Perfis

**Status:** Implementada e validada em 13/10/2026.
**Dependências:** HU01, HU02.

## Critérios de aceite acadêmicos

1. Interface exibe dados atuais.
2. Usuário pode alterar foto e nome.
3. Alterações refletem no banco imediatamente.

## Dados e decisões adicionais

Nome, e-mail, meta de estudo semanal e objetivo/motivação já eram editáveis.
O e-mail é normalizado/único; meta opcional de 1 a 168h e objetivo até 500
caracteres. Troca de senha permanece fora do escopo por decisão do responsável.

Foto: PNG/JPEG até 2 MB, até 4096 pixels por lado e 8 milhões de pixels. O
servidor verifica o formato real/decodificação, reduz a até 512px sem aumentar
imagens pequenas e salva PNG sem metadados de origem. Uma foto por usuário;
substituir ou remover não altera os demais dados. Prévia local não envia nada
até clicar “Salvar foto”. Remoção é idempotente. Falha mantém a foto salva.

## Backend

GET/PUT /api/perfil: dados próprios e temFoto. Foto em recurso independente:
- GET /api/perfil/foto: PNG privado com autenticação e no-store, ou 204.
- POST multipart (arquivo): valida/salva e retorna a foto canônica.
- DELETE: remove a foto da própria sessão, 204.

Não recebe ID de outro usuário. FotoPerfilService bloqueia a linha da conta ao
salvar/remover para serializar concorrência. V9 cria foto_perfil com FK/PK
usuario_id e imagem BYTEA; coluna com limite 2 MB. V9 aplicada no Supabase.
A imagem fica separada de usuario para não carregar bytes em toda consulta.

## Frontend

TelaPerfil exibe os dados e FotoPerfilEditor mostra foto atual/ausência,
seletor, prévia, salvar, cancelar seleção e remover. Tratamento de erro, limites,
sessão expirada, recarga e URLs de blob liberadas ao desmontar.
Não usa serviço pago ou armazenamento público.

## Verificação

PerfilTest (12), FotoPerfilTest (6); perfil/TelaPerfil existentes; fotoPerfil
(4), FotoPerfilEditor (6), E2E foto (2). Projeto: 128 backend, 136 frontend,
21 E2E, build e lint limpos. E2E 320/1280px e axe sem serious/critical.

Validação real com conta temporária: imagem persistiu após novo login, nome
alterado preservou a foto e remoção retornou ausência. Imagem normalizada de
640×400 para 512×320. Conta e foto temporárias removidas; usuário real intacto.
Evidência: output/validacao/foto-perfil-integracao-real.json e perfil-foto-hu03.jpg.

Todos os critérios acadêmicos desta HU atendidos. Conferência das nove HUs em
../validacao-final-das-hus.md.
