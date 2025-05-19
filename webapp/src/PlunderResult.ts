import {
    type CaptureScreenshotManifest,
    type DeviceScreenshots,
    type MediaQueryScreenshots,
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
import { BehaviorSubject, map, type Observable } from 'rxjs'

type CaptureSourceScreenshots =
    | {
          type: 'device'
          device: DeviceScreenshots
      }
    | {
          type: 'css'
          mediaQuery: MediaQueryScreenshots
      }

type PlunderResultState = {
    openPageSource: CaptureSourceScreenshots | null
    openPageUrl: string | null
    webpages: Array<CaptureScreenshotManifest>
}

export class PlunderResultApi extends PlunderCaptureApi {
    #state: BehaviorSubject<PlunderResultState>

    constructor(webpages: Array<CaptureScreenshotManifest>) {
        super()
        this.#state = new BehaviorSubject<PlunderResultState>(
            PlunderResultApi.#initialState(webpages),
        )
    }

    get captureSources(): Observable<CaptureSourceState> {
        return this.#state.pipe(
            map(s => {
                const current = PlunderResultApi.#mapCaptureSource(
                    s.openPageSource,
                )
                if (s.openPageUrl) {
                    const w = s.webpages.find(w => w.url === s.openPageUrl)
                    const devices = w?.devices?.map(d => d.definition) || []
                    const mediaQueries = w?.mediaQueries || []
                    return {
                        current,
                        devices,
                        mediaQueries,
                    }
                } else {
                    return {
                        current,
                        devices: [],
                        mediaQueries: [],
                    }
                }
            }),
        )
    }

    set captureSource(source: CaptureSource) {
        console.log('PlunderResult.captureSource =', source)
        const s = this.#state.getValue()
        const w = s.webpages.find(w => w.url === s.openPageUrl)!
        if (source.type === 'device') {
            this.#state.next({
                ...s,
                openPageSource: {
                    type: 'device',
                    device: w.devices.find(
                        d => d.definition.label === source.device.label,
                    )!,
                },
            })
        } else if (source.type === 'css') {
            this.#state.next({
                ...s,
                openPageSource: {
                    type: 'css',
                    mediaQuery: w.mediaQueries!.find(
                        q => q.code.excerpt === source.mediaQuery.code.excerpt,
                    )!,
                },
            })
        } else {
            throw new Error('wtf')
        }
    }

    get mode(): PlunderMode {
        return 'result'
    }

    get openPage(): Observable<OpenPageState | null> {
        return this.#state.pipe(
            map(s => {
                if (s.openPageSource) {
                    if (s.openPageSource.type === 'device') {
                        const w = s.webpages.find(w => w.url === s.openPageUrl)!
                        const d = s.openPageSource.device
                        const img = {
                            src: `${w.dir}/${d.landscape}`,
                            alt: d.definition.label,
                        }
                        return {
                            mode: this.mode,
                            type: 'single' as const,
                            img,
                        }
                    } else if (s.openPageSource.type === 'css') {
                        const w = s.webpages.find(w => w.url === s.openPageUrl)!
                        const b = s.openPageSource.mediaQuery.breakpoints[0]
                        const imgA = {
                            src: `${w.dir}/${b.screenshotOn}`,
                            alt: `on ${b.dimension.value}${b.dimension.uom}`,
                        }
                        const imgB = {
                            src: `${w.dir}/${b.screenshotOut}`,
                            alt: `outside of ${b.dimension.value}${b.dimension.uom}`,
                        }
                        return {
                            mode: this.mode,
                            type: 'diff' as const,
                            imgA,
                            imgB,
                        }
                    }
                }
                return null
            }),
        )
    }

    set openPage(url: string) {
        const s = this.#state.getValue()
        const w = s.webpages.find(w => w.url === url)!
        this.#state.next({
            ...s,
            openPageSource: PlunderResultApi.#initialSource(w),
            openPageUrl: url,
        })
    }

    get urls(): Observable<UrlState> {
        return this.#state.pipe(
            map(s => ({
                openPage: s.openPageUrl || null,
                otherPages: s.webpages
                    .filter(w => w.url !== s.openPageUrl)
                    .map(w => w.url),
            })),
        )
    }

    get webSocket(): Observable<WebSocketConnection> {
        return this.#state.asObservable().pipe(map(_ => 'not-applicable'))
    }

    static #initialSource(
        webpage: CaptureScreenshotManifest,
    ): CaptureSourceScreenshots | null {
        if (webpage.devices.length) {
            return {
                type: 'device',
                device: webpage.devices[0],
            }
        } else if (webpage.mediaQueries?.length) {
            return {
                type: 'css' as const,
                mediaQuery: webpage.mediaQueries[0],
            }
        } else {
            return null
        }
    }

    static #initialState(
        webpages: Array<CaptureScreenshotManifest>,
    ): PlunderResultState {
        if (webpages.length) {
            return {
                openPageSource: PlunderResultApi.#initialSource(webpages[0]),
                openPageUrl: webpages[0].url,
                webpages,
            }
        } else {
            return {
                openPageSource: null,
                openPageUrl: null,
                webpages,
            }
        }
    }

    static #mapCaptureSource(
        s?: CaptureSourceScreenshots | null,
    ): CaptureSource | null {
        switch (s?.type) {
            case 'device':
                return {
                    type: 'device',
                    device: s.device.definition,
                }
            case 'css':
                return {
                    type: 'css',
                    mediaQuery: s.mediaQuery,
                }
            default:
                return null
        }
    }
}
