const historiasDeUsuario = [
  'Cadastro de Usuários',
  'Sistema de Autenticação',
  'Gerenciamento de Perfis',
  'Perfis de Acesso Diferenciados',
  'Estruturação de Banco de Dados',
  'Interface de Usuário (UI)',
  'Planner Inteligente de Estudos',
  'Dashboard de Desempenho',
  'Análise Inteligente de Desempenho',
]

/**
 * Placeholder estatico da Etapa 0.
 *
 * Nao ha nenhuma funcionalidade de HU implementada. O design system e a
 * navegacao real entram na HU01 e na HU06.
 */
function App() {
  return (
    <main className="container">
      <h1>Plataforma de Preparação para Concursos</h1>

      <p className="lead">
        Estrutura inicial do projeto pronta. Nenhuma funcionalidade foi
        implementada ainda — o desenvolvimento é incremental, conforme o
        escopo do projeto.
      </p>

      <section aria-labelledby="etapa">
        <h2 id="etapa">Etapa atual</h2>
        <p>
          <strong>Etapa 0</strong> — estrutura inicial: frontend, backend,
          documentação e configuração de Docker.
        </p>
      </section>

      <section aria-labelledby="hus">
        <h2 id="hus">Histórias de Usuário</h2>
        <ol className="hu-list">
          {historiasDeUsuario.map((hu) => (
            <li key={hu}>{hu}</li>
          ))}
        </ol>
        <p className="muted">
          Todas em estado <em>não iniciada</em>. Os critérios de aceite de
          cada uma estão em <code>docs/hu/</code>.
        </p>
      </section>
    </main>
  )
}

export default App