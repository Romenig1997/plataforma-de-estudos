import { ErroDeApi, ErroDeRede, SessaoEncerrada, lerErros } from './sessao'
import type { Atividade } from './cronograma'
export type Registro = { concluido: boolean }
export type Topico = Registro & { id: number; nome: string; pagina: number; questoes: number; acertos: number }
export type DisciplinaDashboard = { id: number; nome: string; questoes: number; acertos: number; desempenho: number | null; topicos: Topico[] }
export type Dashboard = { editalId: number; editalTitulo: string; totalTopicos: number; topicosConcluidos: number; progresso: number; disciplinas: DisciplinaDashboard[]; proximasAtividades: Atividade[]; cronogramaDesatualizado: boolean }
function agoraLocal(): string {
 const d = new Date(), p = (n: number) => String(n).padStart(2, '0')
 return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
async function requisicao(token: string, caminho: string, dados?: Registro): Promise<Response> {
 let resposta: Response
 try { resposta = await fetch(caminho, { method: dados ? 'PUT' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(dados ? {'Content-Type':'application/json'} : {}) }, ...(dados ? {body:JSON.stringify(dados)} : {}) }) }
 catch { throw new ErroDeRede() }
 if (resposta.status === 401) throw new SessaoEncerrada()
 if (!resposta.ok) throw new ErroDeApi(resposta.status, await lerErros(resposta))
 return resposta
}
export async function buscarDashboard(token: string): Promise<Dashboard | null> {
 const resposta = await requisicao(token, `/api/dashboard?agora=${encodeURIComponent(agoraLocal())}`)
 return resposta.status === 204 ? null : await resposta.json() as Dashboard
}
export async function salvarRegistro(token: string, conteudoId: number, dados: Registro): Promise<void> {
 await requisicao(token, `/api/dashboard/registros/${conteudoId}`, dados)
}
