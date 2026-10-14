import {afterEach,expect,it} from 'vitest'
import {buscarFoto,salvarFoto,removerFoto,validarFoto,LIMITE_FOTO} from './fotoPerfil'
import {ErroDeApi,SessaoEncerrada} from './sessao'
import {instalarFetch,respostaJson} from './testes/ajuda'
import {vi} from 'vitest'
afterEach(()=>vi.unstubAllGlobals())
it('consulta foto binaria e ausencia',async()=>{instalarFetch(()=>new Response(new Blob(['foto'],{type:'image/png'}),{headers:{'Content-Type':'image/png'}}));expect((await buscarFoto('token'))?.type).toBe('image/png');instalarFetch(()=>respostaJson(204));expect(await buscarFoto('token')).toBeNull()})
it('envia multipart autenticado sem definir boundary e remove autenticado',async()=>{const fetch=instalarFetch(({init})=>init?.method==='DELETE'?respostaJson(204):new Response(new Blob(['foto'],{type:'image/png'}),{headers:{'Content-Type':'image/png'}}));const f=new File(['foto'],'foto.png',{type:'image/png'});await salvarFoto('token',f);expect((fetch.mock.calls[0][1]?.body as FormData).get('arquivo')).toBe(f);expect(fetch.mock.calls[0][1]?.headers).toEqual({Authorization:'Bearer token'});await removerFoto('token');expect(fetch.mock.calls[1][1]?.method).toBe('DELETE')})
it('valida formato e limite no cliente',()=>{expect(validarFoto(new File(['x'],'x.svg',{type:'image/svg+xml'}))).toContain('PNG ou JPEG');expect(validarFoto(new File([new Uint8Array(LIMITE_FOTO+1)],'x.png',{type:'image/png'}))).toContain('2 MB');expect(validarFoto(new File(['x'],'x.jpg',{type:'image/jpeg'}))).toBeNull()})
it('traduz sessao e erro do servidor',async()=>{instalarFetch(()=>respostaJson(401));await expect(buscarFoto('token')).rejects.toBeInstanceOf(SessaoEncerrada);instalarFetch(()=>respostaJson(400,{erros:[{campo:'foto',mensagem:'Imagem inválida.'}]}));await expect(salvarFoto('token',new File(['x'],'x.png',{type:'image/png'}))).rejects.toBeInstanceOf(ErroDeApi)})
