-- Preserva topicos reais de editais, que podem exceder 255 caracteres.
-- Ampliacao sem remover ou truncar conteudo existente; PostgreSQL e H2.
ALTER TABLE conteudo ALTER COLUMN nome TYPE TEXT;
