export type CaptureProgressCallback = (progress: CaptureProgress) => void

export type CaptureProgressStep = CaptureProgress['step']

export type CaptureProgress =
    | StartupProgress
    | ParsingCssProgress
    | CaptureScreenshotsProgress
    | CaptureCompletedProgress

// update sent after validating capture options and installing browsers
export interface StartupProgress {
    step: 'starting'
}

// update sent if parsing css breakpoints for screenshots to capture
export interface ParsingCssProgress {
    step: 'parsing'
    pages: {
        total: number
        completed: number
    }
}

// update sent during screenshot capture
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
