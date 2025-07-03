import type { CaptureProgress, CaptureProgressStep } from './captureProgress.js'

export class CaptureProgressUpdater {
    #step: CaptureProgressStep = 'starting'
    readonly #pages: { total: number; completed: number } = {
        total: 0,
        completed: 0,
    }
    readonly #screenshots: { total: number; completed: number } = {
        total: 0,
        completed: 0,
    }
    readonly #updater: (progress: CaptureProgress) => void

    constructor(updater: (progress: CaptureProgress) => void) {
        this.#updater = updater
    }

    markStarting() {
        this.#sendUpdate()
    }

    markPageParsingStarting(n: number) {
        this.#step = 'parsing'
        this.#pages.total += n
        this.#sendUpdate()
    }

    markScreenshotCaptureStarting(n: number) {
        this.#step = 'capturing'
        this.#screenshots.total += n
        this.#sendUpdate()
    }

    markCompleted() {
        this.#step = 'completed'
        this.#sendUpdate()
    }

    markPageParsed() {
        this.#pages.completed += 1
        this.#sendUpdate()
    }

    markScreenshotCaptured() {
        this.#screenshots.completed += 1
        this.#sendUpdate()
    }

    #sendUpdate() {
        this.#updater(this.#createUpdate())
    }

    #createUpdate(): CaptureProgress {
        switch (this.#step) {
            case 'starting':
                return {
                    step: 'starting',
                }
            case 'capturing':
                return {
                    step: 'capturing',
                    pages: {
                        total: this.#pages.total,
                        completed: this.#pages.completed,
                    },
                    screenshots: {
                        total: this.#screenshots.total,
                        completed: this.#screenshots.completed,
                    },
                }
            case 'parsing':
                return {
                    step: 'parsing',
                    pages: {
                        total: this.#pages.total,
                        completed: this.#pages.completed,
                    },
                }
            case 'completed':
                return { step: 'completed' }
        }
    }
}
