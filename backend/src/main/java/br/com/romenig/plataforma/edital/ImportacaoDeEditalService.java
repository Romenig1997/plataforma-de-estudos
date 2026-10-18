package br.com.romenig.plataforma.edital;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.dashboard.RegistroRepository;
import br.com.romenig.plataforma.edital.dto.AcessoAoPdfResponse;
import br.com.romenig.plataforma.edital.dto.EditalResponse;
import br.com.romenig.plataforma.edital.dto.ImportacaoDeEditalResponse;
import br.com.romenig.plataforma.edital.exception.EditalDuplicadoException;
import br.com.romenig.plataforma.edital.exception.FalhaNaExtracaoException;
import br.com.romenig.plataforma.edital.exception.ImportacaoNaoEncontradaException;
import br.com.romenig.plataforma.edital.exception.PdfInvalidoException;
import br.com.romenig.plataforma.edital.extracao.EditalExtraido;
import br.com.romenig.plataforma.edital.extracao.ExtratorDeEditalIA;
import br.com.romenig.plataforma.edital.extracao.ExtratorLocalDeEdital;
import br.com.romenig.plataforma.edital.extracao.LeitorDePdf;
import br.com.romenig.plataforma.edital.extracao.ValidadorDeEditalExtraido;
import br.com.romenig.plataforma.planner.PlannerService;
import br.com.romenig.plataforma.planner.PlanoEstudo;
import br.com.romenig.plataforma.planner.PlanoRepository;
import br.com.romenig.plataforma.questao.Questao;
import br.com.romenig.plataforma.questao.QuestaoRepository;
import br.com.romenig.plataforma.questao.RespostaQuestaoRepository;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
import br.com.romenig.plataforma.usuario.dto.RespostaDeErro.ErroValidacao;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/**
 * Ciclo de importacao de um edital em PDF (HU07, incremento A).
 *
 * <p>Upload e sincrono e passo a passo: grava o PDF original no Storage com o
 * SHA-256 (deduplicacao e caminho imutavel), extrai o texto pagina a pagina e pede a IA para organizar
 * {@link EditalExtraido}. Nada disso toca as tabelas de {@link Edital} -
 * o que a IA devolver so vira edital depois da revisao e aprovacao manuais.
 * Uma extracao que falha nao derruba o upload: a importacao fica
 * {@code FALHA} com o PDF salvo, pronta para {@code reprocessar}.
 *
 * <p>Somente ADMIN chega nestes metodos: a autorizacao e do
 * {@code SecurityFilterChain} em {@code /api/admin/**}.
 */
@Service
public class ImportacaoDeEditalService {

    private static final long TAMANHO_MAXIMO_DE_BYTES = 30L * 1024 * 1024;

    private static final byte[] CABECALHO_PDF = { (byte) '%', (byte) 'P', (byte) 'D', (byte) 'F' };

    private final EditalPdfRepository editalPdfs;
    private final ImportacaoEditalRepository importacoes;
    private final EditalRepository editais;
    private final UsuarioRepository usuarios;
    private final LeitorDePdf leitor;
    private final ExtratorDeEditalIA extrator;
    private final ExtratorLocalDeEdital extratorLocal;
    private final ValidadorDeEditalExtraido validador;
    private final PlanoRepository planos;
    private final PlannerService planner;
    private final QuestaoRepository questoes;
    private final RespostaQuestaoRepository respostas;
    private final RegistroRepository registros;
    private final ObjectMapper mapper;
    private final CapaDoCursoService capas;
    private final ArquivosDePdf arquivos;

