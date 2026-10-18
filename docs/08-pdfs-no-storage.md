# PDFs dos editais no Supabase Storage

## Por que mudou (auditoria)

Até a V18, o PDF original de cada edital ficava inteiro na coluna
`edital_pdf.bytes` (bytea, até 30 MB por arquivo). Isso gerava Database Egress
de três formas:

1. **Listagens arrastavam os PDFs.** `Edital.pdf` é `@OneToOne(fetch = EAGER)`
   e a entidade `EditalPdf` mapeava `bytes`. Por isso `GET /api/editais`
   carregava o bytea de **todos** os cursos, mesmo sem ninguém abrir um PDF.
   Essa rota é chamada em Meus cursos, Curso, Planner, Questões e outras telas.
   A lista de importações do admin fazia o mesmo, um PDF por linha.
2. **O leitor baixava o arquivo inteiro a cada visita.** A tela do curso fazia
   `GET /api/editais/{id}/pdf`, que respondia sem `Cache-Control`, e criava um
   Blob. Cada visita, em cada aba, era um novo download completo, e o arquivo
   passava pelo Postgres e depois pelo backend no Railway.
3. **O banco era o depósito de arquivos.** Todo download era Database Egress,
   a cota mais apertada do plano gratuito.

## Como ficou

| Parte | Antes | Agora |
|---|---|---|
| PDF novo | bytea em `edital_pdf.bytes` | bucket **privado** `editais-pdf`, caminho `editais/{sha256}.pdf`, `cache-control: max-age=31536000` |
| Banco | arquivo + metadados | só metadados: `caminho_storage`, `sha256`, `nome_original`, `tamanho_bytes`, `tipo` |
| Listar cursos | lia o bytea de todos os PDFs | `EditalPdf` não mapeia `bytes`; o bytea legado só é lido por `ArquivosDePdf`, um arquivo por vez |
| Leitor do aluno | Blob via Java a cada visita | `GET /api/editais/{id}/pdf/acesso` devolve uma URL assinada (1 h); o iframe abre direto do Storage |
| PDF legado | — | `origem: LEGADO`, e o leitor baixa por `GET /api/editais/{id}/pdf` com `Cache-Control: private, max-age=2592000` e `ETag` (uma revalidação responde 304 sem ler o banco) |
| Na mesma tela | — | o leitor obtém o PDF uma vez e reaproveita em todas as aulas, sem pedidos duplicados; só pede outra URL se a atual estiver a menos de 1 min de expirar |

### Segurança

- O bucket não é público. Sem uma URL assinada, o Storage recusa a leitura, e
  `object/public/...` responde erro.
- O backend fala com o Storage usando o **token da própria pessoa** e a chave
  pública (`apikey`), como nas fotos. Nenhum segredo e nenhuma chave
  service_role existem no backend ou no frontend.
- As políticas ficam em
  [`supabase/migrations/20261018000400_storage_pdfs_de_editais.sql`](../supabase/migrations/20261018000400_storage_pdfs_de_editais.sql):
  - **ADMIN**: envia, substitui, lê e apaga.
  - **Conta autenticada**: só lê (e só consegue assinar) PDFs ligados a um
    curso publicado, conferido pela função `public.pdf_de_curso_publicado`.
  - **anon**: nada.
- `GET /api/editais/{id}/pdf/acesso` exige sessão e responde
  `Cache-Control: no-store`, porque a URL assinada é uma credencial temporária.
  Quem tiver a URL lê o PDF até ela expirar. O prazo é configurável em
  `PDF_VALIDADE_URL_ASSINADA` (padrão `PT1H`).
- O cache dos PDFs é sempre `private`, nunca `public`, porque são rotas
  autenticadas.
- O bucket `avatars` não foi reaproveitado, porque é público e organizado por
  pasta de usuário.
- Excluir um curso apaga o objeto do Storage só **depois do commit**. Se a
  transação for desfeita, o arquivo continua lá.

## Ordem de implantação

1. Suba o backend. O Flyway aplica a **V19**: cria a coluna `caminho_storage`,
   torna `bytes` opcional e adiciona uma restrição que exige `bytes` ou
   `caminho_storage`. Nenhum dado é alterado.
