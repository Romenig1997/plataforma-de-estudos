import { ErroDeApi, ErroDeRede, SessaoEncerrada, lerErros } from './sessao'
export type Analise = { editalId: number; editalTitulo: string; analise: {
 desempenhoGeral: number | null; comparacaoDisponivel: boolean;
 disciplinas: { id: number; nome: string; questoes: number; acertos: number; desempenho: number | null; abaixoDosDemais: boolean }[];
 recomendacoes: { disciplinaId: number; disciplina: string; mensagem: string }[]
} }
export async function buscarAnalise(token: string): Promise<Analise | null> {
 let resposta: Response
 try { resposta = await fetch('/api/analise', {headers:{Authorization:`Bearer ${token}`}}) }
 catch { throw new ErroDeRede() }
 if(resposta.status===401)throw new SessaoEncerrada()
 if(!resposta.ok)throw new ErroDeApi(resposta.status,await lerErros(resposta))
 return resposta.status===204?null:await resposta.json() as Analise
}
