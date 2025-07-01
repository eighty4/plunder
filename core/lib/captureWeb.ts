import { createReadStream } from 'node:fs'
import {
    createServer as createHttpServer,
    type IncomingMessage,
    type Server as HttpServer,
    type ServerResponse,
} from 'node:http'
import { type Duplex, Transform } from 'node:stream'
import WebSocket, { WebSocketServer } from 'ws'
import { type CssBreakpoint, type CssMediaQuery } from './cssParse.ts'
import { type DeviceDefinition, getModernDevices } from './devices.ts'
import { parsePageForBreakpoints } from './pageParse.ts'
import { type BrowserProcess, launchBrowser } from './playwrightProcess.ts'

export type OpenPageReq = {
    type: 'open-page'
    url: string
}

export type CaptureWebSocketReq = OpenPageReq

export type DefaultDevicesRes = {
    type: 'default-devices'
    devices: Array<DeviceDefinition>
}

export type QueriedDevicesRes = {
    type: 'queried-devices'
    query: string
    devices: Array<DeviceDefinition>
}

export type MediaQueriesRes = {
    type: 'media-queries'
    url: string
    mediaQueries: Array<CssMediaQuery>
}

export type BreakpointCaptureRes = {
    type: 'breakpoint-capture'
    url: string
    breakpoint: CssBreakpoint
    on: string
    out: string
}

export type DeviceCaptureRes = {
    type: 'device-capture'
    url: string
    device: string
    screenshot: string
}

export type CaptureWebSocketRes =
    | DefaultDevicesRes
    | QueriedDevicesRes
    | MediaQueriesRes
    | BreakpointCaptureRes
    | DeviceCaptureRes

export interface CaptureWebSocketOpts {
    // WS port defaults to 7944
    port?: number
    // absolute path to webapp index.html or false to disable
    serveUI: false | string
}

export class CaptureWebSocket {
    #browser: Promise<BrowserProcess>
    #port: number
    #server: HttpServer
    #wss: WebSocketServer

    constructor(opts: CaptureWebSocketOpts) {
        const port = (this.#port = opts.port || 7944)
        this.#server = createHttpServer(
            createRequestListener(port, opts.serveUI),
        )
        this.#wss = new WebSocketServer({ noServer: true })
        this.#server.on('upgrade', createUpgradeListener(this.#wss))
        this.#server.listen(this.#port)
        this.#wss.on('connection', this.#onConnection)
        this.#browser = launchBrowser()
    }

    async initializing() {
        await this.#browser
    }

    get port(): number {
        return this.#port
    }

    onClose(): Promise<void> {
        return new Promise(res => this.#server.once('close', res))
    }

    #onConnection = (ws: WebSocket) => {
        this.#onOpen(ws)
        ws.on('message', json => this.#onMessage(ws, json))
        ws.on('close', () => console.log('ws close'))
    }

    #onOpen(ws: WebSocket) {
        console.log('ws open')
        send(ws, {
            type: 'default-devices',
            devices: getModernDevices(),
        })
    }

    #onMessage(ws: WebSocket, json: any) {
        const msg: CaptureWebSocketReq = JSON.parse(json)
        console.log('ws recv', msg.type)
        switch (msg.type) {
            case 'open-page':
                this.#browser.then(browser => onOpenPage(browser, ws, msg.url))
                break
            default:
                console.error(
                    'ws msg',
                    msg.type || 'W/O .type',
                    'is not a valid CaptureWebSocketReq',
                )
                ws.close()
        }
    }
}

async function onOpenPage(browser: BrowserProcess, ws: WebSocket, url: string) {
    const { mediaQueries } = await parsePageForBreakpoints(browser, url)
    send(ws, {
        type: 'media-queries',
        url,
        mediaQueries,
    })
}

function send(ws: WebSocket, msg: CaptureWebSocketRes) {
    console.log('ws send', msg.type)
    ws.send(JSON.stringify(msg))
}

function createRequestListener(
    port: number,
    serveUI: CaptureWebSocketOpts['serveUI'],
): (req: IncomingMessage, res: ServerResponse) => void {
    return (req, res) => {
        if (serveUI !== false && req.url === '/') {
            const reading = createReadStream(serveUI)
            res.setHeader('Content-Type', 'text/html')
            const appendBootstrap = new Transform({
                transform(chunk, _encoding, cb) {
                    cb(null, chunk)
                },
                flush(cb) {
                    const bootstrap = `<script>globalThis['plunder']={mode:'active',port:${port}}</script>`
                    this.push(Buffer.from(bootstrap))
                    cb()
                },
            })
            reading.pipe(appendBootstrap).pipe(res)
            reading.on('error', err => {
                console.error(
                    `GET ${req.url} file read ${serveUI} error ${err.message}`,
                )
                res.statusCode = 500
                res.end()
            })
        } else {
            res.statusCode = 404
            res.end()
        }
    }
}

function createUpgradeListener(
    wss: WebSocketServer,
): (req: IncomingMessage, socket: Duplex, head: Buffer) => void {
    return (req, socket, head) => {
        if (req.url === '/plundering') {
            wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
                wss.emit('connection', ws, req)
            })
        } else {
            socket.destroy()
        }
    }
}
