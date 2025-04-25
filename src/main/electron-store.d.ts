/* eslint-disable prettier/prettier */
declare module 'electron-store' {
  interface Store<T extends Record<string, unknown>> {
    get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K]
    get<K extends string>(key: K, defaultValue?: unknown): unknown
    get(key: string, defaultValue?: unknown): unknown
    set<K extends keyof T>(key: K, value: T[K]): void
    set(key: string, value: unknown): void
  }
}
export {}
