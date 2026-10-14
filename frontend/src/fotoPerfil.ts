import { ErroDeApi, ErroDeRede, SessaoEncerrada, lerErros } from './sessao'
export const LIMITE_FOTO = 2 * 1024 * 1024
export function validarFoto(arquivo: File): string | null {
 if (!['image/png','image/jpeg'].includes(arquivo.type)) return 'Selecione uma imagem PNG ou JPEG.'
 if (!arquivo.size || arquivo.size > LIMITE_FOTO) return 'Selecione uma imagem de até 2 MB.'
 return null
}
async function api(token: string,method: string,arquivo?: File): Promise<Response> {
 let r: Response
 const dados = arquivo ? new FormData() : undefined
 if (arquivo) dados!.append('arquivo',arquivo)
 try { r = await fetch('/api/perfil/foto',{method,headers:{Authorization:`Bearer ${token}`},...(dados?{body:dados}:{})}) }
 catch { throw new ErroDeRede() }
 if(r.status===401)throw new SessaoEncerrada()
 if(!r.ok)throw new ErroDeApi(r.status,await lerErros(r))
 return r
}
export async function buscarFoto(token: string): Promise<Blob | null> { const r=await api(token,'GET');return r.status===204?null:await r.blob() }
export async function salvarFoto(token: string,arquivo: File): Promise<Blob> { return await (await api(token,'POST',arquivo)).blob() }
export async function removerFoto(token: string): Promise<void> { await api(token,'DELETE') }
