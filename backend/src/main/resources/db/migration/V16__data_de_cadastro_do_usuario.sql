-- Data de cadastro da conta, para o indicador de novos cadastros do painel
-- admin. Contas criadas antes desta migration ficam com a data nula: o
-- painel as conta no total, mas nao entre os cadastros recentes.
ALTER TABLE usuario ADD COLUMN criado_em TIMESTAMP WITH TIME ZONE;
