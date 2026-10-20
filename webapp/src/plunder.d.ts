import { type CaptureScreenshotManifest } from '@eighty4/plunder-core/web'

declare global {
    interface Window {
        plunder:
            | {
                  mode: 'active'
                  port: number
              }
            | {
                  mode: 'result'
                  webpages: Array<CaptureScreenshotManifest>
              }
    }
}
