# ChatGPT Project Organizer

Small, dependency-free browser-console tools for organizing ChatGPT conversations into Projects.

The intended workflow is deliberately two-phase:

1. **Inventory** your current sidebar without changing anything.
2. Share the resulting JSON with an assistant (or review it yourself) and agree on a move plan.
3. Run the mover in **dry-run** mode first.
4. Change one flag to execute the approved moves.

This keeps classification separate from account changes and makes the final move list easy to review.

## What this repository contains

| File | Purpose | Changes your ChatGPT data? |
| --- | --- | --- |
| `scripts/inventory.js` | Scrolls the ChatGPT sidebar and exports the conversations and project-like links currently available in the UI. | No |
| `scripts/move-conversations.js` | Applies an explicit list of `conversation → project` moves through the ChatGPT UI. | Only when `DRY_RUN` is set to `false` |
| `moves.example.js` | A small, editable move-plan template. | No, by itself |

## Requirements

- A desktop browser logged in at [chatgpt.com](https://chatgpt.com).
- ChatGPT's left sidebar visible and expanded.
- Browser DevTools Console open.

No API key, extension, package installation, or account credential is needed. The scripts only act through the same visible UI you would use manually.

## 1. Make an inventory (read-only)

1. Open `https://chatgpt.com` and expand the left sidebar.
2. Open DevTools → **Console**.
3. Copy the complete contents of [`scripts/inventory.js`](scripts/inventory.js) and paste it into the Console.
4. Wait for `ChatGPT inventory complete`.
5. Copy the JSON printed in the Console (the script also tries to copy it to your clipboard).

The inventory only reports what ChatGPT has made available in the sidebar during its scan. If your account has many conversations, run it again after opening any collapsed sections or searching/scrolling to the relevant area.

### Ask an assistant to classify it

Send an assistant:

> Here is the inventory JSON from this repository. Suggest a `conversation → project` plan. Do not move anything yet. Mark uncertain matches.

Include the JSON output. The assistant can return a ready-to-paste `MOVES` list for `moves.example.js`.

## 2. Review the move plan

Copy `moves.example.js` into the Console (or save an edited copy locally). Replace the sample list:

```js
const MOVES = [
  { conversation: "拔豆芽菜方法", project: "育兒" },
  { conversation: "Java JRE 跑 APE", project: "APEBind" },
];
```

Use **exact, visible conversation and Project names**. If names are duplicated, rename one first or move it manually; the mover will refuse an ambiguous match.

## 3. Dry run, then execute

The mover starts with:

```js
const DRY_RUN = true;
```

Run it once with that setting. It checks whether each conversation and project can be found and prints the proposed actions, but does not click a move command.

When the report is correct, change only that line to:

```js
const DRY_RUN = false;
```

Run it again. It moves one conversation at a time, logs every outcome, and pauses briefly so the UI can update. Already-correct items are reported as skipped when the UI exposes their current project; otherwise the script asks for review rather than guessing.

## Assistant-assisted workflow

You can put this repository under any GitHub account and give an assistant the repository URL. The assistant can read the README and help interpret the inventory and write a reviewed move plan.

An assistant cannot silently execute JavaScript inside your browser's DevTools Console. For the console approach, you paste the script into the browser session that is logged into your account. If you instead grant an assistant control of an already logged-in browser, it can carry out the same reviewed plan through the UI, one move at a time.

## Safety notes

- Treat `DRY_RUN = false` as the point at which account data changes.
- Review the `MOVES` array before every live run.
- The scripts do not delete conversations or Projects.
- ChatGPT's UI can change. If a menu label or selector is not found, the mover stops that item and reports it; it does not fall back to broad clicking.
- Keep DevTools open until the run reports a final summary.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| A conversation is not found | Make it visible in the sidebar, then rerun. |
| A Project is not found | Expand the Projects section and make the Project visible, then rerun. |
| The browser blocks pasted code | Type `allow pasting` in the Console once, then paste again. This is a browser safety prompt, not a command from this repository. |
| A UI label changed | Keep `DRY_RUN = true`, copy the console report, and update the selectors/labels in a new revision. |

## License

MIT. See [LICENSE](LICENSE).
