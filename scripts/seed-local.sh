#!/usr/bin/env sh
# Cria os cursos de demonstracao e as contas admin/aluno no Supabase LOCAL.
set -eu
cd "$(dirname "$0")/.."
CONTAINER=supabase_db_plataforma-de-estudos
docker cp supabase/seed-local.sql "$CONTAINER:/tmp/seed-local.sql"
docker exec -e PGOPTIONS=-cclient_min_messages=warning "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f /tmp/seed-local.sql
echo "Dados de demonstracao prontos: admin@local.test e aluno@local.test, senha Estuda@2026."
