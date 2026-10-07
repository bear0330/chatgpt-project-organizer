// Requires MOVES (array) and DRY_RUN (boolean) to be declared first.
// See ../moves.example.js and README.md.

(() => {
  "use strict";
  if (!Array.isArray(MOVES)) throw new Error("Declare MOVES before pasting this script.");
  if (typeof DRY_RUN !== "boolean") throw new Error("Declare DRY_RUN as true or false before pasting this script.");
  if (!/chatgpt\.com$/.test(location.hostname)) throw new Error("Open chatgpt.com before running the mover.");

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const normalise = (value) => (value || "").replace(/\s+/g, " ").trim();
  const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const exact = (elements, name) => elements.filter((el) => visible(el) && normalise(el.innerText || el.textContent) === name);
  const click = async (el, label) => {
    if (!el) throw new Error(`Could not find ${label}.`);
    el.click();
    await sleep(500);
  };

  const findConversation = (name) => {
    const candidates = exact([...document.querySelectorAll("a[href*='/c/']")], name);
    if (candidates.length !== 1) throw new Error(candidates.length ? `Ambiguous conversation title: ${name}` : `Conversation not visible: ${name}`);
    return candidates[0];
  };

  const findProjectChoice = (name) => {
    const candidates = exact([...document.querySelectorAll("[role='menuitem'], [role='option'], button, a")], name);
    if (candidates.length !== 1) throw new Error(candidates.length ? `Ambiguous Project choice: ${name}` : `Project choice not visible: ${name}`);
    return candidates[0];
  };

  const moreButtonFor = (conversation) => {
    const row = conversation.closest("li, [role='listitem'], div") || conversation.parentElement;
    const candidates = [...row.querySelectorAll("button")].filter(visible);
    return candidates.find((button) => /more|options|menu/i.test(button.getAttribute("aria-label") || "")) || candidates.at(-1);
  };

  const run = async () => {
    const report = [];
    for (const move of MOVES) {
      const entry = { ...move, status: "pending" };
      report.push(entry);
      try {
        if (!move?.conversation || !move?.project) throw new Error("Each move needs conversation and project strings.");
        const conversation = findConversation(move.conversation);
        if (DRY_RUN) {
          findProjectChoice(move.project); // verifies that it is currently exposed somewhere in the UI
          entry.status = "would move";
          console.info("DRY RUN", entry);
          continue;
        }

        await click(moreButtonFor(conversation), `the action menu for “${move.conversation}”`);
        const moveCommand = exact([...document.querySelectorAll("[role='menuitem'], button")], "Move to project")[0]
          || [...document.querySelectorAll("[role='menuitem'], button")].find((el) => /move to project/i.test(normalise(el.innerText || el.textContent)));
        await click(moveCommand, "the “Move to project” command");
        await click(findProjectChoice(move.project), `Project “${move.project}”`);
        entry.status = "moved";
        await sleep(700);
      } catch (error) {
        entry.status = "needs review";
        entry.error = error.message;
        console.warn("Skipped", entry);
      }
    }
    console.table(report);
    console.info(`ChatGPT move run complete (${DRY_RUN ? "dry run" : "live run"}).`, report);
    return report;
  };

  return run();
})();
