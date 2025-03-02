import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export async function makeOutDirForPageUrl(
    outDir: string,
    url: string,
): Promise<{ p: string; urlSubdir: string }> {
    const urlSubdir = makeUrlSubdirPath(new URL(url))
    const p = join(outDir, urlSubdir)
    await mkdir(p, { recursive: true })
    return { p, urlSubdir }
}

// todo search and hash
function makeUrlSubdirPath(url: URL): string {
    if (url.pathname.length && url.pathname !== '/') {
        return join(url.host.replace(':', '_'), ...url.pathname.split('/'))
    } else {
        return url.host.replace(':', '_')
    }
}
