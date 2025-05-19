import { type FC, useEffect, useState } from 'react'
import {
    type OpenPageState,
    type PageImage,
    type PlunderCaptureApi,
} from '../Plunder.ts'
import styles from './View.module.css'

export type ViewProps = {
    plunder: PlunderCaptureApi
}

export const View: FC<ViewProps> = ({ plunder }) => {
    const [openPage, setOpenPage] = useState<OpenPageState | null>(null)

    useEffect(() => {
        const subscription = plunder.openPage.subscribe(setOpenPage)
        return () => subscription.unsubscribe()
    }, [])

    if (!openPage) {
        return
    }

    return (
        <div className={`${styles.container} ${styles[openPage.type]}`}>
            <OpenPageView openPage={openPage} />
        </div>
    )
}

type OpenPageViewProps = {
    openPage: OpenPageState
}

const OpenPageView: FC<OpenPageViewProps> = ({ openPage }) => {
    switch (openPage.type) {
        case 'single':
            return <PageImageView img={openPage.img} />
        case 'diff':
            return (
                <>
                    <PageImageView img={openPage.imgA} />
                    <PageImageView img={openPage.imgB} />
                </>
            )
    }
}

type PageImageViewProps = {
    img: PageImage
}

const PageImageView: FC<PageImageViewProps> = ({ img }) => {
    return <img className={styles.img} src={img.src} alt={img.alt} />
}
