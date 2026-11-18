import { type BundleInfo } from './format.js';
/**
 * Start a bundle once and ask it what a host asks (2.102.0): `kehikot-bundle smoke`. The check that
 * fails a release whose bundle does not start, so a broken module is never published as one.
 *
 * It runs the bundle's own `run.sh` from a folder of its own, with nothing of the machine it runs
 * on: `HOME` and every `KEHIKOT_*` location are scratch folders, so the module registers itself in
 * a scratch registry and can reach no host, no project and no person's sessions.
 */
export interface SmokeOptions {
    /** An unpacked bundle, or… */
    dir?: string;
    /** …an archive, with its `.sha256` beside it (or `sha256`). */
    archive?: string;
    sha256?: string;
    /** How long it may take to answer its manifest. Default 30 s. */
    withinMs?: number;
    /** The Bun the bundle is started with, first on PATH. Default this process's when it is Bun. */
    bun?: string;
    log?: (line: string) => void;
}
export type Smoked = {
    ok: true;
    info: BundleInfo;
    manifestMs: number;
    page: boolean;
} | {
    ok: false;
    why: string;
    output?: string;
};
export declare function smokeBundle(options: SmokeOptions): Promise<Smoked>;
