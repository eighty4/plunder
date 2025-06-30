import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export type CaptureOutDir = {
    // joined outDir and webpage subpath
    webpageOutDir: string
    // webpage subpath from outDir root
    webpageSubpathWithinOutDir: string
}

export async function makeOutDirForPageUrl(
    outDir: string,
    url: string,
): Promise<CaptureOutDir> {
    const webpageSubpathWithinOutDir = makeUrlSubdirPath(new URL(url))
    const webpageOutDir = join(outDir, webpageSubpathWithinOutDir)
    await mkdir(webpageOutDir, { recursive: true })
    return { webpageOutDir, webpageSubpathWithinOutDir }
}

// todo search and hash
function makeUrlSubdirPath(url: URL): string {
    if (url.pathname.length && url.pathname !== '/') {
        return join(url.host.replace(':', '_'), ...url.pathname.split('/'))
    } else {
        return url.host.replace(':', '_')
    }
}
