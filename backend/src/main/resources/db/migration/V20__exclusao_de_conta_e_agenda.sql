-- ---------------------------------------------------------------------------
-- V20 - Exclusao de conta (HU15/HU16) e agenda do cronograma (HU18).
--
-- identidade_excluida: ids do Supabase Auth de contas excluidas. Um access
-- token emitido antes da exclusao continua valido ate expirar (cerca de 1 h);
-- com este registro o backend recusa esse token em vez de recriar um perfil
-- vazio para ele. Um novo cadastro com o mesmo e-mail gera outro id e entra
-- normalmente.
--
-- agenda_do_cronograma: link secreto da agenda (.ics) de cada aluno. Fica em
-- tabela propria, sem acesso pela Data API (RLS sem politicas em
-- supabase/migrations), e sai junto com o usuario.
-- ---------------------------------------------------------------------------

CREATE TABLE identidade_excluida (
    auth_id     UUID PRIMARY KEY,
    excluida_em TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE agenda_do_cronograma (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuario (id) ON DELETE CASCADE,
    token      VARCHAR(64) NOT NULL,
    criado_em  TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_agenda_do_cronograma_token UNIQUE (token)
);
