import { type CaptureScreenshotManifest } from '@eighty4/plunder-core'

declare global {
    interface Window {
        plunder: {
            webpages: Array<CaptureScreenshotManifest>
        }
    }
}
