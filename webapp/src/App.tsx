import { type FC, useEffect, useMemo, useState } from 'react'
import { type PlunderCaptureApi, type WebSocketConnection } from './Plunder.ts'
import { PlunderActiveApi } from './PlunderActive.ts'
import { PlunderResultApi } from './PlunderResult.ts'
import { Header } from './header/Header.tsx'
import { View } from './view/View.tsx'
import styles from './App.module.css'

function createPlunderApi(): PlunderCaptureApi {
    switch (window.plunder?.mode) {
        case 'active':
            return new PlunderActiveApi(window.plunder.port)
        case 'result':
            return new PlunderResultApi(window.plunder.webpages || [])
        default:
            throw new Error()
    }
}

export const App: FC = () => {
    const plunder = useMemo(() => createPlunderApi(), [])
    const [conn, setConn] = useState<WebSocketConnection>()

    useEffect(() => {
        const subscription = plunder.webSocket.subscribe(setConn)
        return () => subscription.unsubscribe()
    }, [])

    let content

    if (conn === 'connecting') {
        content = (
            <div className={styles['user-msg']}>
                <span className={styles.progress}>Connecting</span>
            </div>
        )
    } else if (conn === 'error') {
        content = (
            <div className={styles['user-msg']}>
                <span className={styles.error}>Connecting</span>
            </div>
        )
    } else {
        content = <View plunder={plunder} />
    }

    return (
        <>
            <Header plunder={plunder} />
            {content}
        </>
    )
}
