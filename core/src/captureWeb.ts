import WebSocket, { WebSocketServer } from 'ws'
import { type CssBreakpoint, type CssMediaQuery } from './cssParse.ts'
import { type DeviceDefinition, getModernDevices } from './devices.ts'
import { parsePageForBreakpoints } from './pageParse.ts'
import { type BrowserProcess, launchBrowser } from './playwright.ts'

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
    // WS port defaults to 8123
    port?: number
}

export class CaptureWebSocket {
    #browser: Promise<BrowserProcess>
    #wss: WebSocketServer

    constructor(opts?: CaptureWebSocketOpts) {
        const port = opts?.port || 8123
        this.#wss = new WebSocketServer({
            port,
        })
        this.#wss.on('connection', this.#onConnection)
        this.#browser = launchBrowser()
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
