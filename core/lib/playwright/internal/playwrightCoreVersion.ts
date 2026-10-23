import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolveDependency } from './resolveDependency.ts'

export async function getPlaywrightCoreVersion(): Promise<string> {
    return JSON.parse(
        await readFile(
            join(resolveDependency('playwright-core'), 'package.json'),
            'utf8',
        ),
    ).version
}
