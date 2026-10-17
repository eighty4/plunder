import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveDeviceQueries } from './devices.ts'

describe('resolveDeviceQueries', () => {
    it('matches some iPhones', () => {
        assert.ok(
            resolveDeviceQueries(['iphone'])
                .map(dd => dd.label)
                .includes('iPhone X'),
        )
    })
})
