export type CaptureProgressCallback = (progress: CaptureProgress) => void

export type CaptureProgressStep = CaptureProgress['step']

export type CaptureProgress = ParsingCssProgress | CaptureScreenshotsProgress | CaptureCompletedProgress

export interface ParsingCssProgress {
    step: 'parsing'
    pages: {
        total: number
        completed: number
    }
}

export interface CaptureScreenshotsProgress {
    step: 'capturing'
    pages: {
        total: number
        completed: number
    }
    screenshots: {
        total: number
        completed: number
    }
}

export interface CaptureCompletedProgress {
    step: 'completed'
}
