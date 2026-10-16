import { describe, expect, it } from 'vitest'
import { distribuirPorTopico, montarPromptDeQuestoes } from './promptDeQuestoes'
import type { RevisaoQuestao } from './questoes'

const topicos = [{ id: 1, nome: 'Português — Crase' }, { id: 2, nome: 'Português — Vírgula' }, { id: 3, nome: 'Matemática — Frações' }]
const existente = (conteudoId: number, enunciado = 'Questão existente'): RevisaoQuestao => ({
  id: conteudoId, publicada: true,
  questao: { editalId: 9, conteudoId, enunciado, alternativas: ['a', 'b', 'c', 'd'], gabarito: 0, explicacao: 'x' },
})
const fixo = () => 0.999

describe('distribuirPorTopico', () => {
  it('comeca pelos topicos com menos questoes e reparte o restante', () => {
    const pedidos = distribuirPorTopico(topicos, [existente(1), existente(1), existente(2)], 4, fixo)
    expect(pedidos.get(3)).toBe(2)
    expect(pedidos.get(2)).toBe(1)
    expect(pedidos.get(1)).toBe(1)
  })

  it('sorteia a ordem entre topicos empatados', () => {
    const a = distribuirPorTopico(topicos, [], 1, () => 0.999)
    const b = distribuirPorTopico(topicos, [], 1, () => 0)
    expect([...a.keys()]).not.toEqual([...b.keys()])
  })
})

describe('montarPromptDeQuestoes', () => {
  it('pede a quantidade, os topicos, o formato e evita repetir as existentes', () => {
    const prompt = montarPromptDeQuestoes({
      editalId: 9, curso: 'Bombeiros', topicos, quantidade: 3, aleatorio: fixo,
      existentes: [existente(1, 'O que é crase?\n  Explique.')],
    })
    expect(prompt).toContain('curso "Bombeiros"')
    expect(prompt).toContain('Crie exatamente 3 questões')
    expect(prompt).toContain('- conteudoId 3 | Matemática — Frações | 1 questão(ões)')
    expect(prompt).toContain('- O que é crase? Explique.')
    expect(prompt).toContain('"editalId": 9')
  })

  it('limita a quantidade ao tamanho do lote', () => {
    expect(montarPromptDeQuestoes({ editalId: 9, curso: 'C', topicos, existentes: [], quantidade: 80, aleatorio: fixo }))
      .toContain('Crie exatamente 50 questões')
  })
})
