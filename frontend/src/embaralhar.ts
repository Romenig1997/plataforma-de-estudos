/** Copia embaralhada (Fisher-Yates). `aleatorio` pode ser fixado nos testes. */
export function embaralhar<T>(lista: readonly T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}
