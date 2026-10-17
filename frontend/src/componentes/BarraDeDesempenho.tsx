type Props = {
  rotulo: string
  /** 0 a 100; `null` quando ainda nao ha dados (barra vazia). */
  valor: number | null
  texto: string
  /** Faixa de cor da barra; sem faixa usa a cor de acao. */
  nivel?: 'bom' | 'atencao' | 'fraco'
}

/** Linha "rotulo · barra · texto" usada nos cartoes de disciplina. */
function BarraDeDesempenho({ rotulo, valor, texto, nivel }: Props) {
  return (
    <div className="barra-desempenho">
      <span className="barra-desempenho__rotulo">{rotulo}</span>
      <progress
        className={nivel ? `barra-desempenho__barra barra-desempenho__barra--${nivel}` : 'barra-desempenho__barra'}
        value={valor ?? 0}
        max={100}
        aria-label={`${rotulo}: ${texto}`}
      />
      <span className="barra-desempenho__texto">{texto}</span>
    </div>
  )
}

export default BarraDeDesempenho
