# kehikot-module-protocol — notes for agents

The shapes a Kehikot host and its modules agree on. README.md says what is in
it, PACKAGING.md why `dist/` is committed (CI fails when it differs from what
the source builds), CHANGELOG.md what each version added.

## Releasing

A version is an annotated `vX.Y.Z` tag on `main`; consumers install the tag
(`#vX.Y.Z`). Nobody tags by hand.

1. In the PR: bump `version` in `package.json`, add the `## X.Y.Z — <date>`
   entry at the top of CHANGELOG.md (and the row in README.md's table),
   rebuild `dist/`.
2. Merge. On the push to `main`, `.github/workflows/ci.yml` runs its checks and
   then the `tag` job (`Jalez/kehikko-desktop/.github/actions/tag-on-merge`,
   with `changelog: CHANGELOG.md`): when the version is newer than every `v*`
   tag and the CHANGELOG has its entry, it creates `vX.Y.Z` on the pushed
   commit. Same version: nothing. Newer without the entry, or older: the run
   fails and says so.
3. Then pin consumers to the new tag in their own PRs (the host's
   `package.json`, modules as they need it).

Runs on `main` are never cancelled by a newer push (they may be tagging). The
tag ruleset "release tags are the owner's" lets GitHub Actions (Integration
15368) through for this; only the owner (admin) may push `v*` tags otherwise.