2. Aplique `supabase/migrations/20261018000400_storage_pdfs_de_editais.sql` no
   SQL Editor (ou rode `scripts/aplicar-supabase-local` no ambiente local).
   Faça isso **antes** de importar um PDF novo. Sem o bucket, o upload
   responde 503 e nada é gravado.
3. Os PDFs antigos continuam abrindo pelo fallback, sem nenhuma ação.

## Migrar os PDFs legados (opcional, seguro)

Isto copia os PDFs para o Storage **sem apagar nada**. Pode ser feito aos
poucos.

1. **Backup.** No painel, confira em *Database → Backups* o backup diário (ou
   faça um `pg_dump` da tabela `edital_pdf`).
2. **Inventário.** No SQL Editor:
   ```sql
   select count(*) filter (where caminho_storage is null)      as legados,
          count(*) filter (where caminho_storage is not null)  as no_storage,
          pg_size_pretty(sum(octet_length(bytes)))              as bytea_total
     from public.edital_pdf;
   ```
3. **Cópia.** Entre no frontend como ADMIN. O access token da sessão fica no
   DevTools, em *Application → Local Storage → `plataforma:sessao` →
   `access_token`*. Ele expira em cerca de 1 hora; não o cole em lugar nenhum
   além do comando abaixo.
   ```bash
   curl -X POST "https://<api>/api/admin/editais/pdfs/migrar-para-storage?limite=10" \
        -H "Authorization: Bearer <access token do ADMIN>"
   ```
   Para cada PDF, o backend:
   1. lê o bytea;
   2. confere o SHA-256 com o registrado;
   3. envia para `editais/{sha256}.pdf`;
   4. baixa de volta e confere o SHA-256 de novo;
   5. só então grava `caminho_storage`.

   A resposta traz `migrados`, `falhas` (ids que ficaram como estavam) e
   `restantes`. Repita até `restantes` chegar a 0. Cada chamada processa no
   máximo 50 arquivos.

   Cada rodada lê do banco os PDFs que copia, ou seja, gera egress uma única
   vez. Prefira um horário de pouco uso.
4. **Conferência.** Abra alguns cursos como aluno. O leitor passa a carregar
   do Storage (a resposta de `/pdf/acesso` vem com `"origem":"STORAGE"`).
5. **Rollback**, se algo der errado, sem perda de dados, porque o bytea
   continua na linha:
   ```sql
   update public.edital_pdf set caminho_storage = null where id in (...);
   ```
6. **Limpeza do bytea (irreversível, só depois de dias de uso sem
   problemas).** Esta etapa **apaga dados**: só faça com backup recente e
   aprovação explícita.
   ```sql
   update public.edital_pdf set bytes = null where caminho_storage is not null;
   -- espaço de volta ao disco: vacuum full public.edital_pdf;  (bloqueia a tabela)
   ```

## Limites conhecidos

- **Storage Egress continua existindo.** O Supabase Storage com CDN tira os
  PDFs do Database Egress e permite cache, no navegador (durante a validade da
  URL) e na CDN. Mas cada download que não vem do cache conta como egress do
  Storage, que divide a mesma cota de egress do plano.
- **A URL assinada muda a cada assinatura.** O cache do navegador vale para a
  mesma URL, ou seja, durante a visita à tela e enquanto a URL não expira. Um
  aluno que volta no dia seguinte baixa o arquivo de novo, a menos que a CDN do
  Storage atenda.
- O download do ADMIN e o endpoint antigo, para PDFs que já estão no Storage,
  ainda passam o arquivo pelo backend. São usos raros.

## Evolução recomendada (não implementada)

Se os PDFs precisarem sair de vez da cota do Supabase, o próximo passo é
guardá-los em **Cloudflare R2** (sem cobrança de egress) ou em **Amazon S3 +
CloudFront**. A troca seria uma nova implementação de `ArmazenamentoDePdfs`
(enviar, baixar, assinar, remover), com URLs assinadas do próprio provedor. O
restante do fluxo continua igual.

Isso **não foi feito** porque exige uma decisão explícita de fornecedor, uma
conta, credenciais (chaves de acesso, que seriam segredos do backend) e as
variáveis correspondentes. Nada disso existe hoje no projeto.
