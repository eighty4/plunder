import { fileURLToPath } from 'node:url'

export function resolveDependency(dep: 'playwright' | 'playwright-core') {
    const pwcFileUrl = import.meta.resolve(dep)
    if (!/^file:\/\//.test(pwcFileUrl)) {
        throw new Error(
            `unable to resolve fs path to \`${dep}\` npm dependency`,
        )
    }
    return fileURLToPath(pwcFileUrl)
}
