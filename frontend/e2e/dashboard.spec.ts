import AxeBuilder from '@axe-core/playwright'
import { entrarComo, expect, test } from './fixtures'
const base={editalId:1,editalTitulo:'Edital CBM PE',totalTopicos:1,topicosConcluidos:0,progresso:0,cronogramaDesatualizado:false,
 disciplinas:[{id:10,nome:'Português',questoes:0,acertos:0,desempenho:null,topicos:[{id:20,nome:'Interpretação de textos',pagina:2,concluido:false,questoes:0,acertos:0}]}],proximasAtividades:[]}
const edital={id:1,titulo:'Edital CBM PE',orgao:'CBM PE',ano:2026,criadoEm:'',materialPdfUrl:null,concursos:[],
 disciplinas:[{id:10,nome:'Português',pagina:2,assuntos:[{id:20,nome:'Interpretação de textos',pagina:2,subassuntos:[]}]}]}
test('dashboard exige sessao',async({page})=>{await page.goto('/dashboard');await expect(page.getByRole('heading',{name:'Entrar na plataforma'})).toBeVisible()})
test('aula marcada no curso atualiza o painel, com responsividade e acessibilidade',async({page})=>{
 await entrarComo(page, 'ALUNO')
 let atual=structuredClone(base)
 await page.route('**/api/editais',route=>route.fulfill({json:[edital]}))
 await page.route('**/api/dashboard**',async route=>{
  if(route.request().method()==='PUT'){
   expect(route.request().url()).toContain('/api/dashboard/registros/20')
   expect(route.request().postDataJSON()).toEqual({concluido:true})
   atual={...base,progresso:100,topicosConcluidos:1,disciplinas:[{...base.disciplinas[0],topicos:[{...base.disciplinas[0].topicos[0],concluido:true}]}]}
   await route.fulfill({status:204});return
  }
  await route.fulfill({json:atual})
 })
 await page.goto('/dashboard');await expect(page.getByText('Sem respostas ainda',{exact:true})).toBeVisible()
 await page.getByRole('link',{name:'Continuar estudando'}).click()
 await page.getByLabel('Concluir aula 1 - Interpretação de textos').check()
 await expect(page.getByText('100% concluído').first()).toBeVisible()
 await page.goto('/dashboard');await expect(page.getByText(/1 de 1 tópico concluído/)).toBeVisible()
 for(const width of [320,1280]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
  const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])
 }
})
test('painel em tema escuro passa na auditoria de contraste',async({page})=>{
 await entrarComo(page, 'ALUNO');await page.addInitScript(()=>localStorage.setItem('estuda:tema','escuro'))
 await page.route('**/api/dashboard**',route=>route.fulfill({json:base}))
 await page.goto('/dashboard');await expect(page.getByText('Sem respostas ainda',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.dataset.tema)).toBe('escuro')
 const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])
})
