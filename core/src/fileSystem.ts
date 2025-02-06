import {mkdir} from 'node:fs/promises'
import path from 'node:path'

export async function makeUrlOutDir(outDir: string, url: URL): Promise<string> {
    const p = makeUrlOutDirPath(outDir, url)
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
