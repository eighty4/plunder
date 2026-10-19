import { readFile } from 'node:fs/promises'
import { resolveDependency } from './resolveDependency.ts'
import { join } from 'node:path'

export async function getPlaywrightCoreVersion(): Promise<string> {
    return JSON.parse(
        await readFile(
            join(resolveDependency('playwright-core'), 'package.json'),
            'utf8',
        ),
    ).version
}
