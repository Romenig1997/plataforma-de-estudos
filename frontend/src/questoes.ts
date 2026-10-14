import { ErroDeApi, ErroDeRede, SessaoEncerrada, lerErros } from './sessao'
export type QuestaoRascunho = { editalId: number; conteudoId: number; enunciado: string; alternativas: string[]; gabarito: number; explicacao: string }
export type RevisaoQuestao = { id: number; questao: QuestaoRascunho; publicada: boolean }
export type Correcao = { correta: boolean; alternativa: number; gabarito: number; explicacao: string }
export type QuestaoAluno = { id: number; conteudoId: number; conteudo: string; enunciado: string; alternativas: string[]; resposta: Correcao | null }
async function api<T>(token: string,url: string,method='GET',dados?: unknown): Promise<T>{
 let r: Response
 try { r=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,...(dados!==undefined?{'Content-Type':'application/json'}:{})},...(dados!==undefined?{body:JSON.stringify(dados)}:{})}) } catch {throw new ErroDeRede()}
 if(r.status===401)throw new SessaoEncerrada()
 if(!r.ok)throw new ErroDeApi(r.status,await lerErros(r))
 return await r.json() as T
}
export const listarQuestoes = (token: string)=>api<QuestaoAluno[]>(token,'/api/questoes')
export const responderQuestao = (token: string,id: number,alternativa: number)=>api<Correcao>(token,`/api/questoes/${id}/resposta`,'POST',{alternativa})
export const listarRevisoes = (token: string,editalId: number)=>api<RevisaoQuestao[]>(token,`/api/admin/questoes?editalId=${editalId}`)
export const salvarQuestao = (token: string,dados: QuestaoRascunho,id?: number)=>api<RevisaoQuestao>(token,`/api/admin/questoes${id?`/${id}`:''}`,id?'PUT':'POST',dados)
export const publicarQuestao = (token: string,id: number)=>api<RevisaoQuestao>(token,`/api/admin/questoes/${id}/publicar`,'POST')
export const importarQuestoes = (token: string,questoes: QuestaoRascunho[])=>api<RevisaoQuestao[]>(token,'/api/admin/questoes/lote','POST',{questoes})
