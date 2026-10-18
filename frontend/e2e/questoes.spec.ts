import AxeBuilder from '@axe-core/playwright'
import {expect,test} from './fixtures'
const q={id:1,conteudoId:20,conteudo:'Interpretação de textos',enunciado:'Texto: Ana estudou antes da prova. Qual ação ocorreu primeiro?',alternativas:['Ana estudou.','A prova ocorreu.','As duas ocorreram juntas.','Não é possível saber.'],resposta:null}
test('questoes e revisao exigem sessao',async({page})=>{for(const path of ['/questoes','/admin/questoes']){await page.goto(path);await expect(page.getByRole('heading',{name:'Entrar na plataforma'})).toBeVisible()}})
test('resposta corrigida e restaurada sem expor gabarito antecipadamente',async({page})=>{
 await page.addInitScript(()=>{sessionStorage.setItem('plataforma:token','token-ficticio');Math.random=()=>0.999});let resposta:null|{correta:boolean;alternativa:number;gabarito:number;explicacao:string}=null
 await page.route('**/api/questoes**',async route=>{if(route.request().method()==='POST'){expect(route.request().postDataJSON()).toEqual({alternativa:0});resposta={correta:true,alternativa:0,gabarito:0,explicacao:'A palavra antes indica a ordem temporal.'};await route.fulfill({json:resposta})}else await route.fulfill({json:[{...q,resposta}]})})
 await page.goto('/questoes');await expect(page.getByText(q.enunciado)).toBeVisible();await expect(page.getByText(/Gabarito:/)).toHaveCount(0)
 await page.getByLabel('A. Ana estudou.').check();await page.getByRole('button',{name:'Responder questão 1'}).click();await expect(page.getByText('Resposta correta.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('A. Ana estudou.')).toBeDisabled()
 for(const width of [320,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])}
})
test('admin revisa e publica rascunho com responsividade e axe',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('plataforma:token','cabecalho.eyJzdWIiOiIxIiwicGVyZmlsIjoiQURNSU4ifQ.assinatura'))
 await page.route('**/api/editais',r=>r.fulfill({json:[{id:1,titulo:'Edital teste',disciplinas:[{id:10,nome:'Português',assuntos:[{id:20,nome:'Interpretação',subassuntos:[]}]}]}]}))
 let publicada=false;const revisao=()=>({id:1,publicada,questao:{editalId:1,conteudoId:20,enunciado:q.enunciado,alternativas:q.alternativas,gabarito:0,explicacao:'A palavra antes indica a ordem temporal.'}})
 await page.route('**/api/admin/questoes**',async r=>{if(r.request().method()==='POST'){publicada=true;await r.fulfill({json:revisao()})}else await r.fulfill({json:[revisao()]})})
 await page.goto('/admin/questoes');await page.getByLabel('Edital',{exact:true}).selectOption('1');await expect(page.getByText('Questão 1 — Rascunho')).toBeVisible();await page.getByRole('button',{name:'Aprovar e publicar questão 1'}).click();await expect(page.getByText('Questão 1 — Publicada')).toBeVisible()
 for(const width of [320,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])}
})
