import react from '@vitejs/plugin-react'
import { createReadStream, existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import http from 'node:http'
import { join } from 'node:path'
import path from 'node:path/posix'
import { defineConfig, PluginOption, type UserConfig } from 'vite'
import { viteSingleFile as singlefile } from 'vite-plugin-singlefile'
import { CaptureWebSocket } from '@eighty4/plunder-core'

// Organization order
//  Env / config / debug output
//  Vite defineConfig export
//  FS parsing .plunder out dir

function parsePort(env: string): number | undefined {
    if (process.env[env]) {
        const port = parseInt(process.env[env], 10)
        if (isNaN(port)) {
            throw new Error(`${env}=${process.env[env]} is not a valid port`)
        }
        return port
    }
}

const webPort = parsePort('VITE_PORT')

const wsPort = parsePort('PLUNDER_WS_PORT') || 8123

const bold = (s: string) => `\u001b[1m${s}\u001b[0m`

const grey = (s: string) => `\u001b[90m${s}\u001b[0m`

const red = (s: string) => `\u001b[31m${s}\u001b[0m`

type PlunderDevMode = 'active' | 'result'

type PlunderDevConfig = {
    mode: PlunderDevMode
    modeEnv: boolean
    outDir?: string
    outDirEnv?: boolean
    outDirExists?: boolean
}

// `active` launches the WS API
// `result` is an HTTP server providing relative http:// GETs for localhost
// development to serve output dir content that would be served by relative
// file:// GETs when webapp is built by @eighty/plunder-cli
function resolveDevConfig(): PlunderDevConfig {
    const mode = process.env.PLUNDER_MODE
    const modeEnv = !!process.env.PLUNDER_MODE?.length
    const outDir = process.env.PLUNDER_OUT_DIR || '.plunder'
    const outDirEnv = !!process.env.PLUNDER_OUT_DIR?.length
    const outDirExists = existsSync(outDir)
    return {
        mode: modeEnv
            ? (mode as PlunderDevMode)
            : outDirExists
              ? 'result'
              : 'active',
        modeEnv,
        outDir,
        outDirEnv,
        outDirExists,
    }
}

function debugPrintAndValidate({
    mode,
    modeEnv,
    outDir,
    outDirExists,
    outDirEnv,
}: PlunderDevConfig): void | never {
    if (!modeEnv && outDirEnv && !outDirExists) {
        errorExit(`PLUNDER_OUT_DIR is set but dir does not exist`)
    }
    console.debug(`Plunder mode: \`${mode}\``)
    if (mode !== 'active' && mode !== 'result') {
        errorExit(
            `${bold('PLUNDER_MODE')} value ${bold(mode)} is bunk, try \`active\` or \`result\``,
        )
    }
    if (mode === 'active' && modeEnv) {
        return
    }
    if (!modeEnv) {
        const modePrint = [bold('PLUNDER_MODE'), 'env not set']
        if (outDirExists) {
            modePrint.push(grey('(default to result because out dir found)'))
        } else if (mode === 'active' && outDirEnv) {
            modePrint.push(
                grey(`(default to active because out dir not found)`),
            )
        }
        console.debug(...modePrint)
    }
    if (mode === 'result') {
        const outDirPrint = ['Plunder out dir:', bold(outDir!)]
        if (!outDirEnv) {
            outDirPrint.push(
                '\u001b[90m(default, configure with env PLUNDER_OUT_DIR)\u001b[0m',
            )
        }
        console.debug(...outDirPrint)
        if (!outDirExists) {
            errorExit(
                `out dir not found, write plunder output to ${bold(outDir!)} and re-run Vite`,
            )
        }
    }
    if (!modeEnv) {
        if (outDirExists) {
            console.debug(
                `Remove dir ${bold(outDir!)} or set ${bold('PLUNDER_MODE=active')} to override default \`result\` mode`,
            )
        } else {
            console.debug(
                `Create out dir ${bold(outDir!)} or set ${bold('PLUNDER_OUT_DIR=path/to/dir')} to override default \`active\` mode`,
            )
        }
    }
}

function errorExit(msg: string): never {
    console.error(red('error:'), msg)
    process.exit(1)
}

// https://vite.dev/config/
// https://www.npmjs.com/package/@vitejs/plugin-react
// https://www.npmjs.com/package/vite-plugin-singlefile
export default defineConfig(async ({ command }): Promise<UserConfig> => {
    switch (command) {
        case 'build':
            return { plugins: [react(), singlefile()] }
        case 'serve':
            const plunderDev: PlunderDevConfig = resolveDevConfig()
            debugPrintAndValidate(plunderDev)
            switch (plunderDev.mode) {
                case 'active':
                    new CaptureWebSocket({ port: wsPort })
                    const seed = `globalThis['plunder']={mode:'active',port:${wsPort}}`
                    return {
                        plugins: [
                            react(),
                            plunderGlobalHtml(Promise.resolve(seed)),
                        ],
                        server: {
                            port: webPort,
                            proxy: {
                                '/api': {
                                    target: `ws://localhost:${wsPort}`,
                                    ws: true,
                                },
                            },
                            strictPort: !!process.env.VITE_PORT,
                        },
                    }
                case 'result':
                    const port = await startPlunderOutDirHttpServer(
                        plunderDev.outDir!,
                    )
                    return {
                        plugins: [
                            react(),
                            plunderGlobalHtml(
                                readCaptureManifests(plunderDev.outDir!),
                            ),
                        ],
                        server: {
                            port: webPort,
                            proxy: {
                                '^.*\\.png': {
                                    target: `http://localhost:${port}`,
                                },
                            },
                            strictPort: !!process.env.VITE_PORT,
                        },
                    }
                default:
                    throw new Error()
            }
    }
})

// plugin that writes globalThis.plunder to HTML document
function plunderGlobalHtml(seed: Promise<string>): PluginOption {
    return {
        apply: 'serve',
        name: 'html-transform',
        async transformIndexHtml(html) {
            return `<script>${await seed}</script>${html}`
        },
    }
}

async function startPlunderOutDirHttpServer(outDir: string): Promise<number> {
    const server = http.createServer((req, res) => {
        if (req.method !== 'GET') {
            res.writeHead(405)
            res.end()
        } else {
            const p = path.join(outDir, req.url!)
            const reading = createReadStream(p)
            res.setHeader('Content-Type', 'image/png')
            reading.pipe(res)
            reading.on('error', err => {
                console.error(
                    `GET ${req.url} file read ${p} error ${err.message}`,
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

async function readCaptureManifests(outDir: string): Promise<string> {
    const dirs = await collectPlunderOutDirs(outDir)
    const manifests = await Promise.all(
        dirs.map(async dir => {
            const manifest = await readFile(join(dir, 'plunder.json'))
            return `globalThis['plunder']['webpages'].push(${manifest.toString()})`
        }),
    )
    return `globalThis['plunder']={mode:'result'};globalThis['plunder']['webpages']=[];${manifests.join(';')}`
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
