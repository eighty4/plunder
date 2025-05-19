import { type FC } from 'react'
import { type PlunderCaptureApi } from '../Plunder.ts'
// import { ColorScheme } from './ColorScheme.tsx'
import { SourceCommand } from './Source.tsx'
import { UrlCommand } from './Url.tsx'
import styles from './Header.module.css'

export type HeaderProps = {
    plunder: PlunderCaptureApi
}

export const Header: FC<HeaderProps> = ({ plunder }) => {
    return (
        <header id={styles.header}>
            <div id={styles.logo}>P</div>
            <UrlCommand plunder={plunder} />
            <div id={styles.controls}>
                <SourceCommand plunder={plunder} />
                {/* <ColorScheme /> */}
            </div>
        </header>
    )
}
