import {mkdir} from 'node:fs/promises'
import path from 'node:path'

export async function makeOutDirForPageUrl(outDir: string, url: string): Promise<string> {
    const p = makeUrlOutDirPath(outDir, new URL(url))
    await mkdir(p, {recursive: true})
    return p
}

function makeUrlOutDirPath(outDir: string, url: URL): string {
    if (url.pathname.length && url.pathname !== '/') {
        return path.join(outDir, url.host.replace(':', '_'), ...url.pathname.split('/'))
    } else {
        return path.join(outDir, url.host.replace(':', '_'))
    }
}
