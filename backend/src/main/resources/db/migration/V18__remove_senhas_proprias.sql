-- ---------------------------------------------------------------------------
-- V18 - Remove o armazenamento proprio de senhas e sessoes.
--
-- Com o Supabase Auth, a aplicacao nao guarda senha, token de confirmacao ou
-- de redefinicao, nem versao de sessao:
--   * senha_hash (PBKDF2 da HU01): o Supabase Auth nao importa esse formato,
--     entao o hash nao serve para nada e manter a coluna contrariaria a regra
--     "senhas gerenciadas exclusivamente pelo Supabase Auth";
--   * sessao_versao: o encerramento de sessoes passa a ser do Supabase Auth;
--   * token_conta: confirmacao de e-mail e redefinicao de senha passam a ser
--     enviadas pelo Supabase Auth.
--
-- Esta e a unica etapa sem volta da migracao. Os perfis, o papel e todo o
-- progresso dos alunos permanecem; quem tinha conta antiga se cadastra de novo
-- no Supabase Auth com o mesmo e-mail e a conta e vinculada (ver V17).
-- ---------------------------------------------------------------------------

DROP TABLE token_conta;

ALTER TABLE usuario DROP COLUMN senha_hash;
ALTER TABLE usuario DROP COLUMN sessao_versao;
