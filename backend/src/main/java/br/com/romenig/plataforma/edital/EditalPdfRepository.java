package br.com.romenig.plataforma.edital;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositorio do PDF original do edital (HU07, incremento A).
 *
 * <p>A busca pelo hash permite distinguir uma importacao existente de um
 * PDF legado que ja esteja associado a um curso aprovado.
 */
public interface EditalPdfRepository extends JpaRepository<EditalPdf, Long> {

    Optional<EditalPdf> findBySha256(String sha256);
}
