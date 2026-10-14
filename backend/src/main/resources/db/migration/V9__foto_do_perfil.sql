CREATE TABLE foto_perfil (
 usuario_id BIGINT PRIMARY KEY REFERENCES usuario(id),
 imagem BYTEA NOT NULL,
 CHECK (OCTET_LENGTH(imagem) > 0 AND OCTET_LENGTH(imagem) <= 2097152)
);
