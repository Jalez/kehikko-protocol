/**
 * `bun run check:addresses <module dir>…` (2.106.0): does a module's page ask its own server in a way
 * that survives the framing? A relative address (`./api/health`) resolves against the path the host
 * frames the page at: at `/app` it reaches the module, at `/app/` or `/app/?…` it becomes
 * `/app/api/health`, which is nothing, and the page shows no data and says nothing. `ask`, `follow`
 * and `subscribe` (`kehikot-module-protocol/client`) resolve a module-relative address against the
 * module's origin root (`rooted`), so they are safe. The raw browser calls are not: `fetch`,
 * `new EventSource` and `XMLHttpRequest#open` with a relative literal. From the files alone, a
 * module's own sources (not its tests) fail on one. Node-only, writes nothing. Docs: docs/events.md.
 */
export interface AddressesCheck {
    /** The module directory. */
    module: string;
    /** Why the module fails. Empty is a pass. */
    failures: string[];
}
/** The checks on what was read. Pure. */
export declare function checkAddressesSources(module: string, sources: readonly {
    path: string;
    text: string;
}[]): AddressesCheck;
/** One module directory, read and checked. */
export declare function checkModuleAddresses(dir: string): AddressesCheck;
/** What a person is told. */
export declare function saidAddresses(check: AddressesCheck): string;
