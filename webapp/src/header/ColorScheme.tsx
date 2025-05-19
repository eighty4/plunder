import { type FC } from 'react'
import asdf from './moon.svg'

export type ColorSchemeProps = {}

export const ColorScheme: FC<ColorSchemeProps> = () => {
    return (
        <>
            <img src={asdf} />
        </>
    )
}
