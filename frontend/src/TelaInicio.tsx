import { Link } from 'react-router-dom'

const recursos = [
  { selo: 'Sua preparação começa aqui', titulo: 'PLANEJAMENTO', destaque: 'Um plano para você', texto: 'Escolha seu edital, defina sua meta semanal e distribua o tempo entre as disciplinas.', url: '/planner', acao: 'Criar meu plano' },
  { selo: 'Sua rotina, no seu ritmo', titulo: 'CRONOGRAMA', destaque: 'Cada hora conta', texto: 'Informe seus horários disponíveis e organize as atividades de estudo da semana.', url: '/cronograma', acao: 'Organizar minha semana' },
  { selo: 'Pratique e acompanhe', titulo: 'QUESTÕES', destaque: 'Aprenda com cada resposta', texto: 'Responda questões do seu edital e receba a correção com uma explicação do gabarito.', url: '/questoes', acao: 'Começar a praticar' },
]

/**
 * Pagina inicial publica. Os atalhos levam as areas de estudo; para quem ainda
 * nao entrou, a rota protegida pede login e devolve o aluno ao destino.
 */
export default function TelaInicio({ autenticado }: { autenticado: boolean }) {
  return <main className="inicio-publico">
    <section className="inicio-hero">
      <span className="sobretitulo">SEU PRÓXIMO OBJETIVO</span>
      <h1><span>UMA PREPARAÇÃO COMPLETA.</span><br />UM FUTURO CHEIO DE POSSIBILIDADES.</h1>
      <p>Do edital à prática, organize seus estudos em um só lugar.<br />Planeje com autonomia e acompanhe a sua evolução.</p>
      <div className="inicio-hero__acoes">
        {autenticado
          ? <Link className="inicio-hero__acao" to="/app">Continuar meus estudos <span aria-hidden="true">→</span></Link>
          : <>
            <Link className="inicio-hero__acao" to="/cadastro">Criar minha conta <span aria-hidden="true">→</span></Link>
            <Link className="inicio-hero__acao inicio-hero__acao--secundaria" to="/login">Já tenho conta</Link>
          </>}
      </div>
      <div className="inicio-recursos">{recursos.map((recurso) => <article key={recurso.url} className="inicio-recurso"><div className="inicio-recurso__selo">{recurso.selo}</div><div className="inicio-recurso__corpo"><h2>{recurso.titulo}</h2><strong>{recurso.destaque}</strong><p>{recurso.texto}</p><Link to={recurso.url}>{recurso.acao} <span aria-hidden="true">→</span></Link></div></article>)}</div>
    </section>
    <section className="inicio-objetivos"><h2>Qual é o seu próximo passo?</h2><div><Link to="/dashboard"><span>ACOMPANHAR</span><strong>Meu progresso</strong><p>Veja os conteúdos concluídos e as próximas atividades.</p><b>Ver desempenho →</b></Link><Link to="/analise"><span>EVOLUIR</span><strong>Minha análise</strong><p>Identifique disciplinas que precisam de mais atenção.</p><b>Ver recomendações →</b></Link><Link to="/perfil"><span>PERSONALIZAR</span><strong>Meu perfil de estudo</strong><p>Atualize seus objetivos e suas preferências.</p><b>Acessar meu perfil →</b></Link></div></section>
  </main>
}
