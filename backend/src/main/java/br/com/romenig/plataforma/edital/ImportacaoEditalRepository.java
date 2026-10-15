package br.com.romenig.plataforma.edital;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositorio das importacoes de edital (HU07, incremento A).
 */
public interface ImportacaoEditalRepository extends JpaRepository<ImportacaoEdital, Long> {

    List<ImportacaoEdital> findAllByOrderByCriadoEmDesc();

    boolean existsByPdf_Id(Long pdfId);
}