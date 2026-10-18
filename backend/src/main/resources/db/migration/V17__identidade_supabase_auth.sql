-- ---------------------------------------------------------------------------
-- V17 - Identidade no Supabase Auth (parte aditiva).
--
-- A partir desta versao quem guarda e confere senhas e o Supabase Auth
-- (auth.users). A tabela `usuario` continua sendo o perfil da aplicacao, com o
-- papel (perfil_id -> perfil) e todas as chaves estrangeiras que ja existiam;
-- ela passa a apontar para a identidade do Supabase pela coluna `auth_id`.
--
-- Nada aqui apaga dados:
--   * auth_id comeca nulo nas contas antigas. Quando a pessoa entra pela
--     primeira vez com o Supabase Auth usando o mesmo e-mail, a conta antiga
--     e vinculada e o progresso e preservado;
--   * avatar_url guarda a URL publica da foto no Supabase Storage;
--   * atualizado_em registra a ultima alteracao do perfil.
--
-- A view `profiles` expoe o contrato pedido no escopo (id, nome, avatar_url,
-- role, created_at, updated_at) sem duplicar dados. No Supabase ela recebe
-- security_invoker na pasta supabase/migrations, para respeitar o RLS.
--
-- A chave estrangeira para auth.users, o RLS e o gatilho que cria o perfil
-- ficam em supabase/migrations: o schema `auth` so existe no Supabase, e o H2
-- dos testes executa este mesmo arquivo.
-- ---------------------------------------------------------------------------

ALTER TABLE usuario ADD COLUMN auth_id UUID;
ALTER TABLE usuario ADD CONSTRAINT uk_usuario_auth_id UNIQUE (auth_id);

ALTER TABLE usuario ADD COLUMN avatar_url VARCHAR(500);

ALTER TABLE usuario ADD COLUMN atualizado_em TIMESTAMP WITH TIME ZONE;
UPDATE usuario SET atualizado_em = COALESCE(criado_em, CURRENT_TIMESTAMP);
ALTER TABLE usuario ALTER COLUMN atualizado_em SET NOT NULL;

-- O gatilho do Supabase insere perfis diretamente: as datas nascem preenchidas.
ALTER TABLE usuario ALTER COLUMN criado_em SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE usuario ALTER COLUMN atualizado_em SET DEFAULT CURRENT_TIMESTAMP;

-- A senha deixa de ser gravada pela aplicacao. A coluna sai na V18.
ALTER TABLE usuario ALTER COLUMN senha_hash DROP NOT NULL;

CREATE VIEW profiles AS
SELECT u.auth_id      AS id,
       u.nome         AS nome,
       u.avatar_url   AS avatar_url,
       p.nome         AS role,
       u.criado_em    AS created_at,
       u.atualizado_em AS updated_at
  FROM usuario u
  JOIN perfil p ON p.id = u.perfil_id
 WHERE u.auth_id IS NOT NULL;
