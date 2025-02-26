import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { devices } from 'playwright-core'
import { resolveDeviceDefinitions } from './devices.ts'

describe('resolveDeviceDefinitions', () => {
    it('matches some iPhones', () => {
        const actual = resolveDeviceDefinitions(['iphone']).map(dd => dd.label)
        const expected: Array<keyof typeof devices> = [
            'iPhone 6',
            'iPhone 6 Plus',
            'iPhone 7',
            'iPhone 7 Plus',
            'iPhone 8',
            'iPhone 8 Plus',
            'iPhone X',
            'iPhone 11',
            'iPhone 11 Pro',
            'iPhone 11 Pro Max',
            'iPhone 12',
            'iPhone 12 Mini',
            'iPhone 12 Pro',
            'iPhone 12 Pro Max',
            'iPhone 13',
            'iPhone 13 Mini',
            'iPhone 13 Pro',
            'iPhone 13 Pro Max',
            'iPhone 14',
            'iPhone 14 Plus',
            'iPhone 14 Pro',
            'iPhone 14 Pro Max',
            'iPhone 15',
            'iPhone 15 Plus',
            'iPhone 15 Pro',
            'iPhone 15 Pro Max',
            'iPhone SE',
            'iPhone XR',
        ]
        assert.deepEqual(new Set(actual), new Set(expected))
    })
})
