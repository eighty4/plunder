import nopt from 'nopt'

// todo types FlagTypeMap and TypeInfo in @types/nopt need to use OptType
declare module 'nopt' {
    type OptType = Array<Object | null> | Object | null
    let invalidHandler: (
        key: string,
        value: string,
        type: OptType,
        data: Record<string, OptType>,
    ) => void
    let unknownHandler: (key: string, next: string) => void
    let abbrevHandler: (short: string, long: string) => void
}
