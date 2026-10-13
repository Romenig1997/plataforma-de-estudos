package br.com.romenig.plataforma.edital.extracao;

import java.util.List;

/**
 * Organiza o texto do PDF do edital na estrutura {@link EditalExtraido}
 * (HU07, incremento A).
 *
 * <p>A implementacao de producao chama o provedor de IA configurado; os
 * testes usam uma implementacao fake deterministica, entao a IA nunca e
 * contatada durante a suite.
 */
public interface ExtratorDeEditalIA {

    EditalExtraido extrair(List<String> textoPorPagina);
}