    public ImportacaoDeEditalService(EditalPdfRepository editalPdfs,
                                     ImportacaoEditalRepository importacoes,
                                     EditalRepository editais,
                                     UsuarioRepository usuarios,
                                     LeitorDePdf leitor,
                                     ExtratorDeEditalIA extrator,
                                     ExtratorLocalDeEdital extratorLocal,
                                     ValidadorDeEditalExtraido validador,
                                     PlanoRepository planos,
                                     PlannerService planner,
                                     QuestaoRepository questoes,
                                     RespostaQuestaoRepository respostas,
                                     RegistroRepository registros,
                                     ObjectMapper mapper,
                                     CapaDoCursoService capas,
                                     ArquivosDePdf arquivos) {
        this.editalPdfs = editalPdfs;
        this.importacoes = importacoes;
        this.editais = editais;
        this.usuarios = usuarios;
        this.leitor = leitor;
        this.extrator = extrator;
        this.extratorLocal = extratorLocal;
        this.validador = validador;
        this.planos = planos;
        this.planner = planner;
        this.questoes = questoes;
        this.respostas = respostas;
        this.registros = registros;
        this.mapper = mapper;
        this.capas = capas;
        this.arquivos = arquivos;
    }

    @Transactional
    public ImportacaoDeEditalResponse importar(MultipartFile arquivo) {
        validarArquivo(arquivo);

        byte[] bytes = lerBytes(arquivo);
        String sha256 = ArquivosDePdf.sha256(bytes);

        tratarPdfJaConhecido(sha256);

        OffsetDateTime agora = OffsetDateTime.now();

        // O arquivo vai para o Storage; o banco guarda so os metadados.
        EditalPdf pdf = new EditalPdf(nomeDoArquivo(arquivo), (long) bytes.length,
                "application/pdf", sha256, arquivos.guardar(sha256, bytes), agora);
        editalPdfs.save(pdf);

        List<String> textoPorPagina = leitor.extrairTextoPorPagina(bytes);
        ImportacaoEdital importacao = new ImportacaoEdital(pdf, textoPorPagina.size(), "",
                usuarioDaSessao(), agora);
        importacoes.save(importacao);

        extrair(importacao, textoPorPagina, agora);

        return ImportacaoDeEditalResponse.de(importacao);
    }

