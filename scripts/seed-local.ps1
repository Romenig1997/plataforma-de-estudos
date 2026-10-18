# Cria os cursos de demonstracao e as contas admin/aluno no Supabase LOCAL.
# O arquivo e copiado para o container antes de rodar: enviar pelo pipe do
# PowerShell troca os acentos por "?".
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$container = 'supabase_db_plataforma-de-estudos'
docker cp supabase/seed-local.sql "${container}:/tmp/seed-local.sql"
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel copiar o seed para o container. O Supabase local esta rodando?' }
docker exec -e PGOPTIONS=-cclient_min_messages=warning $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f /tmp/seed-local.sql
if ($LASTEXITCODE -ne 0) { throw 'Falha ao aplicar o seed.' }
Write-Host 'Dados de demonstracao prontos: admin@local.test e aluno@local.test, senha Estuda@2026.'
