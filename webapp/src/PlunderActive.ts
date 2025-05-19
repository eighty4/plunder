import {
    type CaptureWebSocketReq,
    type CaptureWebSocketRes,
    type CssMediaQuery,
    type DeviceDefinition,
} from '@eighty4/plunder-core'
import {
    type CaptureSource,
    type CaptureSourceState,
    type OpenPageState,
    PlunderCaptureApi,
    type PlunderMode,
    type UrlState,
    type WebSocketConnection,
} from './Plunder.ts'
import { BehaviorSubject, map, type Observable, Subject } from 'rxjs'

type PlunderActiveState = {
    devices: {
        default: Array<DeviceDefinition>
        queries: Record<string, Array<DeviceDefinition>>
    }
    mediaQueries: Record<string, CssMediaQuery>
    // screenshots: Record<string, {
    // breakpoints: [],
    // devices: [],
    // }>
    openPageUrl: string | null
    urls: Array<string>
    webSocket: WebSocketConnection
}

export class PlunderActiveApi extends PlunderCaptureApi {
    #state: BehaviorSubject<PlunderActiveState>
    #ws: PlunderWebSocket

    constructor(port: number) {
        super()
        this.#state = new BehaviorSubject({
            devices: {
                default: [],
                queries: {},
            },
            mediaQueries: {},
            openPageUrl: null,
            urls: [],
            webSocket: 'connecting',
        } as PlunderActiveState)
        this.#ws = new PlunderWebSocket(port)
        this.#ws.messages.subscribe(this.#onWebSocketMessage)
        this.#ws.status.subscribe(this.#onWebSocketStatus)
    }

    #onWebSocketMessage = (msg: CaptureWebSocketRes) => {
        switch (msg.type) {
            case 'default-devices':
                // this.#setDefaultDevices(msg)
                break
            case 'queried-devices':
                // this.#setQueriedDevices(msg)
                break
            case 'media-queries':
                // this.#setMediaQueries(msg)
                break
            case 'breakpoint-capture':
                // this.#setBreakpointCapture(msg)
                break
            case 'device-capture':
                // this.#setDeviceCapture(msg)
                break
            default:
                console.error(
                    (msg as any).type,
                    'is invalid type for CaptureWebSocketRes',
                )
        }
    }

    #onWebSocketStatus = (webSocket: WebSocketConnection) => {
        this.#state.next({
            ...this.#state.getValue(),
            webSocket,
        })
    }

    get captureSources(): Observable<CaptureSourceState> {
        return this.#state.pipe(
            map(_ => {
                return {
                    current: null,
                    devices: [],
                    mediaQueries: [],
                }
            }),
        )
    }

    set captureSource(_source: CaptureSource) {
        throw new Error('Method not implemented.')
    }

    get mode(): PlunderMode {
        return 'active'
    }

    get openPage(): Observable<OpenPageState | null> {
        /* data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg== */
        return this.#state.pipe(map(_ => null))
    }

    set openPage(url: string) {
        this.#state.next({
            ...this.#state.getValue(),
            openPageUrl: url,
        })
    }

    get urls(): Observable<UrlState> {
        return this.#state.pipe(
            map(s => ({
                openPage: s.openPageUrl || null,
                otherPages: s.urls.filter(u => u !== s.openPageUrl),
            })),
        )
    }

    get webSocket(): Observable<WebSocketConnection> {
        return this.#state.asObservable().pipe(map(s => s.webSocket))
    }
}

export class PlunderWebSocket {
    #messages: Subject<CaptureWebSocketRes>
    #status: BehaviorSubject<WebSocketConnection>
    #ws: WebSocket

    constructor(port: number) {
        if (!port || isNaN(port)) {
            throw new Error('PlunderWebSocket(port) is invalid')
        }
        this.#messages = new Subject()
        this.#status = new BehaviorSubject<WebSocketConnection>('connecting')
        this.#ws = new WebSocket('http://localhost:' + port)
        this.#ws.onopen = this.#onOpen
        this.#ws.onmessage = this.#onMessage
        this.#ws.onclose = this.#onClose
        this.#ws.onerror = this.#onError
    }

    send(msg: CaptureWebSocketReq): void {
        console.log('ws send', msg.type)
        this.#ws.send(JSON.stringify(msg))
    }

    get messages(): Observable<CaptureWebSocketRes> {
        return this.#messages.asObservable()
    }

    get status(): Observable<WebSocketConnection> {
        return this.#status.asObservable()
    }

    #onMessage = (e: MessageEvent) => {
        const msg: CaptureWebSocketRes = JSON.parse(e.data)
        console.log('ws recv', msg.type)
    }

    #onOpen = () => {
        this.#status.next('connected')
        console.log('ws open')
    }

    #onClose = () => {
        this.#status.next('error')
        console.log('ws close')
    }

    #onError = (e: any) => {
        this.#status.next('error')
        console.error('ws error', Object.keys(e))
    }
}
