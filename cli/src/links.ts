import {
    checkAnchorHrefs,
    InvalidCheckHrefsOption,
    type CheckHrefsOptions,
    type CheckHrefsResult,
} from '@eighty4/plunder-core'
import ansi from './ansi.ts'
import { errorPrint } from './error.ts'

export const LINKS_CMD_NAME = 'links'

export async function linkCheckingCommand(
    opts: CheckHrefsOptions,
): Promise<never> {
    console.log('Plundering anchor tags for broken links')
    try {
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
            // todo combine ansi term colors and string padding on the http status code
            //  solving a real computer science engineering problem humanity faces
            //  grey for 429, red for all other statuses
            let output = `      ${('' + href.status).padEnd(5, ' ')} ${href.href}`
            if (href.status === 429) {
                output = ansi.grey(output)
            }
            console.log(output)
        })
    })
}
