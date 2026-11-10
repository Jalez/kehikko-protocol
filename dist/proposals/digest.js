import { decisionNews } from './core.js';
/**
 * The follow-up digest (2.75.0): an agent that proposed changes to a text hears what became of them
 * ONCE, when the person has finished answering them, instead of one message per decision. When the
 * last open proposal from one filer at one text is settled, and nothing more is decided for a quiet
 * while (`DIGEST_QUIET_MS`), the filer is sent one summary (`digestNews`):
 *
 *     Your 5 proposed changes to main.tex were answered: 3 accepted (1 with edits), 2 declined: "too long"; "off topic".
 *
 * Pure words plus a small scheduler (`proposalDigester`) a module wires to `ProposalSite.onSettled`
 * and sends with `messages.notify` (or however it reaches the filer's session). Design notes:
 * docs/proposals.md.
 */
/** How long after the last decision the digest waits for more, in ms: a burst of reviewing is one message. */
export const DIGEST_QUIET_MS = 30_000;
/** How many decline reasons a digest quotes; more are counted. */
export const DIGEST_REASONS_MOST = 5;
/** How much of one reason a digest quotes. */
const REASON_SHOWN = 120;
/** One filer: its session when known, else its kind and name. The same filer at the same text is one digest. */
export const filerKey = (by) => (by.session ? `session:${by.session}` : `${by.kind}:${by.name}`);
const oneLine = (text, most) => {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > most ? `${flat.slice(0, most - 1).trimEnd()}…` : flat;
};
/**
 * The one summary for a filer's settled proposals at one text, or `''` when none was answered by the
 * person (withdrawn ones are the filer's own act and are not reported back). `file` is the text's name
 * as the module says it (`shortPath` from the protocol keeps a long one short).
 */
export function digestNews(settled, file) {
    const answered = settled.filter((one) => one.status === 'accepted' || one.status === 'declined');
    if (!answered.length)
        return '';
    const accepted = answered.filter((one) => one.status === 'accepted');
    const declined = answered.filter((one) => one.status === 'declined');
    const edited = accepted.filter((one) => one.acceptedAs === 'edited').length;
    const partial = accepted.filter((one) => one.acceptedAs === 'partial').length;
    const n = answered.length;
    const head = n === 1 ? `Your proposed change to ${file} was answered:` : `Your ${n} proposed changes to ${file} were answered:`;
    const parts = [];
    if (accepted.length) {
        const how = [edited ? `${edited} with edits` : '', partial ? `${partial} in part` : ''].filter(Boolean).join(', ');
        parts.push(`${accepted.length} accepted${how ? ` (${how})` : ''}`);
    }
    if (declined.length) {
        const reasons = declined.map((one) => one.declinedReason?.trim()).filter((one) => Boolean(one));
        const quoted = reasons.slice(0, DIGEST_REASONS_MOST).map((one) => JSON.stringify(oneLine(one, REASON_SHOWN)));
        const more = reasons.length > DIGEST_REASONS_MOST ? `; and ${reasons.length - DIGEST_REASONS_MOST} more reasons` : '';
        const without = declined.length - reasons.length;
        const said = quoted.length ? `: ${quoted.join('; ')}${more}${without ? `; ${without} without a reason` : ''}` : ' without a reason';
        parts.push(`${declined.length} declined${said}`);
    }
    const tail = declined.length ? ' list_proposals shows each one.' : '';
    return `${head} ${parts.join(', ')}.${tail}`;
}
/**
 * The scheduler: collects each filer's settled proposals per text, and when the filer has nothing open
 * there any more and `quietMs` passed since the last decision, sends ONE digest (`digestNews`). A new
 * decision in the meantime starts the quiet again; a new proposal filed meanwhile holds the digest until
 * that one is settled too. Proposals by the person themselves are never reported back.
 *
 *     const digester = proposalDigester({
 *       open: (project, file) => openProposals(site, project, file),
 *       send: ({ by, text }) => notifyFiler(by.session, text), // messages.notify with the filer's token
 *     })
 *     const site: ProposalSite = { ..., onSettled: (project, proposal) => digester.settled(project, proposal) }
 */
export function proposalDigester(options) {
    const { send, open, quietMs = DIGEST_QUIET_MS, each = false, setTimer = setTimeout, clearTimer = (t) => clearTimeout(t) } = options;
    const waiting = new Map();
    const keyOf = (project, file, by) => JSON.stringify([project, file, filerKey(by)]);
    const stillOpen = (project, file, by) => open(project, file).some((one) => filerKey(one.by) === filerKey(by));
    async function release(key, force = false) {
        const one = waiting.get(key);
        if (!one)
            return;
        one.timer = null;
        if (!force && stillOpen(one.project, one.file, one.by))
            return;
        waiting.delete(key);
        const text = digestNews(one.proposals, one.file);
        if (!text)
            return;
        try {
            await send({ project: one.project, file: one.file, by: one.by, proposals: one.proposals, text });
        }
        catch {
            /* The module's own sending failed; nothing to retry here. */
        }
    }
    return {
        settled(project, proposal) {
            if (proposal.by.kind === 'person')
                return;
            if (proposal.status !== 'accepted' && proposal.status !== 'declined' && proposal.status !== 'withdrawn')
                return;
            if (each && proposal.status !== 'withdrawn') {
                void Promise.resolve()
                    .then(() => send({ project, file: proposal.file, by: proposal.by, proposals: [proposal], text: decisionNews(proposal) }))
                    .catch(() => { });
            }
            const key = keyOf(project, proposal.file, proposal.by);
            let one = waiting.get(key);
            if (!one)
                waiting.set(key, (one = { project, file: proposal.file, by: proposal.by, proposals: [], timer: null }));
            one.proposals = [...one.proposals.filter((p) => p.id !== proposal.id), proposal];
            if (one.timer)
                clearTimer(one.timer);
            one.timer = null;
            /* Something of the filer's still open here: the digest waits for that one's decision. */
            if (stillOpen(project, proposal.file, proposal.by))
                return;
            one.timer = setTimer(() => void release(key), quietMs);
        },
        async flush() {
            for (const [key, one] of [...waiting]) {
                if (one.timer)
                    clearTimer(one.timer);
                if (!stillOpen(one.project, one.file, one.by))
                    await release(key, true);
            }
        },
        waiting: () => waiting.size,
        stop() {
            for (const one of waiting.values())
                if (one.timer)
                    clearTimer(one.timer);
            waiting.clear();
        },
    };
}
