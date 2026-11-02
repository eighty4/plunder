export type CaptureScreenshotsStep = CaptureScreenshotsProgress['step']

export type CaptureScreenshotsProgress =
    | CaptureScreenshotsProgressStarting
    | CaptureScreenshotsProgressParsingCss
    | CaptureScreenshotsProgressCapturing
    | CaptureScreenshotsProgressCompleted

// update sent after validating capture options and installing browsers
export interface CaptureScreenshotsProgressStarting {
    step: 'starting'
}

// update sent if parsing css breakpoints for screenshots to capture
export interface CaptureScreenshotsProgressParsingCss {
    step: 'parsing'
    pages: {
        total: number
        completed: number
    }
}

// update sent during screenshot capture
export interface CaptureScreenshotsProgressCapturing {
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

export interface CaptureScreenshotsProgressCompleted {
    step: 'completed'
}
