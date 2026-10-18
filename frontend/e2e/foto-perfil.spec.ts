import AxeBuilder from '@axe-core/playwright'
import { entrarComo, expect, test } from './fixtures'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrWQAAAAASUVORK5CYII=', 'base64')
const STORAGE = 'http://supabase-ficticio.localhost/storage/v1/object/public/avatars/00000000-0000-4000-8000-000000000001'
const perfil = { id: 1, nome: 'Aluno teste', email: 'teste@example.com', perfil: 'ALUNO', metaEstudoSemanal: 10, objetivoMotivacao: null }

test('foto vai para o Storage, aparece pela URL publica, troca e remove mantendo o perfil', async ({ page }) => {
  await entrarComo(page, 'ALUNO')
  let avatarUrl: string | null = null
  let uploads = 0
  await page.route('**/storage/v1/object/public/avatars/**', r => r.fulfill({ contentType: 'image/png', body: png }))
  await page.route('**/api/perfil', r => r.fulfill({ json: { ...perfil, avatarUrl } }))
  await page.route('**/api/perfil/foto', async r => {
    if (r.request().method() === 'POST') {
      uploads++
      avatarUrl = `${STORAGE}/avatar-${uploads}.png`
      await r.fulfill({ json: { avatarUrl } })
    } else {
      avatarUrl = null
      await r.fulfill({ status: 204 })
    }
  })

  await page.goto('/perfil')
  await expect(page.getByLabel('Perfil de acesso')).toHaveValue('Aluno')
  await page.getByLabel('Selecionar foto').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByAltText('Prévia da nova foto do perfil')).toBeVisible()
  expect(uploads).toBe(0)
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click()
  await expect(page.getByText('Foto atualizada com sucesso.')).toBeVisible()
  await page.reload()
  await expect(page.getByAltText('Foto atual do perfil')).toHaveAttribute('src', `${STORAGE}/avatar-1.png`)

  await page.getByLabel('Selecionar foto').setInputFiles({ name: 'outra.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click()
  await expect(page.getByText('Foto atualizada com sucesso.')).toBeVisible()
  await expect(page.getByAltText('Foto atual do perfil')).toHaveAttribute('src', `${STORAGE}/avatar-2.png`)

  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const auditoria = await new AxeBuilder({ page }).analyze()
    expect(auditoria.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
  }

  await page.getByRole('button', { name: 'Remover foto' }).click()
  await expect(page.getByText('Foto removida.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Você ainda não adicionou uma foto.')).toBeVisible()
  await expect(page.getByLabel('Nome completo')).toHaveValue('Aluno teste')
})

test('foto acima do limite recebe feedback sem upload', async ({ page }) => {
  await entrarComo(page, 'ALUNO')
  await page.route('**/api/perfil', r => r.fulfill({ json: { ...perfil, avatarUrl: null } }))
  let uploads = 0
  await page.route('**/api/perfil/foto', r => { uploads++; return r.fulfill({ status: 500 }) })

  await page.goto('/perfil')
  await page.getByLabel('Selecionar foto').setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) })
  await expect(page.getByLabel('Selecionar foto')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Selecionar foto')).toHaveCSS('border-color', 'rgb(220, 38, 38)')
  await expect(page.getByRole('button', { name: 'Salvar foto', exact: true })).toHaveCount(0)
  expect(uploads).toBe(0)
})
