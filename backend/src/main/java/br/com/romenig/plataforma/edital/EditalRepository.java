package br.com.romenig.plataforma.edital;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositorio dos editais aprovados (HU07, criterio 3).
 *
 * <p>{@code existsByTituloAndOrgaoAndAno} e a segunda metade da deduplicacao:
 * no momento da aprovacao, a mesma combinacao titulo+orgao+ano de um edital ja
 * aprovado impede a duplicidade mesmo que o arquivo tenha sido outro.
 */
public interface EditalRepository extends JpaRepository<Edital, Long> {

    boolean existsByTituloAndOrgaoAndAno(String titulo, String orgao, Integer ano);

    List<Edital> findAllByOrderByTituloAsc();
}