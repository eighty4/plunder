import {
    type ChangeEvent,
    type FC,
    type KeyboardEvent,
    type MouseEvent,
    useEffect,
    useRef,
    useState,
} from 'react'
import { type PlunderCaptureApi } from '../Plunder.ts'
import styles from './Url.module.css'

export type UrlCommandProps = {
    plunder: PlunderCaptureApi
}

export const UrlCommand: FC<UrlCommandProps> = ({ plunder }) => {
    const [openPage, setOpenPage] = useState<string | null>(null)
    const [otherPages, setOtherPages] = useState<Array<string> | null>(null)
    const [showMenu, setShowMenu] = useState<boolean>(false)

    useEffect(() => {
        const subscription = plunder.urls.subscribe(urls => {
            setOpenPage(urls.openPage)
            setOtherPages(urls.otherPages)
        })
        return () => subscription.unsubscribe()
    }, [])

    function onHistoryHover(hovering: boolean) {
        console.log('Url', 'onHistoryHover', hovering)
        setShowMenu(hovering)
    }

    function onOpenPage(url: string) {
        console.log('Url', 'onOpenPage', url)
        setShowMenu(false)
        plunder.openPage = url
    }

    const inactive = !otherPages || otherPages.length === 0

    return (
        <>
            <div className={styles.container}>
                <div
                    className={`${styles.element} ${inactive ? styles.inactive : ''}`}
                >
                    {plunder.mode === 'active' && (
                        <UrlInput
                            currentUrl={openPage}
                            onOpenPage={onOpenPage}
                        />
                    )}
                    {plunder.mode === 'result' && openPage !== null && (
                        <UrlHistoryToggle currentUrl={openPage} />
                    )}
                </div>
                {otherPages !== null && otherPages?.length > 0 && (
                    <UrlHistory
                        onHistoryHover={onHistoryHover}
                        onOpenPage={onOpenPage}
                        show={showMenu}
                        urls={otherPages}
                    />
                )}
            </div>
        </>
    )
}

type UrlHistoryToggleProps = {
    currentUrl: string
}

const UrlHistoryToggle: FC<UrlHistoryToggleProps> = ({ currentUrl }) => {
    const inputRef = useRef<HTMLInputElement>(null)

    function onBlur() {
        inputRef.current!.checked = false
    }

    return (
        <>
            <label className={styles.toggle} htmlFor="url-menu-toggle">
                {currentUrl}
                <input
                    id="url-menu-toggle"
                    ref={inputRef}
                    type="checkbox"
                    onBlur={onBlur}
                />
            </label>
        </>
    )
}

type UrlInputProps = {
    currentUrl: string | null
    onOpenPage: (url: string) => void
}

export const UrlInput: FC<UrlInputProps> = ({ currentUrl, onOpenPage }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [inputValue, setInputValue] = useState<string>(currentUrl || '')
    const [isValid, setIsValid] = useState<boolean>(true)

    function onFocus() {
        if (inputValue?.length) {
            const protocolEndIndex = inputValue.indexOf('://')
            if (protocolEndIndex !== -1) {
                inputRef.current!.setSelectionRange(
                    protocolEndIndex + 3,
                    inputValue.length,
                )
            }
        } else {
            setInputValue('https://')
            //            inputRef.current!.setSelectionRange(8, 8)
        }
    }

    function onBlur() {
        if (currentUrl === null && inputRef.current!.value === 'https://') {
            setInputValue('')
        }
    }

    function onChange(e: ChangeEvent<HTMLInputElement>) {
        setInputValue(e.target.value)
        setIsValid(/https?:\/\/[a-z].*\.[a-z].*/.test(e.target.value))
    }

    function onKeyUp(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            onOpenPage(inputRef.current!.value)
        }
    }

    const classes = isValid ? `${styles.input} ${styles.valid}` : styles.input
    return (
        <input
            ref={inputRef}
            className={classes}
            onChange={onChange}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
            onBlur={onBlur}
            value={inputValue}
            placeholder="Type web address here"
        />
    )
}

type UrlHistoryProps = {
    onHistoryHover: (hovering: boolean) => void
    onOpenPage: (url: string) => void
    show: boolean
    urls: Array<string>
}

const UrlHistory: FC<UrlHistoryProps> = ({
    onHistoryHover,
    onOpenPage,
    show,
    urls,
}) => {
    if (!urls.length) {
        return
    }

    function onMouseEnter() {
        console.log('UrlHistory', 'onMouseEnter')
        if (!show) {
            onHistoryHover(true)
        }
    }

    function onMouseLeave() {
        console.log('UrlHistory', 'onMouseLeave')
        onHistoryHover(false)
    }

    function onClick(e: MouseEvent<HTMLDivElement>) {
        console.log('UrlHistory', 'onClick')
        onOpenPage((e.target as HTMLElement).dataset.url!)
    }

    return (
        <div
            className={`${styles.history} ${show ? styles.show : ''}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {urls.map(url => (
                <div
                    className={styles.url}
                    key={url}
                    onClick={onClick}
                    data-url={url}
                >
                    {url}
                </div>
            ))}
        </div>
    )
}
