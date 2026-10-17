import { expect, it } from 'vitest'
import conf from '../nginx.conf?raw'

/**
 * O leitor de PDF do curso mostra o arquivo baixado como blob: em um iframe.
 * Sem blob: no frame-src, o navegador troca o PDF por "conteudo bloqueado".
 */
it('a politica de seguranca do nginx permite o PDF do curso no iframe', () => {
  const csp = /Content-Security-Policy "([^"]+)"/.exec(conf)?.[1] ?? ''
  const frameSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('frame-src')) ?? ''
  expect(frameSrc.split(/\s+/)).toContain('blob:')
  // A pagina continua sem poder ser embutida em outros sites.
  expect(csp).toContain("frame-ancestors 'none'")
})
