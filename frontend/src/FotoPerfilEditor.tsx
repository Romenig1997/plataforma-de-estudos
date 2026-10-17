import { useEffect,useRef,useState } from 'react'
import {buscarFoto,salvarFoto,removerFoto,validarFoto} from './fotoPerfil'
import {ErroDeApi,ErroDeRede,SessaoEncerrada} from './sessao'
import CampoFormulario from './componentes/CampoFormulario'
import Botao from './componentes/Botao'
import Notificacao from './componentes/Notificacao'
type Props={token:string;temFoto:boolean;disabled?:boolean;onEncerrarSessao:(motivo?:string)=>void;onFotoAlterada:(temFoto:boolean)=>void}
export default function FotoPerfilEditor({token,temFoto,disabled=false,onEncerrarSessao,onFotoAlterada}:Props){
 const [atual,setAtual]=useState<string|null>(null),[previa,setPrevia]=useState<string|null>(null),[arquivo,setArquivo]=useState<File|null>(null)
 const [carregando,setCarregando]=useState(temFoto),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState<string|null>(null),[aviso,setAviso]=useState<string|null>(null),[tentativa,setTentativa]=useState(0)
 const urls=useRef(new Set<string>()),versao=useRef(0),input=useRef<HTMLInputElement>(null)
 useEffect(()=>{const recursos=urls.current;return()=>{recursos.forEach(u=>URL.revokeObjectURL(u));recursos.clear()}},[])
 useEffect(()=>{
  let cancelado=false;const v=++versao.current
  if(!temFoto)return()=>{cancelado=true}
  buscarFoto(token).then(blob=>{if(cancelado||v!==versao.current)return;const url=blob?URL.createObjectURL(blob):null;if(url)urls.current.add(url);setAtual(url);setErro(null)}).catch(e=>{if(cancelado||v!==versao.current)return;if(e instanceof SessaoEncerrada)onEncerrarSessao('Sua sessão expirou. Faça login novamente.');else setErro('Não foi possível carregar sua foto. Tente novamente.')}).finally(()=>{if(!cancelado&&v===versao.current)setCarregando(false)})
  return()=>{cancelado=true}
 },[token,temFoto,onEncerrarSessao,tentativa])
 function descartar(url:string|null){if(url){URL.revokeObjectURL(url);urls.current.delete(url)}}
 function cancelar(){descartar(previa);setPrevia(null);setArquivo(null);if(input.current)input.current.value=''}
 function escolher(f?:File){setErro(null);setAviso(null);cancelar();if(!f)return;const mensagem=validarFoto(f);if(mensagem){setErro(mensagem);return}const url=URL.createObjectURL(f);urls.current.add(url);setArquivo(f);setPrevia(url)}
 function falhar(e:unknown){if(e instanceof SessaoEncerrada)onEncerrarSessao('Sua sessão expirou. Faça login novamente.');else setErro(e instanceof ErroDeApi?e.message:e instanceof ErroDeRede?'Não foi possível conectar ao servidor. Tente novamente.':'Não foi possível atualizar a foto. Tente novamente.')}
 async function salvar(){if(!arquivo||ocupado)return;setOcupado(true);setErro(null);setAviso(null);++versao.current;try{const blob=await salvarFoto(token,arquivo);const url=URL.createObjectURL(blob);urls.current.add(url);descartar(atual);setAtual(url);cancelar();onFotoAlterada(true);setAviso('Foto atualizada com sucesso.')}catch(e){falhar(e)}finally{setOcupado(false)}}
 async function remover(){if(ocupado)return;setOcupado(true);setErro(null);setAviso(null);++versao.current;try{await removerFoto(token);descartar(atual);setAtual(null);cancelar();onFotoAlterada(false);setAviso('Foto removida.')}catch(e){falhar(e)}finally{setOcupado(false)}}
 const bloqueado=disabled||ocupado||carregando
 return <section aria-labelledby="foto-perfil-titulo" className="foto-perfil"><h2 id="foto-perfil-titulo">Foto do perfil</h2>
  {previa||atual?<img className="foto-perfil__imagem" src={previa??atual!} alt={previa?'Prévia da nova foto do perfil':'Foto atual do perfil'}/>:<p>Você ainda não adicionou uma foto.</p>}
  {carregando&&<p role="status">Carregando foto...</p>}{previa&&<p>Prévia — a nova foto ainda não foi salva.</p>}
  {erro&&<Notificacao tipo="erro" mensagem={erro} onFechar={()=>setErro(null)}/>}{aviso&&<Notificacao tipo="sucesso" mensagem={aviso} onFechar={()=>setAviso(null)}/>}
  <CampoFormulario id="foto-perfil-arquivo" rotulo="Selecionar foto" ajuda="PNG ou JPEG, até 2 MB. Imagens de até 4096 pixels por lado e 8 milhões de pixels."><input ref={input} type="file" accept="image/png,image/jpeg" disabled={bloqueado} onChange={e=>escolher(e.target.files?.[0])}/></CampoFormulario>
  <div className="acoes acoes--em-linha">{arquivo&&<><Botao type="button" onClick={salvar} disabled={bloqueado}>{ocupado?'Salvando foto...':'Salvar foto'}</Botao><Botao type="button" variante="secundario" onClick={cancelar} disabled={bloqueado}>Cancelar seleção</Botao></>}{(atual||temFoto)&&<Botao type="button" variante="secundario" onClick={remover} disabled={bloqueado}>Remover foto</Botao>}{erro&&temFoto&&<Botao type="button" variante="secundario" onClick={()=>{setCarregando(true);setTentativa(t=>t+1)}} disabled={disabled||ocupado}>Recarregar foto</Botao>}</div>
 </section>
}
