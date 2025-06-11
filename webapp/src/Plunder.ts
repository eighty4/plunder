import {
    type CssBreakpoint,
    type DeviceDefinition,
    type MediaQueryBreakpoint,
} from '@eighty4/plunder-core'
import { type Observable } from 'rxjs'

export abstract class PlunderCaptureApi {
    abstract get captureSources(): Observable<CaptureSourceState>
    abstract set captureSource(source: CaptureSource)
    abstract get mode(): PlunderMode
    abstract get openPage(): Observable<OpenPageState | null>
    abstract set openPage(url: string)
    abstract get urls(): Observable<UrlState>
    abstract get webSocket(): Observable<WebSocketConnection>
}

export type ColorScheme = 'dark' | 'light' | 'no-preference'

export type WebpageCaptureState = {
    url: string
    breakpoints: Array<CssBreakpoint>
    devices: Array<DeviceDefinition>
}

export type WebSocketConnection =
    | 'connected'
    | 'connecting'
    | 'error'
    | 'not-applicable'

export type PlunderMode = 'active' | 'result'

export type CaptureSourceState = {
    breakpoints: Array<MediaQueryBreakpoint>
    current: CaptureSource | null
    devices: Array<DeviceDefinition>
}

export type CaptureSource =
    | {
          type: 'device'
          device: DeviceDefinition
      }
    | {
          type: 'css'
          breakpoint: MediaQueryBreakpoint
      }

export type OpenPageState =
    | {
          type: 'single'
          img: PageImage
      }
    | {
          type: 'diff'
          imgA: PageImage
          imgB: PageImage
      }

export type PageImage = {
    src: string
    alt: string
}

export type UrlState = {
    openPage: string | null
    otherPages: Array<string>
}
