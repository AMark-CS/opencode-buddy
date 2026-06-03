# Publishing to npm

This package is ready to publish but the build agent has no npm
credentials. The repo owner must run these steps locally.

## One-time: log in to npm

```bash
npm login
# enter username, password, email, OTP if 2FA is on
```

Verify:

```bash
npm whoami
```

If you don't have an account yet, sign up at <https://www.npmjs.com/signup>.

## Check the name is available

```bash
npm view opencode-buddy
```

If it's taken, rename the package in `package.json` (`"name": "..."`) and
re-tag the git release. Try `opencode-buddy-cli`, `@yourname/opencode-buddy`,
etc. (Scoped packages need `--access public` on publish.)

## Dry run

```bash
cd ~/code/opencode-buddy
npm pack --dry-run
```

This lists every file that will go into the tarball. Confirm only:
- `bin/`
- `src/`
- `README.md`
- `LICENSE`
- `package.json`

are included. (`.gitignore` should be — and the `files` field in
`package.json` already restricts the rest.)

## Publish

```bash
npm publish
```

For a scoped package:

```bash
npm publish --access public
```

You should see output like:

```
+ opencode-buddy@0.2.0
```

## Tag the release in git

```bash
git tag -a v0.2.0 -m "v0.2.0: opencode plugin + /buddy slash command"
git push origin v0.2.0
```

Then create a GitHub release at
<https://github.com/AMark-CS/opencode-buddy/releases/new> pointing at
the tag, with the changelog below.

## Changelog for v0.2.0

### Added
- **opencode plugin entry** (`src/plugin.js`): registers a `buddy` tool
  the LLM can call with `status | feed | play | rest | switch | rename |
  hatch | ascii | path | help` actions
- **`/buddy` slash command**: new `install` subcommand writes
  `~/.config/opencode/commands/buddy.md` so `/buddy` and
  `/buddy feed` etc. work directly inside opencode's TUI
- **install / uninstall subcommands**: one-shot wiring of the
  command file + `opencode.json` `plugin` list
- **event hooks**: plugin auto-celebrates on `session.idle` and
  auto-scares on `session.error`, syncing the buddy's mood with
  what the user is actually doing
- **13 plugin smoke tests** in `test/plugin.smoke.js`
- **2 new deps (dev only)**: `@opencode-ai/plugin` (peer) + transitive

### Changed
- `package.json` now standard npm structure: `main` → plugin entry,
  `bin` → CLI, `peerDependencies` → `@opencode-ai/plugin`
- README updated with three install paths: npm / git / manual
- Bumped version `0.1.0 → 0.2.0`

### Unchanged
- tmux sidecar runtime, all 6 species, state machine, persistence
- All 12 prior unit tests + 11 e2e tests still pass

## After publishing: test it end-to-end

```bash
# In a fresh directory, install fresh from the registry
mkdir /tmp/buddy-test && cd /tmp/buddy-test
npm install opencode-buddy
npx opencode-buddy install
# restart opencode, then in TUI try:
#   /buddy
#   /buddy feed
#   /buddy switch dragon
#   /buddy ascii
```

## Future versions

Bump with:

```bash
npm version patch   # 0.2.0 -> 0.2.1
npm version minor   # 0.2.0 -> 0.3.0
npm version major   # 0.2.0 -> 1.0.0
npm publish
git push --follow-tags
```

`npm version` also creates the git tag automatically. To push it:

```bash
git push --follow-tags
```

## Unpublishing (within 72 hours of release)

```bash
npm unpublish opencode-buddy@0.2.0
```

After 72 hours you can only unpublish with `--force` and only if no
other packages depend on this version. Safer alternative: publish
`0.2.1` with a deprecation notice.
