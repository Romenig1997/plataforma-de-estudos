package br.com.romenig.plataforma.edital;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositorio do PDF original do edital (HU07, incremento A).
 *
 * <p>{@code existsBySha256} e a primeira metade da deduplicacao: o mesmo
 * arquivo carregado outra vez (mesmo conteudo, outro nome) e recusado.
 */
public interface EditalPdfRepository extends JpaRepository<EditalPdf, Long> {

    boolean existsBySha256(String sha256);
}