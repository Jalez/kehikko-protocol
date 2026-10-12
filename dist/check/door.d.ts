import { type DoorTool } from '../door.js';
import { type Manifest } from '../manifest.js';
import { type NeighbourOptions } from '../serve/neighbours.js';
/**
 * `bun run check:door <module dir>…`: does a module's MCP door say what a caller needs to know
 * before it runs a tool unasked? Two depths. From the files alone: the manifest's `mcp.subjects`
 * parses, and the sources mention the annotations at all (a hint, like `check:parts`' import
 * scan). With `--running`, an explicit opt-in that asks the running door for its tools: every
 * declared tool exists, the ones that point and answer are read-only and say the shared answer,
 * and every tool that states nothing is named. Node-only, and it writes nothing.
 * Design notes: docs/asking.md.
 */
export interface DoorCheck {
    /** The module's id, or the directory when no manifest was read. */
    module: string;
    /** `none` (no `mcp` in the manifest), `files` (read from the sources only) or `running` (the door was asked). */
    read: 'none' | 'files' | 'running';
    /** Why the module fails. Empty is a pass. */
    failures: string[];
    /** What a person might want to look at. Never a failure. */
    notes: string[];
}
type Declared = Pick<Manifest, 'id' | 'mcp'>;
/** The check over the files alone. Pure. Fails nothing: text can only hint at what a door lists. */
export declare function checkDoorSources(manifest: Declared, sources: readonly {
    path: string;
    text: string;
}[]): DoorCheck;
/** The check over what a running door lists. Pure. */
export declare function checkDoor(manifest: Declared, tools: readonly DoorTool[]): DoorCheck;
/** One module directory, read and checked; with `running`, its started door is asked as well. */
export declare function checkModuleDoor(dir: string, options?: {
    running?: boolean;
} & NeighbourOptions): Promise<DoorCheck>;
/** What the command prints for one module. */
export declare function saidDoor(check: DoorCheck): string;
export {};
