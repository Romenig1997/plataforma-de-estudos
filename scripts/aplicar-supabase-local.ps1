# Aplica supabase/migrations (vinculo com auth.users, gatilho de cadastro, RLS
# e Storage) no Supabase LOCAL. Rode depois que o backend subir uma vez com o
# perfil local, porque estes arquivos dependem das tabelas criadas pelo Flyway.
# Os arquivos sao idempotentes: pode rodar de novo sem problema.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$container = 'supabase_db_plataforma-de-estudos'
Get-ChildItem supabase/migrations/*.sql | Sort-Object Name | ForEach-Object {
    Write-Host "Aplicando $($_.Name)"
    # Copia o arquivo para o container: o pipe do PowerShell troca acentos por "?".
    docker cp $_.FullName "${container}:/tmp/$($_.Name)"
    if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel copiar $($_.Name). O Supabase local esta rodando?" }
    docker exec -e PGOPTIONS=-cclient_min_messages=warning $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "/tmp/$($_.Name)"
    if ($LASTEXITCODE -ne 0) { throw "Falha ao aplicar $($_.Name)" }
}
Write-Host 'Supabase local pronto.'
