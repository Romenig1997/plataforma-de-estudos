import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const plano={id:1,metaHorasSemanais:2,edital:{titulo:'Edital CBM PE'}}
const agenda={id:1,semanaInicio:'2026-10-19',metaHorasSemanais:2,editalTitulo:'Edital CBM PE',desatualizado:false,geradoEm:'',
  disponibilidades:[{diaSemana:1,inicio:'19:00:00',fim:'21:00:00'}], atividades:[
    {id:1,data:'2026-10-19',inicio:'19:00:00',fim:'20:00:00',disciplinaId:10,disciplina:'Português',conteudoId:20,conteudo:'Interpretação de textos e compreensão de gêneros textuais com referência ao conteúdo programático.',pagina:2},
    {id:2,data:'2026-10-19',inicio:'20:00:00',fim:'21:00:00',disciplinaId:11,disciplina:'Matemática',conteudoId:21,conteudo:'Álgebra',pagina:5},
  ]}

test('cronograma sem sessao cai no login',async({page})=>{
  await page.goto('/cronograma');await expect(page.getByRole('heading',{name:'Entrar na plataforma'})).toBeVisible()
})
test('cadastra disponibilidade gera agenda e restaura apos recarga com responsividade e axe',async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem('plataforma:token','token-ficticio'))
  await page.route('**/api/planner',route=>route.fulfill({json:plano}))
  let salvo=false
  await page.route('**/api/cronograma',async route=>{
    if(route.request().method()==='PUT') {
      expect(route.request().postDataJSON()).toEqual({semanaInicio:'2026-10-19',disponibilidades:[{diaSemana:1,inicio:'19:00',fim:'21:00'}]})
      salvo=true
    }
    await route.fulfill(salvo?{json:agenda}:{status:204})
  })
  await page.goto('/cronograma');await page.getByLabel('Semana iniciando em').fill('2026-10-19')
  await page.getByRole('button',{name:'Adicionar horário'}).click()
  await page.getByLabel('Início — horário 1').fill('19:00');await page.getByLabel('Fim — horário 1').fill('21:00')
  await page.getByRole('button',{name:'Gerar e salvar cronograma'}).click()
  await expect(page.getByText('Cronograma gerado e salvo.')).toBeVisible()
  await page.reload();await expect(page.getByRole('heading',{name:'Agenda semanal salva'})).toBeVisible()
  await expect(page.getByText('19:00–20:00 · Português')).toBeVisible()
  for(const width of [320,1280]) {
    await page.setViewportSize({width,height:900})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
    const auditoria=await new AxeBuilder({page}).analyze()
    expect(auditoria.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])
  }
})
test('horario invalido recebe feedback e nao envia cronograma',async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem('plataforma:token','token-ficticio'))
  await page.route('**/api/planner',route=>route.fulfill({json:plano}))
  await page.route('**/api/cronograma',route=>{expect(route.request().method()).toBe('GET');return route.fulfill({status:204})})
  await page.goto('/cronograma');await page.getByRole('button',{name:'Adicionar horário'}).click()
  await page.getByLabel('Início — horário 1').fill('21:00');await page.getByLabel('Fim — horário 1').fill('19:00')
  await page.getByRole('button',{name:'Gerar e salvar cronograma'}).click()
  await expect(page.getByLabel('Fim — horário 1')).toHaveAttribute('aria-invalid','true')
  await expect(page.getByLabel('Fim — horário 1')).toHaveCSS('border-color','rgb(220, 38, 38)')
})
