import { type FC, type MouseEvent, useEffect, useRef, useState } from 'react'
import {
    type DeviceDefinition,
    type MediaQueryBreakpoint,
} from '@eighty4/plunder-core'
import {
    type CaptureSource,
    type CaptureSourceState,
    type PlunderCaptureApi,
} from '../Plunder.ts'
import styles from './Source.module.css'

export type SourceCommandProps = {
    plunder: PlunderCaptureApi
}

export const SourceCommand: FC<SourceCommandProps> = ({ plunder }) => {
    const [sources, setSources] = useState<CaptureSourceState | null>(null)
    const [showMenu, setShowMenu] = useState<boolean>(false)

    useEffect(() => {
        const subscription = plunder.captureSources.subscribe(setSources)
        return () => subscription.unsubscribe()
    }, [])

    function onHover(hovering: boolean) {
        console.log('Source', 'onHover', hovering)
        setShowMenu(hovering)
    }

    function onOpenSource(source: CaptureSource) {
        console.log('Source', 'onOpenPage', source)
        setShowMenu(false)
        plunder.captureSource = source
    }

    const inactive =
        (sources?.devices.length || 0) + (sources?.breakpoints?.length || 0) < 2

    return (
        <>
            <div className={styles.container}>
                <div
                    className={`${styles.element} ${inactive ? styles.inactive : ''}`}
                >
                    <SourceMenuToggle current={sources?.current || null} />
                </div>
                {!inactive && (
                    <SourceMenu
                        devices={sources?.devices || null}
                        breakpoints={sources?.breakpoints || null}
                        onHover={onHover}
                        onOpenSource={onOpenSource}
                        show={showMenu}
                    />
                )}
            </div>
        </>
    )
}

type SourceMenuToggleProps = {
    current: CaptureSource | null
}

const SourceMenuToggle: FC<SourceMenuToggleProps> = ({ current }) => {
    const inputRef = useRef<HTMLInputElement>(null)

    function onBlur() {
        inputRef.current!.checked = false
    }

    return (
        <>
            <label className={styles.toggle} htmlFor="source-menu-toggle">
                {!!current && current.type === 'device' && current.device.label}
                {!!current &&
                    current.type === 'css' &&
                    current.breakpoint.locations[0].code.excerpt}
                <input
                    id="source-menu-toggle"
                    ref={inputRef}
                    type="checkbox"
                    onBlur={onBlur}
                />
            </label>
        </>
    )
}

type SourceMenuProps = {
    breakpoints: Array<MediaQueryBreakpoint> | null
    devices: Array<DeviceDefinition> | null
    onHover: (hovering: boolean) => void
    onOpenSource: (source: CaptureSource) => void
    show: boolean
}

const SourceMenu: FC<SourceMenuProps> = ({
    breakpoints,
    devices,
    onHover,
    onOpenSource,
    show,
}) => {
    function onClick(e: MouseEvent<HTMLDivElement>) {
        const elem = e.target as HTMLElement
        console.log('SourceMenu', 'onClick', elem.dataset.type, elem.dataset.id)
        if (elem.dataset.type === 'device') {
            onOpenSource({
                type: 'device',
                device: devices!.find(d => d.label === elem.dataset.id)!,
            })
        } else {
            onOpenSource({
                type: 'css',
                breakpoint: breakpoints![parseInt(elem.dataset.id!, 10)]!,
            })
        }
    }

    return (
        <div
            className={`${styles.menu} ${show ? styles.show : ''}`}
            onMouseEnter={show ? undefined : () => onHover(true)}
            onMouseLeave={() => onHover(false)}
        >
            {!!devices?.length && (
                <>
                    <h3 className={styles.header}>Devices</h3>
                    {devices.map(device => (
                        <div
                            className={styles.source}
                            key={device.label}
                            onClick={onClick}
                            data-type="device"
                            data-id={device.label}
                        >
                            {device.label}
                        </div>
                    ))}
                </>
            )}
            {!!breakpoints?.length && (
                <>
                    <h3 className={styles.header}>CSS Breakpoints</h3>
                    {breakpoints.map((breakpoint, i) => (
                        <div
                            className={styles.source}
                            key={i}
                            onClick={onClick}
                            data-type="css"
                            data-id={i}
                        >
                            {breakpoint.locations[0].code.excerpt}
                        </div>
                    ))}
                </>
            )}
        </div>
    )
}
