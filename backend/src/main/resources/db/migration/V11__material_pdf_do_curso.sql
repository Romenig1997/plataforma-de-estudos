-- Um curso pode ter um material didático público no Supabase Storage.
-- O URL pertence ao curso (edital), não aos demais cursos da plataforma.
ALTER TABLE edital ADD COLUMN IF NOT EXISTS material_pdf_url TEXT;
