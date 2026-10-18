#!/usr/bin/env sh
# Aplica supabase/migrations (vinculo com auth.users, gatilho de cadastro, RLS
# e Storage) no Supabase LOCAL. Rode depois que o backend subir uma vez com o
# perfil local, porque estes arquivos dependem das tabelas criadas pelo Flyway.
# Os arquivos sao idempotentes: pode rodar de novo sem problema.
set -eu
cd "$(dirname "$0")/.."
CONTAINER=supabase_db_plataforma-de-estudos
for arquivo in supabase/migrations/*.sql; do
  echo "Aplicando $arquivo"
  docker exec -i -e PGOPTIONS=-cclient_min_messages=warning "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < "$arquivo"
done
echo "Supabase local pronto."
