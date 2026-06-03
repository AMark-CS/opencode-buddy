# Pushing to GitHub

This repo was committed locally but the GitHub remote needs to be created
and pushed manually because the build agent has no GitHub credentials.

## One-time setup

```bash
cd ~/code/opencode-buddy

# Option A: create via GitHub CLI (recommended, you stay signed in)
gh repo create opencode-buddy \
  --public \
  --description "A virtual ASCII pet that lives in a tmux side pane while you code with opencode." \
  --source=. \
  --remote=origin \
  --push

# Option B: create via web UI, then add the remote
#   1. Go to https://github.com/new, name it "opencode-buddy", hit Create
#   2. Then:
git remote add origin git@github.com:<your-username>/opencode-buddy.git
git push -u origin main
```

## Verify

```bash
git remote -v
# should show origin pointing at your repo

# Optional: tag v0.1.0 and push the tag
git tag v0.1.0
git push origin v0.1.0
```

## After push

Add a topic tag `opencode`, `tmux`, `tamagotchi`, `ascii-pet` on the GitHub
repo page so it's discoverable. Then consider:

- Submitting to the [opencode ecosystem](https://opencode.ai/docs/ecosystem) page
- Posting on the opencode Discord `#showcase` channel
- Tweeting / posting on Hacker News with a screenshot

## Optional: publish to npm

If you want `npm install -g opencode-buddy` to work:

```bash
npm login
npm publish
```

(You may need to update the package name in `package.json` if `opencode-buddy`
is taken on npm. Check with `npm view opencode-buddy`.)
