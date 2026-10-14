import AxeBuilder from '@axe-core/playwright'
import {expect,test} from '@playwright/test'
const base={editalId:1,editalTitulo:'Edital CBM PE',totalTopicos:1,topicosConcluidos:0,progresso:0,cronogramaDesatualizado:false,
 disciplinas:[{id:10,nome:'Português',questoes:0,acertos:0,desempenho:null,topicos:[{id:20,nome:'Interpretação de textos',pagina:2,concluido:false,questoes:0,acertos:0}]}],proximasAtividades:[]}
test('dashboard exige sessao',async({page})=>{await page.goto('/dashboard');await expect(page.getByRole('heading',{name:'Entrar na plataforma'})).toBeVisible()})
test('registros atualizam painel e sao restaurados com responsividade e acessibilidade',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('plataforma:token','token-ficticio'))
 let atual=structuredClone(base)
 await page.route('**/api/dashboard**',async route=>{
  if(route.request().method()==='PUT'){
   expect(route.request().postDataJSON()).toEqual({concluido:true})
   atual={...base,progresso:100,topicosConcluidos:1,disciplinas:[{...base.disciplinas[0],questoes:0,acertos:0,desempenho:null,topicos:[{...base.disciplinas[0].topicos[0],concluido:true,questoes:0,acertos:0}]}]} as typeof base
   await route.fulfill({status:204});return
  }
  await route.fulfill({json:atual})
 })
 await page.goto('/dashboard');await expect(page.getByText('Sem dados',{exact:true})).toBeVisible()
 await page.getByLabel('Disciplina',{exact:true}).selectOption('10');await page.getByLabel('Tópico',{exact:true}).selectOption('20')
 await page.getByLabel('Tópico concluído').check();await page.getByRole('button',{name:'Salvar registro'}).click()
 await expect(page.getByText('100%',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Sem dados',{exact:true})).toBeVisible()
 for(const width of [320,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
  const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])
 }
})
