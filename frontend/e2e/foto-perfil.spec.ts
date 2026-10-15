import AxeBuilder from '@axe-core/playwright'
import {expect,test} from './fixtures'
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrWQAAAAASUVORK5CYII=','base64')
const perfil={id:1,nome:'Aluno teste',email:'teste@example.com',metaEstudoSemanal:10,objetivoMotivacao:null,temFoto:false}
test('foto salva restaura troca e remove mantendo dados do perfil',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('plataforma:token','token-ficticio'));let temFoto=false;let uploads=0
 await page.route('**/api/perfil',r=>r.fulfill({json:{...perfil,temFoto}}))
 await page.route('**/api/perfil/foto',async r=>{if(r.request().method()==='POST'){temFoto=true;uploads++;await r.fulfill({contentType:'image/png',body:png})}else if(r.request().method()==='DELETE'){temFoto=false;await r.fulfill({status:204})}else await r.fulfill(temFoto?{contentType:'image/png',body:png}:{status:204})})
 await page.goto('/perfil');await page.getByLabel('Selecionar foto').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:png});await expect(page.getByAltText('Prévia da nova foto do perfil')).toBeVisible();expect(uploads).toBe(0);await page.getByRole('button',{name:'Salvar foto',exact:true}).click();await expect(page.getByText('Foto atualizada com sucesso.')).toBeVisible();await page.reload();await expect(page.getByAltText('Foto atual do perfil')).toBeVisible()
 await page.getByLabel('Selecionar foto').setInputFiles({name:'outra.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Salvar foto',exact:true}).click();await expect(page.getByText('Foto atualizada com sucesso.')).toBeVisible();expect(uploads).toBe(2)
 for(const width of [320,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([])}
 await page.getByRole('button',{name:'Remover foto'}).click();await expect(page.getByText('Foto removida.')).toBeVisible();await page.reload();await expect(page.getByText('Você ainda não adicionou uma foto.')).toBeVisible();await expect(page.getByLabel('Nome completo')).toHaveValue('Aluno teste')
})
test('foto acima do limite recebe feedback sem upload',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('plataforma:token','token-ficticio'));await page.route('**/api/perfil',r=>r.fulfill({json:perfil}));await page.route('**/api/perfil/foto',r=>{expect(r.request().method()).toBe('GET');return r.fulfill({status:204})})
 await page.goto('/perfil');await page.getByLabel('Selecionar foto').setInputFiles({name:'grande.png',mimeType:'image/png',buffer:Buffer.alloc(2*1024*1024+1)});await expect(page.getByLabel('Selecionar foto')).toHaveAttribute('aria-invalid','true');await expect(page.getByLabel('Selecionar foto')).toHaveCSS('border-color','rgb(220, 38, 38)');await expect(page.getByRole('button',{name:'Salvar foto',exact:true})).toHaveCount(0)
})
