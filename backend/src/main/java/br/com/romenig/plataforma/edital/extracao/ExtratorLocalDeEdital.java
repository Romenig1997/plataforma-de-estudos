package br.com.romenig.plataforma.edital.extracao;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * Estrutura PDF local, sem enviar o documento a um provedor de IA.
 *
 * <p>O extrator procura disciplinas conhecidas no texto e usa o sumario ou
 * titulos numerados para formar assuntos e subassuntos, preservando a pagina
 * de origem. Ele produz uma sugestao para revisao humana: formatos de edital
 * variam muito, portanto nenhuma sugestao e aprovada automaticamente.
 */
@Component
public class ExtratorLocalDeEdital {

    private static final Pattern TITULO_NUMERADO = Pattern.compile(
            "^(\\d+(?:\\.\\d+){0,4})\\s*[.)-]?\\s+(.+)$");
    private static final Pattern PAGINA_DO_SUMARIO = Pattern.compile(
            "^(.*?)(?:\\.{2,}|\\s{2,})\\s*(\\d{1,4})\\s*$");
    private static final Pattern PONTOS_GUIA = Pattern.compile("\\.{3,}");
    private static final Pattern ANO = Pattern.compile("\\b(19\\d{2}|20\\d{2})\\b");
    private static final Pattern ORGAO = Pattern.compile(
            "(?i)\\b(PREFEITURA|TRIBUNAL|MINISTERIO|SECRETARIA|CAMARA|ASSEMBLEIA|POLICIA|DEFENSORIA|PROCURADORIA|UNIVERSIDADE|INSTITUTO)[^\\n]{0,120}");
    private static final int MAXIMO_DE_ASSUNTOS = 40;
    private static final int PESO_CAPA = 200;
    private static final int PESO_INDICE = 25;

    private static final List<DisciplinaConhecida> DISCIPLINAS_CONHECIDAS = List.of(
            new DisciplinaConhecida("Direito Penal", "direito penal"),
            new DisciplinaConhecida("Direito Constitucional", "direito constitucional"),
            new DisciplinaConhecida("Direito Administrativo", "direito administrativo"),
            new DisciplinaConhecida("Direito Processual Penal", "processual penal"),
            new DisciplinaConhecida("Língua Portuguesa", "lingua portuguesa", "portugues"),
            new DisciplinaConhecida("Matemática", "matematica", "raciocinio logico"),
            new DisciplinaConhecida("Informática", "informatica"),
            new DisciplinaConhecida("Legislação", "legislacao"),
            new DisciplinaConhecida("Atualidades", "atualidades"),
            new DisciplinaConhecida("Conhecimentos Gerais", "conhecimentos gerais"));

    public EditalExtraido extrair(List<String> textoPorPagina) {
        List<Linha> linhas = linhasDoPdf(textoPorPagina);
        String titulo = encontrarTitulo(linhas);
        String orgao = encontrarOrgao(linhas);
        Integer ano = encontrarAno(linhas);
        DisciplinaConhecida disciplinaConhecida = identificarDisciplina(linhas).orElse(null);
        String nomeDaDisciplina = disciplinaConhecida == null
                ? "Conteúdos do edital"
                : disciplinaConhecida.nome();

        List<EditalExtraido.AssuntoExtraido> assuntos = extrairAssuntos(linhas);
        if (assuntos.isEmpty()) {
            int pagina = linhas.isEmpty() ? 1 : linhas.get(0).pagina();
            assuntos = List.of(new EditalExtraido.AssuntoExtraido(
                    "Conteúdo identificado no PDF", pagina, List.of()));
        }

        int paginaDaDisciplina = assuntos.get(0).pagina();
        return new EditalExtraido(titulo, orgao, ano, List.of(), List.of(
                new EditalExtraido.DisciplinaExtraido(nomeDaDisciplina, paginaDaDisciplina, assuntos)));
    }

