import type { CaptureScreenshotManifest } from '@eighty4/plunder-core'
import { useEffect, useState } from 'react'

function App() {
    const [urls, setUrls] = useState<Array<string>>()
    const [currentWebpage, setCurrentWebpage] =
        useState<CaptureScreenshotManifest>()

    useEffect(() => {
        const urls = window.plunder.webpages.map(wp => wp.url)
        setUrls(urls)
        setCurrentWebpage(window.plunder.webpages[0])
    }, [])

    function onUrlChange(url: string) {
        setCurrentWebpage(
            window.plunder.webpages.find(webpage => webpage.url === url),
        )
    }

    return (
        <>
            <div>
                <h1>Plunder</h1>
                <div>
                    <select
                        value={currentWebpage?.url}
                        onChange={e => onUrlChange(e.target.value)}
                    >
                        {!!urls?.length &&
                            urls.map(url => <option key={url}>{url}</option>)}
                    </select>
                </div>
                {!!currentWebpage &&
                    Object.entries(currentWebpage.screenshots).map(
                        ([filename, details]) => {
                            const imgSrc = `./${currentWebpage.dir}/${filename}`
                            const caption = `${details.viewport?.height || '?'}h x ${details.viewport?.width || '?'}w`
                            return (
                                <div key={filename}>
                                    <h3>{filename}</h3>
                                    <figure>
                                        <figcaption>{caption}</figcaption>
                                        <img src={imgSrc} alt={filename} />
                                    </figure>
                                </div>
                            )
                        },
                    )}
            </div>
        </>
    )
}

export default App
