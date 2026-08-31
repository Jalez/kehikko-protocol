/**
 * The one directory a host sweeps, and the one shape it finds there.
 *
 * ## Why this is written here rather than copied a fourteenth time
 *
 * Every module in this workspace ships a `register.ts` that spells this
 * directory out by hand, under a comment saying the line "must say exactly what
 * a host's own registry sweep says". Fourteen copies of a sentence that has to
 * be identical is not a convention, it is a countdown — and the failure it
 * produces is the worst one a module can have, because a registration written to
 * the wrong directory means the host finds nothing and finds it SILENTLY. No
 * error, no empty container, no address to go looking at. The module simply does
 * not exist.
 *
 * So the path is spelled once, in the package both halves already import.
 *
 * ## `ROADMAP_MODULES_DIR` is honoured, and that is not a convenience
 *
 * It is how any of this can be tested. A test that wrote into a person's real
 * `~/.roadmap/modules` would be a test that ADOPTS a module onto their canvas,
 * and the only way to notice is a container appearing in an app the test never
 * opened. The host reads the same variable, so a whole second registry is a
 * directory and an environment variable away.
 */
export declare function registryDir(): string;
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
 * Say where this module answers.
 *
 * The filename carries the id — `roadmap.history.json`, not a field inside the
 * document — because that is what makes the id unforgeable. A host takes the id
 * from the NAME, so two files claiming one module cannot both exist: the
 * filesystem already refuses that, and a uniqueness rule enforced by the
 * filesystem is one nobody has to re-implement. See `server/registrations.ts` in
 * the host, whose essay this restates deliberately rather than links to.
 *
 * `dir` is here for the reason every module's `register.ts` gives: the url is
 * where to TALK to this program and the directory is where to START it, and the
 * moment a host needs the second is exactly the moment there is no manifest to
 * read the first from. It has to be a directory rather than a command line — a
 * string a host handed to a shell would make this file a place to write shell —
 * and what the host runs inside it is `run.sh`, no arguments.
 *
 * ## The honest part: this is now written on every start
 *
 * Every module's `register.ts` opens with an argument this has to answer rather
 * than delete: registration writes into somebody's home directory and says
 * "frame this", which is a decision a person makes once, and a start script that
 * did it quietly would be making that decision on their behalf.
 *
 * That argument is about ADOPTION and it still stands whole. `bun run register`
 * is still the act that puts a module on somebody's canvas, still a separate
 * program, and nothing here is meant to be the first thing that ever writes a
 * module's file — the plugin that calls this is one a person added to their own
 * `vite.config.ts`, in their own checkout, which is the same deliberate act
 * wearing different clothes.
 *
 * What is genuinely different is RE-STATING a url for a module already in the
 * registry. The person decided to be framed; they did not decide to be framed at
 * port 7960 in particular, and after a drift the number in that file is simply
 * wrong. Leaving it wrong out of respect for the earlier decision respects
 * nothing: the host sweeps the stale address, finds nothing there, and reports
 * the module as not running while it is running one port over — with a Start
 * button that will spawn a second copy. The decision a person made was "frame
 * this program". Keeping that decision TRUE is what this write is for.
 *
 * ## Two checkouts, and who wins
 *
 * If one id is registered from two directories, whoever started last wins — both
 * `url` and `dir`. That is an answer rather than a shrug: the host frames ONE
 * program per id, and the one worth framing is the one actually running now.
 * Refusing to overwrite a differing `dir` would leave the registry naming a
 * checkout nobody has started, and hand the Start button a directory that is not
 * where the running server is.
 *
 * It is still a surprise, so it is never silent: `was` carries whatever the file
 * said before, and the caller prints it whenever it differs.
 */
export declare function registerAt({ id, origin, dir }: {
    id: string;
    origin: string;
    dir: string;
}): Registered;
/** One registration file, or `null` for anything that is not one. Never throws. */
export declare function readRegistration(file: string): Registration | null;
/**
 * The ports the OTHER registered modules have claimed.
 *
 * Read before drifting, and the reason is a failure that would otherwise arrive
 * a week later with nothing connecting it to its cause. The modules on this
 * machine sit ten apart — 7820 through 7960 — and a module drifting upward from
 * 7940 walks straight into 7950 if 7950 happens to be free at that second. It IS
 * free: its owner is not running, which is the normal state of most modules most
 * of the time. The drifter takes it and registers there. The next person to
 * press Start on the module that owns 7950 gets a port collision they did not
 * cause, in a module they did not change, and the program holding their port is
 * one whose registration says it lives somewhere else entirely.
 *
 * So a neighbour's stated port is treated as occupied even when nothing is
 * listening on it. A registration is a claim, and this is the one place in the
 * system where reading somebody's claim is cheaper than discovering it.
 */
export declare function neighbourPorts(selfId: string, where?: string): Set<number>;
/** The port in an origin, or `null` for anything this cannot read. Pure. */
export declare function portOf(origin: string): number | null;
//# sourceMappingURL=registry.d.ts.map