    private List<Linha> linhasDoPdf(List<String> textoPorPagina) {
        List<Linha> linhas = new ArrayList<>();
        for (int pagina = 0; pagina < textoPorPagina.size(); pagina++) {
            for (String linha : textoPorPagina.get(pagina).split("\\R")) {
                String limpa = limparEspacos(linha);
                if (!limpa.isBlank()) linhas.add(new Linha(pagina + 1, limpa));
            }
        }
        return linhas;
    }

    private String encontrarTitulo(List<Linha> linhas) {
        return linhas.stream()
                .map(Linha::texto)
                .filter(linha -> normalizar(linha).contains("edital") || normalizar(linha).startsWith("manual"))
                .map(this::limitarTitulo)
                .filter(linha -> linha.length() >= 5)
                .findFirst()
                .orElseGet(() -> linhas.isEmpty() ? "Documento importado" : limitarTitulo(linhas.get(0).texto()));
    }

    private String encontrarOrgao(List<Linha> linhas) {
        for (Linha linha : linhas) {
            Matcher encontrado = ORGAO.matcher(linha.texto());
            if (encontrado.find()) return limparEspacos(encontrado.group());
        }
        return "Órgão a confirmar";
    }

    private Integer encontrarAno(List<Linha> linhas) {
        for (Linha linha : linhas) {
            Matcher encontrado = ANO.matcher(linha.texto());
            if (encontrado.find()) return Integer.valueOf(encontrado.group(1));
        }
        return null;
    }

    private Optional<DisciplinaConhecida> identificarDisciplina(List<Linha> linhas) {
        return DISCIPLINAS_CONHECIDAS.stream()
                .map(disciplina -> new DisciplinaPontuada(disciplina, pontuacaoDaDisciplina(disciplina, linhas)))
                .filter(candidata -> candidata.pontuacao() > 0)
                .max((esquerda, direita) -> Long.compare(esquerda.pontuacao(), direita.pontuacao()))
                .map(DisciplinaPontuada::disciplina);
    }

    /**
     * A disciplina não pode depender da ordem da lista conhecida. A capa e as
     * primeiras páginas do índice descrevem o material com mais segurança; o
     * restante do documento é usado como confirmação pela frequência dos
     * termos. Assim, uma citação esporádica a "português" não supera uma
     * apostila cuja capa e conteúdo são de informática.
     */
    private long pontuacaoDaDisciplina(DisciplinaConhecida disciplina, List<Linha> linhas) {
        long pontuacao = 0;
        for (Linha linha : linhas) {
            String texto = normalizar(linha.texto());
            int pesoDaPagina = linha.pagina() == 1 ? PESO_CAPA
                    : linha.pagina() <= 3 ? PESO_INDICE : 1;
            for (String termo : disciplina.termos()) {
                pontuacao += (long) ocorrenciasDe(texto, termo) * pesoDaPagina * termo.length();
            }
        }
        return pontuacao;
    }

    private int ocorrenciasDe(String texto, String termo) {
        int inicio = 0;
        int ocorrencias = 0;
        while ((inicio = texto.indexOf(termo, inicio)) >= 0) {
            ocorrencias++;
            inicio += termo.length();
        }
        return ocorrencias;
    }

