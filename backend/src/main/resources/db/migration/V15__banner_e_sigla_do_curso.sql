-- Sigla do orgao exibida na capa do card do curso. Gerada a partir do nome do
-- orgao quando o edital e aprovado e editavel pelo admin; nula nos editais
-- antigos, que mostram a sigla calculada ate o admin salvar uma.
ALTER TABLE edital ADD COLUMN IF NOT EXISTS sigla VARCHAR(20);

-- Banner do card do curso, enviado pelo admin. A imagem ja chega normalizada
-- (JPEG de ate 1600 px de largura) e sai junto com o curso.
CREATE TABLE edital_banner (
    edital_id     BIGINT PRIMARY KEY REFERENCES edital (id) ON DELETE CASCADE,
    imagem        BYTEA NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL,
    CHECK (OCTET_LENGTH(imagem) > 0 AND OCTET_LENGTH(imagem) <= 2097152)
);
