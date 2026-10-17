package br.com.romenig.plataforma.edital;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EditalBannerRepository extends JpaRepository<EditalBanner, Long> {

    @Query("select new br.com.romenig.plataforma.edital.VersaoDoBanner(b.editalId, b.atualizadoEm) from EditalBanner b")
    List<VersaoDoBanner> listarVersoes();
}
