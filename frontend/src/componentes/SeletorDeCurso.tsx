import type { Inscricao } from '../cursos'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'

type Props = {
  inscricoes: Inscricao[]
  /** Curso exibido agora (o pedido no endereco ou o que a API devolveu). */
  editalAtual: number | null
  onEscolher: (editalId: number) => void
}

/** Seletor de curso para quem esta inscrito em mais de um. */
export default function SeletorDeCurso({ inscricoes, editalAtual, onEscolher }: Props) {
  if (inscricoes.length < 2) return null
  const valor = editalAtual ?? inscricoes.find((i) => i.emFoco)?.editalId ?? inscricoes[0].editalId
  return (
    <div className="flex w-full flex-col gap-2 sm:w-72">
      <Label htmlFor="seletor-curso">Curso</Label>
      <NativeSelect id="seletor-curso" value={valor} onChange={(evento) => onEscolher(Number(evento.target.value))}>
        {inscricoes.map((i) => (
          <option key={i.editalId} value={i.editalId}>
            {i.titulo}
            {i.emFoco ? ' (em foco)' : ''}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}
