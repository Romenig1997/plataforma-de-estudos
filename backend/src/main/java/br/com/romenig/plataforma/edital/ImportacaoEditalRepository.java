package br.com.romenig.plataforma.edital;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repositorio das importacoes de edital (HU07, incremento A).
 */
public interface ImportacaoEditalRepository extends JpaRepository<ImportacaoEdital, Long> {

    @EntityGraph(attributePaths = "pdf")
    @Query("select importacao from ImportacaoEdital importacao where importacao.id = :id")
    Optional<ImportacaoEdital> findComPdfById(@Param("id") Long id);

    List<ImportacaoEdital> findAllByOrderByCriadoEmDesc();

    Optional<ImportacaoEdital> findFirstByPdf_Id(Long pdfId);

    boolean existsByPdf_Id(Long pdfId);

    List<ImportacaoEdital> findByEditalAprovado_Id(Long editalId);
}
