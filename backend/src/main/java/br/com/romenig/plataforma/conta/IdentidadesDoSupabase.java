package br.com.romenig.plataforma.conta;

import java.util.UUID;

/**
 * Remove a identidade (login) de uma conta no Supabase Auth.
 *
 * <p>Em producao e o {@link IdentidadesNoBanco}, que apaga a linha de
 * {@code auth.users} pela mesma conexao do backend; nos testes, uma
 * implementacao em memoria, ja que o H2 nao tem o schema {@code auth}.
 */
public interface IdentidadesDoSupabase {

    void remover(UUID authId);
}
