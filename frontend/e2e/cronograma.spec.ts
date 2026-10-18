import AxeBuilder from '@axe-core/playwright'
import { entrarComo, expect, test } from './fixtures'

/** Segunda-feira da semana atual (AAAA-MM-DD), a mesma que a tela envia. */
function segundaAtual() {
  const d=new Date();d.setDate(d.getDate()-(d.getDay()+6)%7)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const inscricoes=[{editalId:1,titulo:'Edital CBM PE',orgao:'CBM',ano:2026,emFoco:true,metaHorasSemanais:2,atualizadoEm:'',totalTopicos:2,topicosConcluidos:0,progresso:0}]
const agenda={id:1,semanaInicio:'2026-10-19',metaHorasSemanais:2,editalTitulo:'Edital CBM PE',desatualizado:false,geradoEm:'',
  disponibilidades:[{diaSemana:1,inicio:'19:00:00',fim:'21:00:00'}], atividades:[
    {id:1,data:'2026-10-19',inicio:'19:00:00',fim:'20:00:00',disciplinaId:10,disciplina:'Português',conteudoId:20,conteudo:'Interpretação de textos e compreensão de gêneros textuais com referência ao conteúdo programático.',pagina:2},
    {id:2,data:'2026-10-19',inicio:'20:00:00',fim:'21:00:00',disciplinaId:11,disciplina:'Matemática',conteudoId:21,conteudo:'Álgebra',pagina:5},
  ]}

test('cronograma sem sessao cai no login',async({page})=>{
  await page.goto('/cronograma');await expect(page.getByRole('heading',{name:'Entrar na plataforma'})).toBeVisible()
})
test('cadastra disponibilidade gera agenda e restaura apos recarga com responsividade e axe',async({page})=>{
  await entrarComo(page, 'ALUNO')
  await page.route('**/api/cursos/inscricoes',route=>route.fulfill({json:inscricoes}))
  let salvo=false
  await page.route('**/api/cronograma',async route=>{
    if(route.request().method()==='PUT') {
      expect(route.request().postDataJSON()).toEqual({semanaInicio:segundaAtual(),disponibilidades:[{diaSemana:1,inicio:'19:00',fim:'21:00'}]})
      salvo=true
    }
    await route.fulfill(salvo?{json:agenda}:{status:204})
  })
  await page.goto('/cronograma')
  // Marcacoes da semana: so segunda, das 19h as 21h, dividindo a meta de 2h.
  for(const dia of ['Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira']) await page.getByRole('button',{name:dia,exact:true}).click()
  await page.getByRole('button',{name:'Noite'}).click()
  await page.getByLabel('Início do horário de estudo').fill('19:00');await page.getByLabel('Fim do horário de estudo').fill('21:00')
  await expect(page.getByLabel('Segunda-feira: 19:00 às 21:00')).toBeVisible()
  await expect(page.getByText('Total de 2h na semana, igual à sua meta.')).toBeVisible()
  await page.getByRole('button',{name:'Gerar e salvar cronograma'}).click()
  await expect(page.getByText('Cronograma gerado e salvo.')).toBeVisible()
  await page.reload();await expect(page.getByRole('group',{name:'Dias da semana'})).toBeVisible()
  await expect(page.getByText('19:00–20:00')).toBeVisible();await expect(page.getByRole('button',{name:'Ajustar horários'})).toHaveAttribute('aria-expanded','false')
  for(const width of [320,1280]) {
    await page.setViewportSize({width,height:900})
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
    const auditoria=await new AxeBuilder({page}).analyze()
    expect(auditoria.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])
  }
})
test('horario invalido recebe feedback e nao envia cronograma',async({page})=>{
  await entrarComo(page, 'ALUNO')
  await page.route('**/api/cursos/inscricoes',route=>route.fulfill({json:inscricoes}))
  await page.route('**/api/cronograma',route=>{expect(route.request().method()).toBe('GET');return route.fulfill({status:204})})
  await page.goto('/cronograma');await page.getByRole('button',{name:'Ajustar manualmente'}).click()
  await page.getByLabel('Início — Segunda-feira, horário 1').fill('21:00');await page.getByLabel('Fim — Segunda-feira, horário 1').fill('19:00')
  await page.getByRole('button',{name:'Gerar e salvar cronograma'}).click()
  await expect(page.getByLabel('Fim — Segunda-feira, horário 1')).toHaveAttribute('aria-invalid','true')
  await expect(page.getByLabel('Fim — Segunda-feira, horário 1')).toHaveCSS('border-color','rgb(200, 40, 58)')
})
