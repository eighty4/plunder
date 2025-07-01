import {
    checkAnchorHrefs,
    InvalidCheckHrefsOption,
    type CheckHrefsOptions,
    type CheckHrefsResult,
} from '@eighty4/plunder-core'
import ansi from './ansi.ts'
import { confirmBrowserInstall } from './browser.ts'
import { errorPrint } from './error.ts'

export async function linkCheckingCommand(
    opts: CheckHrefsOptions,
    installConfirmed: boolean,
): Promise<never> {
    console.log('Plundering anchor tags for broken links')
    try {
        if (!installConfirmed) {
            await confirmBrowserInstall('chromium', true)
        }
        const result = await checkAnchorHrefs(opts)
        printResult(result)
        process.exit(result.good ? 0 : 1)
    } catch (e: any) {
        if (e instanceof InvalidCheckHrefsOption) {
            errorPrint(e.invalidFields.join(',') + ' field(s) are invalid')
        } else {
            errorPrint(e.message)
        }
    }
}

function printResult(result: CheckHrefsResult) {
    result.pages.forEach(page => {
        const mal = page.hrefs.filter(href => !href.good)
        console.log(
            `\n  ${page.url}`,
            mal.length
                ? `\n    ${ansi.green(page.hrefs.length - mal.length)} good, ${ansi.red(mal.length)} bad`
                : `\n    ${ansi.green(page.hrefs.length - mal.length)} good`,
        )
        mal.sort((s1, s2) => {
            if (s1.status === s2.status) {
                return 0
            }
            if (s1.status < s2.status) {
                return -1
            }
            return 1
        })
        mal.forEach(href => {
            const status = ansi[href.status === 429 ? 'grey' : 'red'](
                '' + href.status,
            )
            console.log(`      ${status} ${href.href}`)
        })
    })
}
