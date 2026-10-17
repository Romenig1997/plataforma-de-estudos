import { DIAS_CURTOS, diaEMes, hojeLocal, somarDias } from './cronograma'

/** Percentual inteiro para leitura rapida: 38,46 vira "38%". */
export const formatarPercentual = (valor: number) => `${Math.round(valor)}%`

/** "1 acerto", "3 acertos". */
export const contar = (quantidade: number, singular: string, plural: string) =>
  `${quantidade} ${quantidade === 1 ? singular : plural}`

export type NivelDeAcertos = { rotulo: string; classe: 'bom' | 'atencao' | 'fraco' }

/** Faixa de acertos mostrada em texto e cor (a cor nunca e a unica informacao). */
export function nivelDeAcertos(percentual: number): NivelDeAcertos {
  if (percentual >= 70) return { rotulo: 'Bom', classe: 'bom' }
  if (percentual >= 50) return { rotulo: 'Atenção', classe: 'atencao' }
  return { rotulo: 'Precisa reforçar', classe: 'fraco' }
}

/** "hoje", "amanhã" ou "sex, 23/10". */
export function diaRelativo(data: string, hoje = hojeLocal()): string {
  if (data === hoje) return 'hoje'
  if (data === somarDias(hoje, 1)) return 'amanhã'
  const indice = (new Date(`${data}T12:00:00`).getDay() + 6) % 7
  return `${DIAS_CURTOS[indice].toLowerCase()}, ${diaEMes(data)}`
}
