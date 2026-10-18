package br.com.romenig.plataforma.perfil.foto;

import java.util.UUID;

/**
 * Onde as fotos de perfil ficam guardadas.
 *
 * <p>Em producao e o Supabase Storage ({@link ArmazenamentoSupabase}); nos
 * testes, uma implementacao em memoria, sem rede.
 */
public interface ArmazenamentoDeFotos {

    /**
     * Grava a imagem PNG na pasta da identidade e devolve a URL publica.
     *
     * @param dono           {@code auth.users.id}: o arquivo fica em {@code {dono}/...}
     * @param png            imagem ja normalizada
     * @param tokenDoUsuario access token da propria pessoa, conferido pelas
     *                       politicas do Storage
     * @throws ArmazenamentoIndisponivelException se o Storage recusar ou nao responder
     */
    String enviar(UUID dono, byte[] png, String tokenDoUsuario);

    /** Apaga o arquivo da URL informada. Falhas sao apenas registradas. */
    void remover(String url, String tokenDoUsuario);
}