    private List<EditalExtraido.AssuntoExtraido> extrairAssuntos(List<Linha> linhas) {
        int inicio = inicioDoSumario(linhas);
        boolean haSumario = inicio >= 0;
        int paginaDoSumario = haSumario
                ? linhas.get(Math.min(inicio, linhas.size() - 1)).pagina()
                : -1;
        Map<String, AssuntoEmConstrucao> assuntos = new LinkedHashMap<>();
        AssuntoEmConstrucao assuntoAtual = null;
        int inicioDoCorpo = -1;

        for (int indice = Math.max(inicio, 0); indice < linhas.size(); indice++) {
            Linha linha = linhas.get(indice);

            Matcher titulo = TITULO_NUMERADO.matcher(linha.texto());
            if (!titulo.matches()) continue;

            int nivel = titulo.group(1).split("\\.").length;
            TituloComPagina tituloComPagina = tituloComPagina(titulo.group(2), linha.pagina(),
                    linhas.size(), haSumario);
            String nome = tituloComPagina.nome();
            if (nome.isBlank() || nome.length() > 220) continue;

            if (nivel == 1) {
                String chave = normalizar(nome);
                AssuntoEmConstrucao existente = assuntos.get(chave);
                if (haSumario && existente != null && linha.pagina() > paginaDoSumario
                        && linha.pagina() >= existente.pagina) {
                    inicioDoCorpo = linha.pagina();
                    break;
                }
                // O limite protege a revisão de listas muito longas, mas não
                // pode encerrar a leitura: o corpo do PDF pode começar após
                // a 40ª linha do sumário. Continuamos procurando uma entrada
                // já conhecida para então resolver as páginas reais.
                if (existente == null && assuntos.size() >= MAXIMO_DE_ASSUNTOS) continue;
                assuntoAtual = existente == null
                        ? new AssuntoEmConstrucao(nome, tituloComPagina.pagina(), titulo.group(1))
                        : existente;
                assuntos.putIfAbsent(chave, assuntoAtual);
            } else if (assuntoAtual != null) {
                assuntoAtual.adicionarSubassunto(nome, tituloComPagina.pagina(), titulo.group(1));
            }
        }

        if (inicioDoCorpo > 0) {
            atualizarPaginasComCorpoDoPdf(assuntos.values(), linhas, inicioDoCorpo, paginaDoSumario);
        }
        return assuntos.values().stream().map(AssuntoEmConstrucao::comoAssunto).toList();
    }

    /** Resolve as entradas do sumário contra os títulos reais, após o sumário. */
    private void atualizarPaginasComCorpoDoPdf(Iterable<AssuntoEmConstrucao> assuntos,
                                               List<Linha> linhas, int inicioDoCorpo,
                                               int paginaDoSumario) {
        List<AssuntoEmConstrucao> todos = new ArrayList<>();
        for (AssuntoEmConstrucao assunto : assuntos) {
            todos.add(assunto);
            encontrarPaginaNoCorpo(assunto.nome, assunto.indice, linhas, inicioDoCorpo)
                    .ifPresent(assunto::atualizarPagina);
            assunto.subassuntos.forEach((chave, subassunto) -> encontrarPaginaNoCorpo(
                    subassunto.nome, subassunto.indice, linhas, inicioDoCorpo)
                    .ifPresent(subassunto::atualizarPagina));
        }
        preencherLacunasEntreTopicos(todos, inicioDoCorpo, paginaDoSumario);
    }

    /**
     * Há apostilas que só escrevem o título de alguns capítulos. Quando um
     * título do índice não aparece no corpo, a página do índice não deve virar
     * o destino do aluno. Usamos os capítulos reconhecidos antes e depois para
     * posicionar essa lacuna dentro da sequência real de estudo.
     */
    private void preencherLacunasEntreTopicos(List<AssuntoEmConstrucao> assuntos,
                                              int inicioDoCorpo, int paginaDoSumario) {
        for (int inicioDaLacuna = 0; inicioDaLacuna < assuntos.size();) {
            if (assuntos.get(inicioDaLacuna).pagina > paginaDoSumario) {
                inicioDaLacuna++;
                continue;
            }

            int fimDaLacuna = inicioDaLacuna;
            while (fimDaLacuna < assuntos.size() && assuntos.get(fimDaLacuna).pagina <= paginaDoSumario) {
                fimDaLacuna++;
            }

            int paginaAnterior = inicioDaLacuna == 0
                    ? inicioDoCorpo
                    : assuntos.get(inicioDaLacuna - 1).pagina;
            Integer proximaPagina = fimDaLacuna < assuntos.size()
                    ? assuntos.get(fimDaLacuna).pagina
                    : null;
            int totalDaLacuna = fimDaLacuna - inicioDaLacuna;

            for (int deslocamento = 0; deslocamento < totalDaLacuna; deslocamento++) {
                int pagina = proximaPagina == null || proximaPagina <= paginaAnterior
                        ? paginaAnterior
                        : paginaAnterior + (int) Math.ceil((double) (deslocamento + 1)
                                * (proximaPagina - paginaAnterior) / (totalDaLacuna + 1));
                assuntos.get(inicioDaLacuna + deslocamento).atualizarPagina(pagina);
            }
            inicioDaLacuna = fimDaLacuna;
        }
    }

