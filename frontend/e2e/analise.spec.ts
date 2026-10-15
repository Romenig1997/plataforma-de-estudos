import AxeBuilder from '@axe-core/playwright'
import {expect,test} from './fixtures'
test('analise exige sessao',async({page})=>{await page.goto('/analise');await expect(page.getByRole('heading',{name:'Entrar na plataforma'})).toBeVisible()})
test('analise sem respostas informa dependencia com responsividade e axe',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('plataforma:token','token-ficticio'))
 await page.route('**/api/analise',r=>r.fulfill({json:{editalId:1,editalTitulo:'Edital teste',analise:{desempenhoGeral:null,comparacaoDisponivel:false,disciplinas:[{id:1,nome:'Português',questoes:0,acertos:0,desempenho:null,abaixoDosDemais:false}],recomendacoes:[]}}}))
 await page.goto('/analise');await expect(page.getByText('Dados insuficientes para análise.')).toBeVisible();await expect(page.getByRole('spinbutton')).toHaveCount(0)
 for(const width of [320,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])}
})
