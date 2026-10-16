package br.com.romenig.plataforma.edital;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repositorio dos editais aprovados (HU07, criterio 3).
 *
 * <p>{@code existsByTituloAndOrgaoAndAno} e a segunda metade da deduplicacao:
 * no momento da aprovacao, a mesma combinacao titulo+orgao+ano de um edital ja
 * aprovado impede a duplicidade mesmo que o arquivo tenha sido outro.
 */
public interface EditalRepository extends JpaRepository<Edital, Long> {

    @EntityGraph(attributePaths = "pdf")
    @Query("select edital from Edital edital where edital.id = :id")
    Optional<Edital> findComPdfById(@Param("id") Long id);

    boolean existsByTituloAndOrgaoAndAno(String titulo, String orgao, Integer ano);

    List<Edital> findAllByOrderByTituloAsc();

    boolean existsByPdf_Id(Long pdfId);
}