    private Optional<Integer> encontrarPaginaNoCorpo(String titulo, String indiceDoTitulo,
                                                      List<Linha> linhas, int inicioDoCorpo) {
        String alvo = normalizar(titulo);
        for (Linha linha : linhas) {
            if (linha.pagina() < inicioDoCorpo) continue;
            Matcher tituloNumerado = TITULO_NUMERADO.matcher(linha.texto());
            if (!tituloNumerado.matches()) continue;
            if (tituloNumerado.group(1).equals(indiceDoTitulo)
                    && correspondeAoTitulo(tituloNumerado.group(2), alvo)) {
                return Optional.of(linha.pagina());
            }
        }
        for (Linha linha : linhas) {
            if (linha.pagina() < inicioDoCorpo) continue;
            Matcher tituloNumerado = TITULO_NUMERADO.matcher(linha.texto());
            if (!tituloNumerado.matches()) continue;
            if (correspondeAoTitulo(tituloNumerado.group(2), alvo)) {
                return Optional.of(linha.pagina());
            }
        }
        return Optional.empty();
    }

    private boolean correspondeAoTitulo(String candidatoOriginal, String alvo) {
        String candidato = normalizar(limparTituloNumerado(candidatoOriginal));
        return candidato.equals(alvo) || candidato.startsWith(alvo + " ")
                || (candidato.startsWith(alvo) && candidato.length() > alvo.length()
                        && !Character.isLetterOrDigit(candidato.charAt(alvo.length())))
                || (alvo.startsWith(candidato + " ") && candidato.length() >= 16);
    }

    private int inicioDoSumario(List<Linha> linhas) {
        for (int indice = 0; indice < linhas.size(); indice++) {
            String normalizada = normalizar(linhas.get(indice).texto());
            if (normalizada.equals("sumario") || normalizada.startsWith("sumario ")
                    || normalizada.equals("indice") || normalizada.startsWith("indice ")
                    || normalizada.contains("conteudo programatico")) {
                return indice + 1;
            }
        }
        return inicioDoSumarioSemCabecalho(linhas);
    }

    /**
     * Alguns materiais não escrevem "Sumário": a primeira página do índice
     * começa diretamente com dezenas de linhas numeradas e pontos-guia. Três
     * dessas linhas na mesma página são suficientes para identificá-la sem
     * confundi-la com um título isolado do conteúdo.
     */
    private int inicioDoSumarioSemCabecalho(List<Linha> linhas) {
        for (int inicioDaPagina = 0; inicioDaPagina < linhas.size();) {
            int pagina = linhas.get(inicioDaPagina).pagina();
            int fimDaPagina = inicioDaPagina;
            int entradasComPontosGuia = 0;

            while (fimDaPagina < linhas.size() && linhas.get(fimDaPagina).pagina() == pagina) {
                Linha linha = linhas.get(fimDaPagina);
                if (TITULO_NUMERADO.matcher(linha.texto()).matches()
                        && PONTOS_GUIA.matcher(linha.texto()).find()) {
                    entradasComPontosGuia++;
                }
                fimDaPagina++;
            }
            if (entradasComPontosGuia >= 3) return inicioDaPagina;
            inicioDaPagina = fimDaPagina;
        }
        return -1;
    }

