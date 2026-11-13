/**
 * `bun run check:door-config <module dir>…` (2.95.0): does an agent module's door config name only
 * the starting host's stable doors? From the files alone, which is enough for the mistake it
 * catches: a source that writes a door config for an agent (it mentions `mcpServers`,
 * `mcp_servers`, `--mcp-config` or an `opencode.json`-style `mcp` block beside a door URL) and also
 * spells a door at a raw loopback port (`http://127.0.0.1:${port}/mcp`). Such an entry dies with
 * the module's next port change, and a session cannot reconnect to it. The door goes at
 * `doorUrl(startingHost(), id, token)` (`kehikot-module-protocol/serve`). Node-only, writes nothing.
 * Design notes: docs/serving.md ("The starting host").
 */
export interface DoorConfigCheck {
    /** The directory checked. */
    dir: string;
    /** Whether any source writes an agent's door config. */
    writesConfig: boolean;
    /** Why it fails; empty is a pass. */
    failures: string[];
}
/** The check over a module's sources. Pure. */
export declare function checkDoorConfigSources(dir: string, sources: readonly {
    path: string;
    text: string;
}[]): DoorConfigCheck;
/** The check over a module directory on disk. */
export declare function checkDoorConfig(dir: string): DoorConfigCheck;
/** What a person reads. */
export declare function saidDoorConfig(check: DoorConfigCheck): string;
