import { embaralhar } from './embaralhar'
import type { QuestaoRascunho, RevisaoQuestao } from './questoes'

export type TopicoDoPrompt = { id: number; nome: string }

export const MAXIMO_POR_LOTE = 50
const EXISTENTES_NO_PROMPT = 40
const TAMANHO_DO_RESUMO = 150

/**
 * Distribui a quantidade pedida pelos topicos, comecando pelos que tem menos
 * questoes; empates sao sorteados para cada prompt sair diferente.
 */
export function distribuirPorTopico(
  topicos: readonly TopicoDoPrompt[],
  existentes: readonly RevisaoQuestao[],
  quantidade: number,
  aleatorio: () => number = Math.random,
): Map<number, number> {
  const contagem = new Map<number, number>()
  existentes.forEach(r => contagem.set(r.questao.conteudoId, (contagem.get(r.questao.conteudoId) ?? 0) + 1))
  const ordem = embaralhar(topicos, aleatorio).sort((a, b) => (contagem.get(a.id) ?? 0) - (contagem.get(b.id) ?? 0))
  const pedidos = new Map<number, number>()
  for (let i = 0; i < quantidade && ordem.length; i++) {
    const topico = ordem[i % ordem.length]
    pedidos.set(topico.id, (pedidos.get(topico.id) ?? 0) + 1)
  }
  return pedidos
}

function resumir(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return limpo.length > TAMANHO_DO_RESUMO ? `${limpo.slice(0, TAMANHO_DO_RESUMO)}...` : limpo
}

/** Prompt para colar em uma IA; a resposta volta pela importacao de JSON. */
export function montarPromptDeQuestoes(dados: {
  editalId: number
  curso: string
  topicos: readonly TopicoDoPrompt[]
  existentes: readonly RevisaoQuestao[]
  quantidade: number
  aleatorio?: () => number
}): string {
  const quantidade = Math.min(MAXIMO_POR_LOTE, Math.max(1, Math.floor(dados.quantidade)))
  const pedidos = distribuirPorTopico(dados.topicos, dados.existentes, quantidade, dados.aleatorio)
  const linhasDeTopicos = dados.topicos
    .filter(t => pedidos.has(t.id))
    .map(t => `- conteudoId ${t.id} | ${t.nome} | ${pedidos.get(t.id)} questão(ões)`)
  const existentes = dados.existentes.slice(-EXISTENTES_NO_PROMPT).map(r => `- ${resumir(r.questao.enunciado)}`)
  const exemplo: QuestaoRascunho = {
    editalId: dados.editalId,
    conteudoId: dados.topicos[0]?.id ?? 0,
    enunciado: 'Texto do enunciado.',
    alternativas: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
    gabarito: 2,
    explicacao: 'Por que a alternativa C está correta e as demais não.',
  }

  return [
    `Você é um professor que prepara questões inéditas de concurso público para o curso "${dados.curso}".`,
    '',
    `Crie exatamente ${quantidade} questões de múltipla escolha, distribuídas assim:`,
    ...linhasDeTopicos,
    '',
    'Regras:',
    '- Cada questão tem exatamente 4 alternativas diferentes e apenas uma correta.',
    '- "gabarito" é o índice da alternativa correta: 0 = A, 1 = B, 2 = C, 3 = D. Varie a posição da correta entre as questões.',
    '- Escreva em português do Brasil, com nível de concurso, e uma explicação curta da resposta.',
    '- Não copie questões de provas reais nem de bancas; crie questões originais.',
    `- Use somente os conteudoId listados acima e editalId ${dados.editalId}.`,
    ...(existentes.length
      ? ['', 'Já existem estas questões no curso. Não repita os enunciados nem as mesmas ideias:', ...existentes]
      : []),
    '',
    'Responda somente com um array JSON válido, sem texto antes ou depois, no formato:',
    JSON.stringify([exemplo], null, 2),
  ].join('\n')
}