    @Transactional(readOnly = true)
    public List<ImportacaoDeEditalResponse> listar() {
        return importacoes.findAllByOrderByCriadoEmDesc().stream()
                .map(ImportacaoDeEditalResponse::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public ImportacaoDeEditalResponse buscar(Long id) {
        return importacoes.findById(id)
                .map(ImportacaoDeEditalResponse::de)
                .orElseThrow(ImportacaoNaoEncontradaException::new);
    }

    @Transactional(readOnly = true)
    public EditalPdf baixarPdf(Long id) {
        return importacoes.findComPdfById(id)
                .map(ImportacaoEdital::getPdf)
                .orElseThrow(ImportacaoNaoEncontradaException::new);
    }

    /** Conteudo do PDF original da importacao (download do ADMIN). */
    @Transactional(readOnly = true)
    public byte[] lerPdf(EditalPdf pdf) {
        return arquivos.ler(pdf);
    }

    /** PDF que originou o edital aprovado, acessível aos alunos no leitor do curso. */
    @Transactional(readOnly = true)
    public EditalPdf baixarPdfDoEdital(Long editalId) {
        return editais.findComPdfById(editalId)
                .map(Edital::getPdf)
                .orElseThrow(ImportacaoNaoEncontradaException::new);
    }

    /** URL assinada do Storage para o leitor, ou o aviso de PDF legado. */
    @Transactional(readOnly = true)
    public AcessoAoPdfResponse acessarPdfDoEdital(Long editalId) {
        return arquivos.acessar(baixarPdfDoEdital(editalId));
    }

    @Transactional
    public ImportacaoDeEditalResponse reprocessar(Long id) {
        ImportacaoEdital importacao = importacoes.findById(id)
                .orElseThrow(ImportacaoNaoEncontradaException::new);

        if (importacao.getStatus() != StatusDeImportacao.FALHA
                && importacao.getStatus() != StatusDeImportacao.AGUARDANDO_EXTRACAO) {
            throw new IllegalStateException(
                    "Somente importacoes com falha podem ser reprocessadas.");
        }

        extrair(importacao, leitor.extrairTextoPorPagina(arquivos.ler(importacao.getPdf())), OffsetDateTime.now());

        return ImportacaoDeEditalResponse.de(importacao);
    }

    /**
     * Rele o PDF com as regras locais. Diferentemente de {@link #reprocessar},
     * nunca chama um provedor de IA e pode ser usado para completar uma revisao
     * que ja esta aguardando decisao do administrador.
     */
    @Transactional
    public ImportacaoDeEditalResponse estruturarLocalmente(Long id) {
        ImportacaoEdital importacao = importacoes.findById(id)
                .orElseThrow(ImportacaoNaoEncontradaException::new);

        if (importacao.getStatus() != StatusDeImportacao.AGUARDANDO_REVISAO
                && importacao.getStatus() != StatusDeImportacao.FALHA) {
            throw new IllegalStateException(
                    "Somente importacoes aguardando revisao ou com falha podem ser estruturadas.");
        }

        EditalExtraido sugestao = extratorLocal.extrair(leitor.extrairTextoPorPagina(arquivos.ler(importacao.getPdf())));
        EditalExtraido conteudo = preservarIdentificacao(desserializarSePossivel(importacao.getConteudoExtraido()), sugestao);
        OffsetDateTime agora = OffsetDateTime.now();
        importacao.definirConteudoExtraido(serializar(conteudo), agora);
        List<ErroValidacao> erros = validador.validar(conteudo, importacao.getTotalPaginas());
        importacao.definirErrosValidacao(erros.isEmpty() ? null : serializar(erros), agora);
        importacao.marcarAguardandoRevisao();

        return ImportacaoDeEditalResponse.de(importacao);
    }

    /**
     * Revisao manual do texto extraido (incremento B da HU07): salva o novo
     * {@code EditalExtraido} e revalida a arvore. Com erros, eles vao para
     * {@code erros_validacao} para a tela apontar cada campo; validos, a
     * importacao permanece {@code AGUARDANDO_REVISAO} ate a aprovacao.
     */
    @Transactional
    public ImportacaoDeEditalResponse revisarConteudo(Long id, EditalExtraido extraido) {
        ImportacaoEdital importacao = importacoes.findById(id)
                .orElseThrow(ImportacaoNaoEncontradaException::new);

        if (importacao.getStatus() != StatusDeImportacao.AGUARDANDO_REVISAO
                && importacao.getStatus() != StatusDeImportacao.FALHA) {
            throw new IllegalStateException(
                    "Somente importacoes aguardando revisao ou com falha podem ter o conteudo editado.");
        }

        OffsetDateTime agora = OffsetDateTime.now();
        importacao.definirConteudoExtraido(serializar(extraido), agora);

        List<ErroValidacao> erros = validador.validar(extraido, importacao.getTotalPaginas());
        importacao.definirErrosValidacao(erros.isEmpty() ? null : serializar(erros), agora);
        importacao.marcarAguardandoRevisao();

        return ImportacaoDeEditalResponse.de(importacao);
    }

    /**
     * Aprovacao manual (incremento B da HU07): so acontece sobre a revisao
     * valida e cria o {@link Edital} persistido com concursos, cargos,
     * disciplinas e conteudos. Nada chega nas tabelas de edital por outro
     * caminho - a IA nunca grava direto, apenas propos estrutura.
     */
    @Transactional
    public ImportacaoDeEditalResponse aprovar(Long id) {
        ImportacaoEdital importacao = importacoes.findById(id)
                .orElseThrow(ImportacaoNaoEncontradaException::new);

        if (importacao.getStatus() != StatusDeImportacao.AGUARDANDO_REVISAO) {
            throw new IllegalStateException(
                    "Somente importacoes aguardando revisao podem ser aprovadas.");
        }

        EditalExtraido extraido = desserializar(importacao.getConteudoExtraido());

        List<ErroValidacao> erros = validador.validar(extraido, importacao.getTotalPaginas());
        if (!erros.isEmpty()) {
            importacao.definirErrosValidacao(serializar(erros), OffsetDateTime.now());
            throw new IllegalStateException(
                    "A importacao ainda tem erros de validacao; revise antes de aprovar.");
        }

        return aprovar(importacao, extraido);
    }

    @Transactional
    public ImportacaoDeEditalResponse rejeitar(Long id) {
        ImportacaoEdital importacao = importacoes.findById(id)
                .orElseThrow(ImportacaoNaoEncontradaException::new);

        if (importacao.getStatus() == StatusDeImportacao.APROVADO
                || importacao.getStatus() == StatusDeImportacao.REJEITADO) {
            throw new IllegalStateException("A importacao ja foi finalizada.");
        }

        importacao.marcarRejeitada();
        importacao.atualizar(OffsetDateTime.now());

        return ImportacaoDeEditalResponse.de(importacao);
    }

      /**
       * Editais aprovados - a leitura que o planner (incremento C) usa para
       * montar atividades por disciplina e conteudo.
       */
      @Transactional(readOnly = true)
      public List<EditalResponse> listarAprovados() {
          Map<Long, Long> versoes = capas.versoesDosBanners();
          return editais.findAllByOrderByTituloAsc().stream()
                  .map(edital -> EditalResponse.de(edital, versoes.get(edital.getId())))
                  .toList();
      }

    /**
     * Exclui uma importacao (ADMIN), de qualquer status. Se ja havia sido
     * aprovada, o {@link Edital} criado por ela tambem e removido - com
     * disciplinas, concursos, cargos e conteudos por cascata, alem dos planos,
     * cronogramas e questoes que o referenciam. O PDF original so sai quando
     * deixa de ser referenciado por qualquer importacao ou edital.
     */
    @Transactional
    public void excluirImportacao(Long id) {
        ImportacaoEdital importacao = importacoes.findById(id)
                .orElseThrow(ImportacaoNaoEncontradaException::new);

        EditalPdf pdf = importacao.getPdf();
        Edital edital = importacao.getEditalAprovado();

        if (edital != null) {
            removerDependentesDoEdital(edital.getId());
        }

        importacoes.delete(importacao);
        importacoes.flush();

        if (edital != null) {
            editais.delete(edital);
            editais.flush();
        }

        removerPdfSemReferencia(pdf);
    }

    /**
     * Exclui um curso (edital aprovado) pelo id do edital (ADMIN). Atende os
     * cursos sem {@link ImportacaoEdital} - legados ou criados sem importacao -,
     * que nao podiam sair por {@link #excluirImportacao(Long)}. Remove os
     * mesmos dependentes, as importacoes que o aprovaram, se houver, e o PDF
     * quando ele deixa de ser referenciado.
     */
    @Transactional
    public void excluirEdital(Long editalId) {
        Edital edital = editais.findComPdfById(editalId)
                .orElseThrow(ImportacaoNaoEncontradaException::new);

        Map<Long, EditalPdf> pdfs = new LinkedHashMap<>();
        adicionarPdf(pdfs, edital.getPdf());

        removerDependentesDoEdital(editalId);

        List<ImportacaoEdital> ligadas = importacoes.findByEditalAprovado_Id(editalId);
        ligadas.forEach(importacao -> adicionarPdf(pdfs, importacao.getPdf()));
        importacoes.deleteAll(ligadas);
        importacoes.flush();

        editais.delete(edital);
        editais.flush();

        pdfs.values().forEach(this::removerPdfSemReferencia);
    }

    private static void adicionarPdf(Map<Long, EditalPdf> pdfs, EditalPdf pdf) {
        if (pdf != null) {
            pdfs.putIfAbsent(pdf.getId(), pdf);
        }
    }

    /** O PDF original so sai quando nenhuma importacao ou edital o referencia. */
    private void removerPdfSemReferencia(EditalPdf pdf) {
        if (pdf != null
                && !importacoes.existsByPdf_Id(pdf.getId())
                && !editais.existsByPdf_Id(pdf.getId())) {
            editalPdfs.delete(pdf);
            arquivos.removerDepoisDoCommit(pdf);
        }
    }

    /**
     * Remove planos, cronogramas, registros de estudo e questoes (com as
     * respostas) que apontam para o edital, para que a exclusao nao esbarre nas
     * chaves estrangeiras.
     */
    private void removerDependentesDoEdital(Long editalId) {
        // Cada inscricao sai do cronograma combinado do aluno e o foco passa adiante.
        for (PlanoEstudo plano : planos.findByEdital_Id(editalId)) {
            planner.removerPlano(plano);
        }

        for (Questao questao : questoes.findByEditalIdOrderByIdAsc(editalId)) {
            respostas.deleteAll(respostas.findByQuestao_Id(questao.getId()));
            questoes.delete(questao);
        }
        questoes.flush();

        // O progresso do aluno aponta para os conteudos, que saem por cascata com o edital.
        registros.deleteAll(registros.findByConteudo_Disciplina_Edital_Id(editalId));
        registros.flush();
    }

    private ImportacaoDeEditalResponse aprovar(ImportacaoEdital importacao, EditalExtraido extraido) {
        String titulo = extraido.titulo().trim();
        String orgao = extraido.orgao().trim();

        if (editais.existsByTituloAndOrgaoAndAno(titulo, orgao, extraido.ano())) {
            throw new EditalDuplicadoException("edital",
                    "Ja existe um edital aprovado com esse titulo, orgao e ano.");
        }

        OffsetDateTime agora = OffsetDateTime.now();
        Edital edital = new Edital(titulo, orgao, extraido.ano(), importacao.getPdf(), agora);
        preencherDisciplinas(edital, extraido);
        preencherConcursos(edital, extraido);
        editais.save(edital);

        importacao.aprovar(edital);
        importacao.atualizar(agora);

        return ImportacaoDeEditalResponse.de(importacao);
    }

    private void preencherDisciplinas(Edital edital, EditalExtraido extraido) {
        for (EditalExtraido.DisciplinaExtraido disciplinaExtraida : extraido.disciplinas()) {
            Disciplina disciplina = new Disciplina(edital, disciplinaExtraida.nome(), disciplinaExtraida.pagina());
            edital.adicionarDisciplina(disciplina);

            for (EditalExtraido.AssuntoExtraido assuntoExtraido : disciplinaExtraida.assuntos()) {
                Conteudo assunto = new Conteudo(null, assuntoExtraido.nome(), assuntoExtraido.pagina());
                disciplina.adicionarConteudo(assunto);

                for (EditalExtraido.SubassuntoExtraido subassuntoExtraido : assuntoExtraido.subassuntos()) {
                    disciplina.adicionarConteudo(new Conteudo(assunto, subassuntoExtraido.nome(), subassuntoExtraido.pagina()));
                }
            }
        }
    }

    private void preencherConcursos(Edital edital, EditalExtraido extraido) {
        for (EditalExtraido.ConcursoExtraido concursoExtraido : extraido.concursos()) {
            Concurso concurso = new Concurso(edital, concursoExtraido.nome());
            edital.adicionarConcurso(concurso);

            for (EditalExtraido.CargoExtraido cargoExtraido : concursoExtraido.cargos()) {
                concurso.adicionarCargo(new Cargo(concurso, cargoExtraido.nome()));
            }
        }
    }

    private EditalExtraido desserializar(String json) {
        try {
            return mapper.readValue(json, EditalExtraido.class);
        } catch (JacksonException excecao) {
            throw new IllegalStateException("O conteudo extraido esta corrompido.", excecao);
        }
    }

    private EditalExtraido desserializarSePossivel(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return desserializar(json);
        } catch (IllegalStateException ignorada) {
            return null;
        }
    }

    private EditalExtraido preservarIdentificacao(EditalExtraido anterior, EditalExtraido sugestao) {
        if (anterior == null) return sugestao;
        return new EditalExtraido(
                textoConhecido(anterior.titulo()) ? anterior.titulo() : sugestao.titulo(),
                textoConhecido(anterior.orgao()) ? anterior.orgao() : sugestao.orgao(),
                anterior.ano() != null ? anterior.ano() : sugestao.ano(),
                anterior.concursos() == null || anterior.concursos().isEmpty() ? sugestao.concursos() : anterior.concursos(),
                sugestao.disciplinas());
    }

    private boolean textoConhecido(String texto) {
        return texto != null && !texto.isBlank() && !texto.equalsIgnoreCase("Órgão a confirmar");
    }

    /**
     * Roda a extracao da IA e move a importacao para revisao. Uma falha da IA
     * (rede, provedor, JSON invalido) vira status {@code FALHA} - o upload nao
     * quebra e o PDF fica salvo para reprocessar.
     */
    private void extrair(ImportacaoEdital importacao, List<String> textoPorPagina, OffsetDateTime agora) {
        try {
            EditalExtraido extraido = extrator.extrair(textoPorPagina);
            importacao.definirConteudoExtraido(serializar(extraido), agora);
            List<ErroValidacao> erros = validador.validar(extraido, importacao.getTotalPaginas());
            importacao.definirErrosValidacao(erros.isEmpty() ? null : serializar(erros), agora);
            importacao.marcarAguardandoRevisao();
        } catch (FalhaNaExtracaoException excecao) {
            importacao.definirErrosValidacao(serializar(List.of(
                    new ErroValidacao("extracao", excecao.getMessage()))), agora);
            importacao.marcarFalha();
            importacao.atualizar(agora);
        }
    }

private String serializar(Object valor) {
        try {
            return mapper.writeValueAsString(valor);
        } catch (Exception excecao) {
            throw new FalhaNaExtracaoException("Nao foi possivel serializar o valor.", excecao);
        }
    }

    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new PdfInvalidoException();
        }
        if (arquivo.getSize() > TAMANHO_MAXIMO_DE_BYTES) {
            throw new PdfInvalidoException(
                    "O arquivo tem mais de 30 MB (o limite de upload).");
        }
    }

    /**
     * O PDF e compartilhado entre a importacao e o curso aprovado. Em bases
     * antigas pode existir um PDF sem registro de importacao; trata-lo como
     * "importacao existente" confundia o administrador, pois ele nao aparecia
     * na lista. Arquivos sem nenhuma referencia sao removidos e podem ser
     * enviados novamente. O objeto no Storage nao e apagado: o novo envio cai
     * no mesmo caminho ({@code editais/{sha256}.pdf}) e o sobrescreve.
     */
    private void tratarPdfJaConhecido(String sha256) {
        EditalPdf pdf = editalPdfs.findBySha256(sha256).orElse(null);
        if (pdf == null) return;

        if (importacoes.findFirstByPdf_Id(pdf.getId()).isPresent()) {
            throw new EditalDuplicadoException("arquivo",
                    "Este PDF ja foi importado. Acesse a lista de importacoes para revisa-lo.");
        }

        Edital edital = editais.findByPdf_Id(pdf.getId()).orElse(null);
        if (edital != null) {
            throw new EditalDuplicadoException("arquivo",
                    "Este PDF ja esta associado ao curso aprovado \"" + edital.getTitulo()
                            + "\". Acesse Meus cursos para utiliza-lo.");
        }

        editalPdfs.delete(pdf);
        editalPdfs.flush();
    }

    private byte[] lerBytes(MultipartFile arquivo) {
        try {
            byte[] bytes = arquivo.getBytes();
            if (!comecaCom(bytes, CABECALHO_PDF)) {
                throw new PdfInvalidoException();
            }
            return bytes;
        } catch (java.io.IOException excecao) {
            throw new PdfInvalidoException();
        }
    }

    private String nomeDoArquivo(MultipartFile arquivo) {
        String nome = arquivo.getOriginalFilename();
        return nome == null || nome.isBlank() ? "edital.pdf" : nome;
    }

    private boolean comecaCom(byte[] conteudo, byte[] prefixo) {
        if (conteudo.length < prefixo.length) {
            return false;
        }
        for (int indice = 0; indice < prefixo.length; indice++) {
            if (conteudo[indice] != prefixo[indice]) {
                return false;
            }
        }
        return true;
    }

    private Usuario usuarioDaSessao() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();

        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) {
            throw new SessaoInvalidaException();
        }

        return usuarios.findById(sessao.id())
                .orElseThrow(SessaoInvalidaException::new);
    }
}
