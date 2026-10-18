-- ---------------------------------------------------------------------------
-- Dados de demonstracao para o Supabase LOCAL (nunca rode em producao).
--
-- Cria dois cursos com disciplinas, topicos e questoes publicadas, para as
-- telas terem o que mostrar no desenvolvimento. Idempotente: so insere se o
-- curso ainda nao existir.
--
-- Uso: depois de scripts/aplicar-supabase-local, rode
--   docker exec -i supabase_db_plataforma-de-estudos psql -U postgres -d postgres < supabase/seed-local.sql
-- ---------------------------------------------------------------------------

do $$
declare
  v_edital bigint;
  v_concurso bigint;
  v_disciplina bigint;
  v_conteudo bigint;
  v_questao bigint;
  v_curso record;
  v_disc record;
  v_topico text;
  v_pagina int;
begin
  for v_curso in
    select * from (values
      ('Soldado PM-PE 2026', 'Polícia Militar de Pernambuco', 2026, 'PMPE', 'Concurso Soldado PM-PE', 'Soldado'),
      ('Técnico Judiciário TRT-6', 'Tribunal Regional do Trabalho da 6ª Região', 2026, 'TRT6', 'Concurso TRT-6', 'Técnico Judiciário')
    ) as c(titulo, orgao, ano, sigla, concurso, cargo)
  loop
    if exists (select 1 from public.edital where titulo = v_curso.titulo) then
      continue;
    end if;

    insert into public.edital (titulo, orgao, ano, sigla, criado_em)
    values (v_curso.titulo, v_curso.orgao, v_curso.ano, v_curso.sigla, now())
    returning id into v_edital;

    insert into public.concurso (edital_id, nome) values (v_edital, v_curso.concurso) returning id into v_concurso;
    insert into public.cargo (concurso_id, nome) values (v_concurso, v_curso.cargo);

    v_pagina := 10;
    for v_disc in
      select * from (values
        ('Língua Portuguesa', array['Compreensão e interpretação de textos', 'Ortografia oficial', 'Concordância verbal e nominal', 'Regência verbal e nominal', 'Crase']),
        ('Direito Constitucional', array['Princípios fundamentais', 'Direitos e garantias fundamentais', 'Organização do Estado', 'Administração pública']),
        ('Raciocínio Lógico', array['Proposições e conectivos', 'Tabelas-verdade', 'Equivalências lógicas', 'Problemas de contagem']),
        ('Noções de Informática', array['Sistemas operacionais', 'Editores de texto e planilhas', 'Segurança da informação'])
      ) as d(nome, topicos)
    loop
      insert into public.disciplina (edital_id, nome, pagina) values (v_edital, v_disc.nome, v_pagina) returning id into v_disciplina;
      foreach v_topico in array v_disc.topicos loop
        v_pagina := v_pagina + 1;
        insert into public.conteudo (disciplina_id, nome, pagina) values (v_disciplina, v_topico, v_pagina) returning id into v_conteudo;
      end loop;

      -- Uma questao publicada por disciplina, no ultimo topico.
      insert into public.questao (edital_id, conteudo_id, enunciado, gabarito, explicacao, publicada)
      values (
        v_edital, v_conteudo,
        'Sobre ' || lower(v_topico) || ', assinale a alternativa correta.',
        1,
        'A alternativa B apresenta a definição adotada pela banca para ' || lower(v_topico) || '.',
        true
      ) returning id into v_questao;
      insert into public.questao_alternativa (questao_id, ordem, texto) values
        (v_questao, 0, 'Trata-se de tema não cobrado em provas de concurso.'),
        (v_questao, 1, 'É um conceito central do conteúdo e aparece com frequência nas provas.'),
        (v_questao, 2, 'Aplica-se somente a provas discursivas.'),
        (v_questao, 3, 'Foi revogado pela legislação mais recente.');
      v_pagina := v_pagina + 5;
    end loop;
  end loop;
end $$;
