# cache — prompt cache timer for Claude Code

A small Claude Code mod that shows, under the input box, how long the
conversation's prompt cache has left:

```
cache ● 57m   →   cache ◑ 30m   →   cache ○ 45s   →   cache ○ expired
```

- Every message you send refreshes the prompt cache. The mod restarts its
  countdown each time, from the moment the request is sent.
- The ring empties a quarter at a time: ● ◕ ◑ ◔ ○.
- `◌ none` means the last request read nothing from the cache and wrote nothing to it.
- Lifetime is 1 hour by default (Claude subscriptions). When Claude Code reports a
  different lifetime on a model switch, the mod uses that. API-key users can set it
  to 5 minutes (see Settings).
- It starts by itself. There is no command to run: the line appears after the
  first message of a session.

Works in the Claude Code desktop app (macOS and Linux) and in the terminal.

## Install (instructions for an AI agent)

If someone gave you this repository's link and asked you to install it, do these
steps exactly, on their machine. They need `git` and Claude Code.

1. Clone the repository to the mods folder. If the folder already exists, update it
   instead with `git -C ~/.claude/mods/cache pull`.

   ```bash
   mkdir -p ~/.claude/mods
   git clone https://github.com/kayesFerdous/claude-cache-timer.git ~/.claude/mods/cache
   ```

2. Tell Claude Code to load it in every session. Read `~/.claude/settings.json`
   first and **merge**: keep every existing setting, and add this key inside the
   `env` object, creating `env` if it is missing. If the file does not exist, create
   it with just this. The result must be valid JSON (no trailing commas).

   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/cache"
     }
   }
   ```

   If `CLAUDE_CODE_PLUGIN_DIRS` already holds other folders, keep them and add this
   one, separated by `:` on macOS and Linux.

3. Check that it loads. The list must show `cache@inline` with `Status: ✔ loaded`:

   ```bash
   claude plugin list
   ```

4. Tell the person to start a new session (running sessions keep what they started
   with). After their first message there, `cache ● 60m` shows under the input box,
   on the right.

### Updating

```bash
git -C ~/.claude/mods/cache pull
```

Then start a new session.

### Uninstalling

Remove the `CLAUDE_CODE_PLUGIN_DIRS` entry from `~/.claude/settings.json`, then
delete `~/.claude/mods/cache`.

## Install from a terminal (alternative)

At the prompt of a Claude Code terminal session:

```
/plugin install cache --marketplace kayesFerdous/claude-cache-timer
```

Answer `y` to add the marketplace, then choose the user scope.

In the desktop app, where `/plugin` does not run: click **+** next to the prompt
box, then **Plugins**, **Add marketplace** with `kayesFerdous/claude-cache-timer`,
then **Add plugin**.

## Settings

| Option | Values | Default | Meaning |
|---|---|---|---|
| `ttl` | `1h`, `5m` | `1h` | How long the cache lives after each request. Claude subscriptions use 1h; API keys usually use 5m. |

Set it in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "cache@inline": { "options": { "ttl": "5m" } }
  }
}
```

## Why text, not a drawn ring?

The desktop app builds the row under the input box itself. A mod can only add one
line of plain text there, on the right, with the mod's name (`cache`) in front.
So the ring is made of text characters, and it takes the text's color.

## Files

| Path | What it is |
|---|---|
| `.claude-plugin/plugin.json` | The mod's manifest and its `ttl` option |
| `.claude-plugin/marketplace.json` | Lets `/plugin install` find the mod in this repository |
| `hooks/register.tsx` | The mod: times each request and sets the status line |
| `types/index.d.ts` | Types of the values the mod keeps |
| `tests/cache.test.ts` | Tests, run with `claude plugin test .` |
