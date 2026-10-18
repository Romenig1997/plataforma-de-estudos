-- ---------------------------------------------------------------------------
-- V19 - PDFs de edital no Supabase Storage.
--
-- Ate a V18 o arquivo inteiro ficava em edital_pdf.bytes (bytea). Cada leitura
-- de PDF - e, por causa do mapeamento EAGER, cada listagem de cursos - saia do
-- Postgres e contava como Database Egress.
--
-- A partir daqui:
--   * PDFs novos ficam no bucket privado "editais-pdf"
--     (supabase/migrations/20261018000400_storage_pdfs_de_editais.sql), no
--     caminho imutavel editais/{sha256}.pdf. A linha guarda so os metadados:
--     caminho_storage, sha256, nome, tamanho e tipo; bytes fica NULL.
--   * PDFs antigos continuam com bytes preenchido e caminho_storage NULL, e
--     seguem servidos pelo endpoint antigo ate serem migrados
--     (docs/08-pdfs-no-storage.md). Nada e apagado por esta migration.
--
-- A restricao garante que toda linha aponta para algum conteudo.
--
-- Idempotente: o banco de producao ja tinha a coluna caminho_storage criada
-- fora do Flyway. Cada passo so cria o que falta e normaliza o que ja existe
-- (tipo da coluna e restricoes recriadas com o nome esperado).
-- ---------------------------------------------------------------------------

ALTER TABLE edital_pdf ADD COLUMN IF NOT EXISTS caminho_storage VARCHAR(255);

ALTER TABLE edital_pdf DROP CONSTRAINT IF EXISTS uk_edital_pdf_caminho_storage;

ALTER TABLE edital_pdf DROP CONSTRAINT IF EXISTS ck_edital_pdf_conteudo;

ALTER TABLE edital_pdf ALTER COLUMN caminho_storage SET DATA TYPE VARCHAR(255);

ALTER TABLE edital_pdf ALTER COLUMN bytes DROP NOT NULL;

ALTER TABLE edital_pdf ADD CONSTRAINT uk_edital_pdf_caminho_storage UNIQUE (caminho_storage);

ALTER TABLE edital_pdf ADD CONSTRAINT ck_edital_pdf_conteudo
    CHECK (bytes IS NOT NULL OR caminho_storage IS NOT NULL);
