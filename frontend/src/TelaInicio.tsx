import { Link } from 'react-router-dom'
import { ArrowRightIcon, CalendarClockIcon, ChartNoAxesCombinedIcon, ClipboardCheckIcon, FileCheck2Icon, TargetIcon, UserRoundCogIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

type Recurso = { selo: string; titulo: string; destaque: string; texto: string; url: string; acao: string; icone: LucideIcon }

const recursos: Recurso[] = [
  { selo: 'Sua preparação começa aqui', titulo: 'PLANEJAMENTO', destaque: 'Um plano para você', texto: 'Escolha seu edital, defina sua meta semanal e distribua o tempo entre as disciplinas.', url: '/planner', acao: 'Criar meu plano', icone: ClipboardCheckIcon },
  { selo: 'Sua rotina, no seu ritmo', titulo: 'CRONOGRAMA', destaque: 'Cada hora conta', texto: 'Informe seus horários disponíveis e organize as atividades de estudo da semana.', url: '/cronograma', acao: 'Organizar minha semana', icone: CalendarClockIcon },
  { selo: 'Pratique e acompanhe', titulo: 'QUESTÕES', destaque: 'Aprenda com cada resposta', texto: 'Responda questões do seu edital e receba a correção com uma explicação do gabarito.', url: '/questoes', acao: 'Começar a praticar', icone: FileCheck2Icon },
]

const objetivos = [
  { selo: 'ACOMPANHAR', titulo: 'Meu progresso', texto: 'Veja os conteúdos concluídos e as próximas atividades.', acao: 'Ver desempenho', url: '/dashboard', icone: ChartNoAxesCombinedIcon },
  { selo: 'EVOLUIR', titulo: 'Onde focar', texto: 'Identifique disciplinas que precisam de mais atenção.', acao: 'Ver recomendações', url: '/dashboard', icone: TargetIcon },
  { selo: 'PERSONALIZAR', titulo: 'Meu perfil de estudo', texto: 'Atualize seus objetivos e suas preferências.', acao: 'Acessar meu perfil', url: '/perfil', icone: UserRoundCogIcon },
]

/**
 * Pagina inicial publica. Os atalhos levam as areas de estudo; para quem ainda
 * nao entrou, a rota protegida pede login e devolve o aluno ao destino.
 */
export default function TelaInicio({ autenticado }: { autenticado: boolean }) {
  return (
    <main className="flex flex-col">
      <section className="relative overflow-hidden bg-brand-navy px-4 pt-14 pb-28 text-center text-white sm:px-6 sm:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 size-80 rounded-full bg-brand-red/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-brand-gold">SEU PRÓXIMO OBJETIVO</span>
          <h1 className="text-3xl leading-tight font-black tracking-tight text-balance sm:text-5xl">
            <span className="text-brand-gold">UMA PREPARAÇÃO COMPLETA.</span>
            <br />
            UM FUTURO CHEIO DE POSSIBILIDADES.
          </h1>
          <p className="max-w-2xl text-base text-pretty text-white/75 sm:text-lg">
            Do edital à prática, organize seus estudos em um só lugar. Planeje com autonomia e acompanhe a sua evolução.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {autenticado ? (
              <Button asChild size="lg" className="bg-brand-red text-white hover:bg-brand-red/90">
                <Link to="/app">Continuar meus estudos <ArrowRightIcon aria-hidden="true" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="bg-brand-red text-white hover:bg-brand-red/90">
                  <Link to="/cadastro">Criar minha conta <ArrowRightIcon aria-hidden="true" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Recursos da plataforma" className="relative z-10 mx-auto -mt-16 grid w-full max-w-6xl grid-cols-1 gap-5 px-4 sm:px-6 md:grid-cols-3">
        {recursos.map((recurso) => (
          <Card key={recurso.url} className="gap-0 overflow-hidden py-0 shadow-xl shadow-brand-navy/10">
            <div className="flex items-center gap-2 bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground">
              <recurso.icone className="size-4" aria-hidden="true" />
              {recurso.selo}
            </div>
            <CardHeader className="gap-2 pt-5">
              <h2 className="text-xs font-bold tracking-[0.16em] text-muted-foreground">{recurso.titulo}</h2>
              <strong className="text-xl leading-snug font-bold">{recurso.destaque}</strong>
            </CardHeader>
            <CardContent className="flex-1 pt-3 pb-6">
              <p className="text-sm text-muted-foreground">{recurso.texto}</p>
            </CardContent>
            <CardFooter className="pb-6">
              <Button asChild className="w-full justify-between">
                <Link to={recurso.url}>{recurso.acao} <ArrowRightIcon aria-hidden="true" /></Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight">Qual é o seu próximo passo?</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {objetivos.map((objetivo) => (
            <Link
              key={objetivo.selo}
              to={objetivo.url}
              className="group flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary">
                <objetivo.icone className="size-4" aria-hidden="true" />
                {objetivo.selo}
              </span>
              <strong className="text-lg font-semibold">{objetivo.titulo}</strong>
              <p className="flex-1 text-sm text-muted-foreground">{objetivo.texto}</p>
              <b className="flex items-center gap-1 text-sm font-semibold text-primary">
                {objetivo.acao} <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </b>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