    /**
     * O sumário pode ocupar uma única página, mas indicar que o assunto está
     * na página 42. A referência final é a que deve abrir no leitor, não a
     * página física onde o sumário foi encontrado.
     */
    private TituloComPagina tituloComPagina(String titulo, int paginaEncontrada,
                                            int totalDePaginas, boolean haSumario) {
        if (haSumario) {
            Matcher referencia = PAGINA_DO_SUMARIO.matcher(titulo);
            if (referencia.matches()) {
                int paginaIndicada = Integer.parseInt(referencia.group(2));
                if (paginaIndicada >= 1 && paginaIndicada <= totalDePaginas) {
                    return new TituloComPagina(limparTituloNumerado(referencia.group(1)), paginaIndicada);
                }
            }
        }
        return new TituloComPagina(limparTituloNumerado(titulo), paginaEncontrada);
    }

    private String limparTituloNumerado(String titulo) {
        // Alguns PDFs usam pontos-guia no sumário sem imprimir o número da
        // página ("1 - SOFTWARE ........"). Esses pontos não fazem parte do
        // título e impediam que a entrada fosse associada ao "1 - SOFTWARE"
        // que aparece mais adiante no corpo do arquivo.
        String limpo = titulo.replaceAll("\\s*(?:\\.{2,}\\s*(?:\\d{1,4})?|\\s{2,}\\d{1,4})\\s*$", "");
        return limitarTitulo(limpo);
    }

    private String limitarTitulo(String texto) {
        String limpo = limparEspacos(texto);
        return limpo.length() <= 220 ? limpo : limpo.substring(0, 220).trim();
    }

    private String limparEspacos(String texto) {
        return texto == null ? "" : texto.replaceAll("\\s+", " ").trim();
    }

    private String normalizar(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    private record Linha(int pagina, String texto) {
    }

    private record TituloComPagina(String nome, int pagina) {
    }

    private record DisciplinaConhecida(String nome, List<String> termos) {
        private DisciplinaConhecida(String nome, String... termos) {
            this(nome, List.of(termos));
        }
    }

    private record DisciplinaPontuada(DisciplinaConhecida disciplina, long pontuacao) {
    }

    private static final class AssuntoEmConstrucao {
        private final String nome;
        private final String indice;
        private int pagina;
        private final Map<String, SubassuntoEmConstrucao> subassuntos = new LinkedHashMap<>();

        private AssuntoEmConstrucao(String nome, int pagina, String indice) {
            this.nome = nome;
            this.pagina = pagina;
            this.indice = indice;
        }

        private void adicionarSubassunto(String nomeDoSubassunto, int paginaDoSubassunto,
                                         String indiceDoSubassunto) {
            subassuntos.putIfAbsent(normalizarEstatica(nomeDoSubassunto),
                    new SubassuntoEmConstrucao(nomeDoSubassunto, paginaDoSubassunto, indiceDoSubassunto));
        }

        private void atualizarPagina(int paginaAtualizada) {
            pagina = paginaAtualizada;
        }

        private EditalExtraido.AssuntoExtraido comoAssunto() {
            return new EditalExtraido.AssuntoExtraido(nome, pagina, subassuntos.values().stream()
                    .map(SubassuntoEmConstrucao::comoSubassunto).toList());
        }

        private static String normalizarEstatica(String texto) {
            return Normalizer.normalize(texto, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "")
                    .toLowerCase(Locale.ROOT);
        }
    }

    private static final class SubassuntoEmConstrucao {
        private final String nome;
        private final String indice;
        private int pagina;

        private SubassuntoEmConstrucao(String nome, int pagina, String indice) {
            this.nome = nome;
            this.pagina = pagina;
            this.indice = indice;
        }

        private void atualizarPagina(int paginaAtualizada) {
            pagina = paginaAtualizada;
        }

        private EditalExtraido.SubassuntoExtraido comoSubassunto() {
            return new EditalExtraido.SubassuntoExtraido(nome, pagina);
        }
    }
}
