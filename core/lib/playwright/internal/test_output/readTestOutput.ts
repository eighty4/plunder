import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function readTestOutput(p: string): Promise<string> {
    return (await readFile(join(import.meta.dirname, p), 'utf8')).trim()
}
