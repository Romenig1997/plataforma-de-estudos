import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

type Props = {
  /** `id` do campo: liga o `<label>` ao controle e nomeia os textos de apoio. */
  id: string
  rotulo: string
  /** Mensagem de erro exibida abaixo do campo (criterio 3 da HU06). */
  erro?: string
  /** Texto de apoio opcional, mais suave que a mensagem de erro. */
  ajuda?: string
  children: ReactNode
}

/**
 * Campo de formulario do design system (HU06).
 *
 * <p>Envolve o `label` associado por `htmlFor`, o controle (input ou textarea)
 * e os textos de ajuda/erro. O componente e quem marca o campo em erro:
 *
 * <ul>
 *   <li>`aria-invalid="true"` no controle, que aciona a borda vermelha;</li>
 *   <li>`aria-describedby` apontando o texto de ajuda e/ou o de erro.</li>
 * </ul>
 *
 * Assim o teste de tela não precisa repetir a ligação — e o feedback visual
 * (erro -> borda) nunca fica dessincronizado do estado acessivel.
 */
function CampoFormulario({ id, rotulo, erro, ajuda, children }: Props) {
  const idAjuda = `${id}-ajuda`
  const idErro = `${id}-erro`
  const descritoPor = [ajuda ? idAjuda : null, erro ? idErro : null]
    .filter(Boolean)
    .join(' ') || undefined

  const controle = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': erro ? 'true' : 'false',
        'aria-describedby': descritoPor,
      })
    : children

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {controle}
      {ajuda && (
        <p id={idAjuda} className="campo__ajuda">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="campo__erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}

export default CampoFormulario