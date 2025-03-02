import react from '@vitejs/plugin-react'
import { createReadStream } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import http from 'node:http'
import { join } from 'node:path'
import path from 'node:path/posix'
import { defineConfig, PluginOption } from 'vite'
import { viteSingleFile as singlefile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// https://www.npmjs.com/package/@vitejs/plugin-react
// https://www.npmjs.com/package/vite-plugin-singlefile
export default defineConfig(async ({ command }) => {
    switch (command) {
        case 'build':
            return { plugins: [react(), singlefile()] }
        case 'serve':
            debugPrintPlunderOutDir()
            return {
                plugins: [react(), plunderCaptureManifest()],
                server: {
                    proxy: {
                        '^.*\\.png': {
                            target: `http://localhost:${await startPlunderOutDirHttpServer()}`,
                        },
                    },
                },
            }
    }
})

function debugPrintPlunderOutDir() {
    const p = getPlunderOutDir()
    const print = ['Plunder out directory for dev:', `\u001b[1m${p}\u001b[0m`]
    if (p === '.plunder') {
        print.push(
            '\u001b[90m(default, configure with env PLUNDER_OUT_DIR)\u001b[0m',
        )
    }
    console.debug(...print)
}

const getPlunderOutDir = () => process.env.PLUNDER_OUT_DIR || '.plunder'

async function startPlunderOutDirHttpServer(): Promise<number> {
    const plunderOutDir = getPlunderOutDir()
    const server = http.createServer((req, res) => {
        if (req.method !== 'GET') {
            res.writeHead(405)
            res.end()
        } else {
            const p = path.join(plunderOutDir, req.url!)
            const reading = createReadStream(p)
            res.setHeader('Content-Type', 'image/png')
            reading.pipe(res)
            reading.on('error', err => {
                console.error(
                    'GET',
                    req.url,
                    'file read',
                    p,
                    'error',
                    err.message,
                )
                res.statusCode = 500
                res.end()
            })
        }
    })
    return new Promise((res, rej) => {
        server.listen(() => {
            const address = server.address()
            if (
                typeof address !== 'string' &&
                typeof address?.port === 'number'
            ) {
                res(address.port)
            } else {
                rej('http server address info is garbagio')
            }
        })
    })
}

function plunderCaptureManifest(): PluginOption {
    let readingCaptureManifests: Promise<string>
    return {
        apply: 'serve',
        name: 'html-transform',
        async transformIndexHtml(html) {
            if (!readingCaptureManifests) {
                readingCaptureManifests =
                    readCaptureManifests(getPlunderOutDir())
            }
            return (await readingCaptureManifests) + html
        },
    }
}

async function readCaptureManifests(p: string): Promise<string> {
    const dirs = await collectPlunderOutDirs(p)
    const manifests = await Promise.all(
        dirs.map(async dir => {
            const manifest = await readFile(join(dir, 'plunder.json'))
            return `globalThis['plunder']['webpages'].push(${manifest.toString()})`
        }),
    )
    const bootstrap = `<script>globalThis['plunder'] = {};globalThis['plunder']['webpages'] = [];${manifests.join(';')}</script>`
    return bootstrap
}

async function collectPlunderOutDirs(p: string): Promise<Array<string>> {
    const result: Array<string> = []
    const children = await readdir(p, { withFileTypes: true })
    for (const child of children) {
        if (child.isDirectory()) {
            result.push(...(await collectPlunderOutDirs(join(p, child.name))))
        } else if (child.name === 'plunder.json') {
            result.push(p)
        }
    }
    return result
}
