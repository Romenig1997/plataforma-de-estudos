import AxeBuilder from '@axe-core/playwright'
import { entrarComo, expect, test } from './fixtures'

// A analise passou a fazer parte do Desempenho: o endereco antigo redireciona.
test('analise exige sessao',async({page})=>{await page.goto('/analise');await expect(page.getByRole('heading',{name:'Entrar na plataforma'})).toBeVisible()})
test('endereco antigo da analise abre o desempenho do mesmo curso com responsividade e axe',async({page})=>{
 await entrarComo(page, 'ALUNO')
 const painel={editalId:1,editalTitulo:'Edital teste',totalTopicos:1,topicosConcluidos:0,progresso:0,cronogramaDesatualizado:false,proximasAtividades:[],
  disciplinas:[{id:1,nome:'Português',questoes:0,acertos:0,desempenho:null,topicos:[{id:5,nome:'Crase',pagina:2,concluido:false,questoes:0,acertos:0}]}]}
 await page.route('**/api/dashboard**',r=>r.fulfill({json:painel}))
 await page.route('**/api/analise**',r=>r.fulfill({json:{editalId:1,editalTitulo:'Edital teste',analise:{desempenhoGeral:null,comparacaoDisponivel:false,disciplinas:[{id:1,nome:'Português',questoes:0,acertos:0,desempenho:null,abaixoDosDemais:false}],topicos:[],recomendacoes:[]}}}))
 await page.goto('/analise?curso=1');await expect(page).toHaveURL(/\/dashboard\?curso=1$/)
 await expect(page.getByRole('heading',{name:'Onde focar agora'})).toBeVisible();await expect(page.getByText(/dois tópicos diferentes/)).toBeVisible()
 await expect(page.getByRole('link',{name:'Análise'})).toHaveCount(0)
 for(const width of [320,1280]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])}
})
