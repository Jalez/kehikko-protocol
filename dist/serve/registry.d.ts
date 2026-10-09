/**
 * The one directory a host sweeps for registrations: `KEHIKOT_MODULES_DIR` (else
 * `ROADMAP_MODULES_DIR`) when set; `~/Library/Application Support/Kehikot/modules` on macOS;
 * `$XDG_DATA_HOME/kehikot/modules` (default `~/.local/share/kehikot/modules`) elsewhere.
 */
export declare function registryDir(env?: Record<string, string | undefined>): string;
/**
 * The registry before the rename, `~/.roadmap/modules` — READ, never written, so what a module
 * wrote there (`keep`, above all) is carried over. `null` when the registry was pointed somewhere
 * on purpose, so a test never reads a person's real one.
 */
export declare function legacyRegistryDir(env?: Record<string, string | undefined>): string | null;
/** What one registration says. The host reads `url`, `dir`, and a `keep` this never writes. */
export interface Registration {
    url: string;
    dir: string;
}
export interface Registered extends Registration {
    id: string;
    /** The file that now says so. Printed, because a person who wants this undone deletes it. */
    file: string;
    /** What the file said before, when it said something different. `null` when it agreed or was absent. */
    was: Registration | null;
}
/**
 * Say where this module answers: write `<id>.json` with `url` and `dir`, the directory a host runs
 * `run.sh` in. Throws when `id` is not a module id. Merged, not replaced: other keys (`keep`)
 * survive. Whoever starts last wins; `was` carries what the file said before, when it differed.
 */
export declare function registerAt({ id, origin, dir }: {
    id: string;
    origin: string;
    dir: string;
}): Registered;
/** One registration file, or `null` for anything that is not one. Never throws. */
export declare function readRegistration(file: string): Registration | null;
/**
 * The ports the OTHER registered modules have claimed. Read before drifting: a neighbour's stated
 * port is treated as occupied even when nothing is listening on it.
 */
export declare function neighbourPorts(selfId: string, where?: string): Set<number>;
/** The port in an origin, or `null` for anything this cannot read. Pure. */
export declare function portOf(origin: string): number | null;
//# sourceMappingURL=registry.d.ts.map