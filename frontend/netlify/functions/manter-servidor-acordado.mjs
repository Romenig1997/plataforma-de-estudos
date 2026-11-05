/**
 * Funcao agendada do Netlify: mantem o backend acordado.
 *
 * O plano gratuito do Render desliga a API apos 15 minutos sem acesso, e
 * acordar pode levar mais de 2 minutos. Esta funcao chama o health check a
 * cada 10 minutos, entao a API nao chega a dormir. Como o health check tambem
 * consulta o banco, o Supabase gratuito nao fica 7 dias sem uso.
 *
 * Um servico rodando o mes todo gasta ~744 h das 750 h gratis do Render.
 * So roda no site publicado (nao em previews nem no ambiente local).
 */
const URL_DO_HEALTH = 'https://plataforma-estudos-api.onrender.com/actuator/health'

export default async function manterServidorAcordado() {
  const inicio = Date.now()
  try {
    const resposta = await fetch(URL_DO_HEALTH, { signal: AbortSignal.timeout(25_000) })
    console.log(`health ${resposta.status} em ${Date.now() - inicio} ms`)
  } catch (erro) {
    // Servidor acordando ou fora do ar: a chamada ja serviu para acorda-lo.
    console.log(`health sem resposta em ${Date.now() - inicio} ms: ${erro instanceof Error ? erro.message : erro}`)
  }
  return new Response(null, { status: 204 })
}

export const config = { schedule: '*/10 * * * *' }
