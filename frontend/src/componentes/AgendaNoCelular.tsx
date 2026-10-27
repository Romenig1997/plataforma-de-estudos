import { useState } from 'react'
import { buscarLinkDaAgenda, gerarNovoLinkDaAgenda } from '../cronograma'
import { mensagemDaFalha } from '../api'
import Aviso from './Aviso'
import { CalendarPlusIcon, CopyIcon, ExternalLinkIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Props = {
  token: string
  onEncerrarSessao: (motivo?: string) => void
}

/**
 * Cronograma na agenda do celular (HU18). O link .ics e pedido so quando o
 * aluno clica, e nao fica salvo no navegador: ele da acesso a agenda sem login.
 */
export default function AgendaNoCelular({ token, onEncerrarSessao }: Props) {
  const [link, setLink] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function obter(novo: boolean) {
    setCarregando(true)
    setErro(null)
    setAviso(null)
    try {
      const { caminho } = await (novo ? gerarNovoLinkDaAgenda(token) : buscarLinkDaAgenda(token))
      setLink(`${window.location.origin}${caminho}`)
      if (novo) setAviso('Novo link gerado. O anterior parou de funcionar: assine a agenda de novo onde ela estava.')
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível gerar o link da agenda. Tente novamente.')
      if (mensagem) setErro(mensagem)
    } finally {
      setCarregando(false)
    }
  }

  async function copiar() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setAviso('Link copiado.')
    } catch {
      setAviso('Selecione o link e copie manualmente.')
    }
  }

  const webcal = link?.replace(/^https?:\/\//, 'webcal://')

  return (
    <Card role="region" aria-labelledby="titulo-agenda-celular">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="titulo-agenda-celular" className="flex items-center gap-2 text-base font-semibold"><CalendarPlusIcon className="size-4 text-primary" aria-hidden="true" />Agenda do celular</h2>
          <p className="text-sm text-muted-foreground">
            Assine o cronograma no Google Agenda, Outlook ou no calendário do celular e receba um lembrete 10 minutos antes de cada sessão. Mudanças feitas aqui aparecem lá na próxima atualização da agenda.
          </p>
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {!link
          ? <div><Button type="button" disabled={carregando} onClick={() => void obter(false)}><CalendarPlusIcon aria-hidden="true" />{carregando ? 'Gerando link...' : 'Adicionar à minha agenda'}</Button></div>
          : <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              <span>Link da sua agenda</span>
              <Input readOnly value={link} onFocus={evento => evento.target.select()} />
            </label>
            <p className="text-xs text-muted-foreground">Este link dá acesso ao seu cronograma sem login. Não compartilhe; se ele vazar, gere um novo.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void copiar()}><CopyIcon aria-hidden="true" />Copiar link</Button>
              <Button asChild size="sm" variant="outline">
                <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal ?? '')}`} target="_blank" rel="noreferrer noopener">
                  <ExternalLinkIcon aria-hidden="true" />Abrir no Google Agenda
                </a>
              </Button>
              <Button asChild size="sm" variant="outline"><a href={webcal}><CalendarPlusIcon aria-hidden="true" />Abrir no app de calendário</a></Button>
              <Button type="button" size="sm" variant="ghost" disabled={carregando} onClick={() => void obter(true)}><RefreshCwIcon aria-hidden="true" />Gerar novo link</Button>
            </div>
          </div>}
        {aviso && <p className="text-sm text-muted-foreground" role="status">{aviso}</p>}
      </CardContent>
    </Card>
  )
}
