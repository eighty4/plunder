import { expect, test } from '@playwright/test'
import {
    activeApiConfig,
    multiPageConfig,
    singlePageConfig,
} from '../../playwright.config.ts'

test.describe('Url', () => {
    test.describe('multiple page results', () => {
        test.use(multiPageConfig())

        const firstPage = 'https://alistapart.com'
        const otherPage = 'https://github.com/eighty4'

        test('UrlHistory opens and shows other pages', async ({ page }) => {
            await page.goto('/')
            await expect(
                page.getByText('https://github.com/eighty4'),
            ).not.toBeVisible()
            const urlInput = page.getByText('https://alistapart.com')
            await urlInput.click()
            await expect(
                page.getByText('https://github.com/eighty4'),
            ).toBeVisible()
        })

        test('UrlHistory closes on toggle blur without dropdown hover', async ({
            page,
        }) => {
            await page.goto('/')
            const urlInput = page.getByText('https://alistapart.com')
            await urlInput.click()
            await expect(
                page.getByText('https://github.com/eighty4'),
            ).toBeVisible()
            await page
                .getByRole('checkbox', { name: 'https://alistapart.com' })
                .blur()
            await expect(
                page.getByText('https://github.com/eighty4'),
            ).not.toBeVisible()
        })

        test('UrlHistory closes on toggle blur with dropdown hover', async ({
            page,
        }) => {
            await page.goto('/')
            const urlInput = page.getByText(firstPage)
            await urlInput.click()
            await expect(page.getByText(otherPage)).toBeVisible()
            await page.getByText(otherPage).hover()
            await page.mouse.click(200, 200)
            await expect(page.getByText(otherPage)).not.toBeVisible()
        })

        test('UrlHistory navigates to another page on click', async ({
            page,
        }) => {
            await page.goto('/')
            await page.getByText(firstPage).click()
            await expect(page.getByText(otherPage)).toBeVisible()
            await page.getByText(otherPage).hover()
            await page.getByText(otherPage).click()
            await expect(page.getByText(firstPage)).not.toBeVisible()
        })
    })

    test.describe('single page result', () => {
        test.use(singlePageConfig())

        test('Url displayed in header', async ({ page }) => {
            await page.goto('/')
            const urlInput = page.getByText('https://alistapart.com')
            expect(await urlInput.isVisible()).toBe(true)
        })
    })

    test.describe('active api', () => {
        test.use(activeApiConfig())

        test('UrlInput prepends cursor with https://', async ({ page }) => {
            await page.goto('/')
            const urlInput = page.getByPlaceholder('Type web address here')
            await urlInput.focus()
            expect(await urlInput.inputValue()).toBe('https://')
            await urlInput.blur()
            expect(await urlInput.inputValue()).toBe('')
        })

        test('UrlInput opens page', async ({ page }) => {
            await page.goto('/')
            const urlInput = page.getByPlaceholder('Type web address here')
            await urlInput.pressSequentially('alistapart.com')
            expect(await urlInput.inputValue()).toBe('https://alistapart.com')
            await urlInput.press('Enter')
            // todo
        })

        test('UrlInput does not open page for invalid url', async ({
            page,
        }) => {
            await page.goto('/')
            const urlInput = page.getByPlaceholder('Type web address here')
            await urlInput.pressSequentially('https://google.com')
            expect(await urlInput.inputValue()).toBe(
                'https://https://google.com',
            )
            await urlInput.press('Enter')
            // todo
        })
    })
})
