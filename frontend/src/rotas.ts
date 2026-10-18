/**
 * Metadados das rotas: um unico lugar para saber se uma rota e publica, qual
 * titulo a aba mostra e o que aparece na navegacao principal.
 */

export type Icone = 'cursos' | 'planner' | 'cronograma' | 'questoes' | 'desempenho' | 'painel' | 'alunos' | 'editais' | 'aluno'

export type Destino = { url: string; nome: string; icone: Icone; noCelular?: boolean }

export type GrupoDeNavegacao = { nome: string; destinos: Destino[] }

/** Rotas de acesso: login, cadastro e recuperacao de conta. */
export const ROTAS_DE_ACESSO = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/confirmar-email']

/** Rotas que usam a casca publica (sem barra lateral). */
export const ROTAS_PUBLICAS = ['/', ...ROTAS_DE_ACESSO]

/**
 * Navegacao principal da area do aluno, agrupada pela etapa de estudo. Os
 * destinos com `noCelular` ficam na barra inferior; os demais vao no "Mais".
 */
export const NAVEGACAO: GrupoDeNavegacao[] = [
  {
    nome: 'Estudar',
    destinos: [
      { url: '/app', nome: 'Meus cursos', icone: 'cursos', noCelular: true },
      { url: '/planner', nome: 'Planner', icone: 'planner' },
      { url: '/cronograma', nome: 'Cronograma', icone: 'cronograma', noCelular: true },
    ],
  },
  {
    nome: 'Praticar',
    destinos: [{ url: '/questoes', nome: 'Questões', icone: 'questoes', noCelular: true }],
  },
  {
    nome: 'Evoluir',
    destinos: [{ url: '/dashboard', nome: 'Desempenho', icone: 'desempenho', noCelular: true }],
  },
]

/**
 * Navegacao do painel administrativo (rotas /admin). Mesmo formato da
 * navegacao do aluno; "Ver como aluno" leva de volta a area de estudos.
 */
export const NAVEGACAO_ADMIN: GrupoDeNavegacao[] = [
  {
    nome: 'Gestão',
    destinos: [
      { url: '/admin', nome: 'Visão geral', icone: 'painel', noCelular: true },
      { url: '/admin/alunos', nome: 'Gestão de alunos', icone: 'alunos', noCelular: true },
    ],
  },
  {
    nome: 'Conteúdo',
    destinos: [
      { url: '/admin/cursos', nome: 'Cursos e aulas', icone: 'cursos', noCelular: true },
      { url: '/admin/editais', nome: 'Importar editais', icone: 'editais' },
      { url: '/admin/questoes', nome: 'Questões', icone: 'questoes', noCelular: true },
    ],
  },
  {
    nome: 'Plataforma',
    destinos: [{ url: '/app', nome: 'Ver como aluno', icone: 'aluno' }],
  },
]

const TITULOS: [string, string][] = [
  ['/', 'Início'],
  ['/login', 'Entrar'],
  ['/cadastro', 'Criar conta'],
  ['/esqueci-senha', 'Recuperar senha'],
  ['/redefinir-senha', 'Redefinir senha'],
  ['/confirmar-email', 'Confirmar e-mail'],
  ['/app', 'Meus cursos'],
  ['/curso/', 'Curso'],
  ['/planner', 'Planner'],
  ['/cronograma', 'Cronograma'],
  ['/questoes', 'Questões'],
  ['/dashboard', 'Desempenho'],
  ['/perfil', 'Meu perfil'],
  ['/seguranca', 'Segurança'],
  ['/admin/editais', 'Importar editais'],
  ['/admin/questoes', 'Questões do edital'],
  ['/admin/alunos', 'Gestão de alunos'],
  ['/admin/cursos', 'Cursos e aulas'],
  ['/admin', 'Visão geral'],
]

/** Titulo da aba para a rota atual, no formato "Pagina · ESTUDA.". */
export function tituloDaRota(caminho: string): string {
  const encontrado = TITULOS.find(([prefixo]) =>
    prefixo.endsWith('/') && prefixo !== '/' ? caminho.startsWith(prefixo) : caminho === prefixo,
  )
  return `${encontrado ? encontrado[1] : 'Página não encontrada'} · ESTUDA.`
}
