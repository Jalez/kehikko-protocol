import { type DoorTool } from '../door.js';
import { type Manifest } from '../manifest.js';
/**
 * Another module, as this one can learn of it: where the registry says it answers, and what its
 * manifest says when asked there — its name, what it reacts to, and where its MCP door is. For a
 * module's SERVER; a page asks its own server. Reads the registry and one loopback address, and
 * writes nothing. Design notes: docs/asking.md.
 */
/** How long a neighbour gets to hand over its manifest, or its list of tools, in ms. */
export declare const NEIGHBOUR_TIMEOUT_MS = 1500;
export type Neighbour = {
    found: true;
    id: string;
    /** Where it answers, from the registry. */
    origin: string;
    /** Its manifest, parsed by this package's schema. */
    manifest: Manifest;
    /** Its MCP door as an absolute URL, or `null`: it declares none, or one that is not over HTTP on its own origin. */
    door: string | null;
} | {
    found: false;
    id: string;
    /** `unregistered`: no registration names it. `silent`: nothing answered there. `unreadable`: what answered is not its manifest. */
    why: 'unregistered' | 'silent' | 'unreadable';
    /** The same thing as a sentence a person can be shown. */
    sentence: string;
};
export interface NeighbourOptions {
    /** The registry to read. Defaults to the one a host sweeps. */
    registry?: string;
    timeoutMs?: number;
    /** Injected by the tests. */
    fetch?: typeof fetch;
}
/**
 * One registered module, by id: its registration read, and its manifest asked for where that says
 * it answers. Never throws. A manifest that names another id is `unreadable`: the registration is
 * a hint, and only an answer carrying this id is this module.
 */
export declare function readNeighbour(id: string, options?: NeighbourOptions): Promise<Neighbour>;
/** A manifest's MCP door as an absolute URL on `origin`, or `null` for none, for stdio, and for one that leaves the origin. Pure. */
export declare function doorOf(manifest: Pick<Manifest, 'mcp'>, origin: string): string | null;
/** Every registered module, each read as `readNeighbour` reads one, in id order. `except` leaves one out: the caller. */
export declare function readNeighbours(options?: NeighbourOptions & {
    except?: string;
}): Promise<Neighbour[]>;
/**
 * The tools a door lists (`tools/list`), each as `doorToolSchema` reads it, or `null` when the
 * door did not answer with a list. One JSON-RPC POST; nothing is called. Never throws.
 */
export declare function listTools(door: string, options?: NeighbourOptions): Promise<DoorTool[] | null>;
