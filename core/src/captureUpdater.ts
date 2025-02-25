import type { CaptureProgress, CaptureProgressStep } from './captureProgress.js'

export class CaptureProgressUpdater {
    #step: CaptureProgressStep = 'parsing'
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

    addToParsePageTotal(n: number) {
        this.#pages.total += n
        this.#sendUpdate()
    }

    addToParsePageCompleted(n: number) {
        this.#pages.completed += n
        this.#sendUpdate()
    }

    addToScreenshotsTotal(n: number) {
        this.#screenshots.total += n
        this.#sendUpdate()
    }

    addToScreenshotsCompleted(n: number) {
        this.#screenshots.completed += n
        this.#sendUpdate()
    }

    markPageParsed = () => this.addToParsePageCompleted(1)

    markPageParsingCompleted() {
        this.#step = 'capturing'
        this.#sendUpdate()
    }

    markScreenshotCompleted = () => this.addToScreenshotsCompleted(1)

    #sendUpdate() {
        this.#updater(this.#createUpdate())
    }

    #createUpdate(): CaptureProgress {
        switch (this.#step) {
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
