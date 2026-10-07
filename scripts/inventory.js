(() => {
  "use strict";

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (node) => (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
  const unique = (items, key) => [...new Map(items.map((item) => [key(item), item])).values()];
  const isConversationHref = (href) => /\/c\/[A-Za-z0-9_-]+/.test(href);
  const isProjectHref = (href) => /\/(?:g|projects?)\//.test(href) && !isConversationHref(href);

  if (!/chatgpt\.com$/.test(location.hostname)) {
    throw new Error("Open chatgpt.com before running this inventory.");
  }

  const conversationLinks = () => [...document.querySelectorAll("a[href*='/c/']")]
    .filter((link) => text(link));

  // The sidebar lazily fetches older conversations.  Its precise markup varies,
  // so find the scrollable ancestor that contains the most conversation links
  // instead of relying on a generated class name.
  const conversationScroller = () => {
    const scores = new Map();
    for (const link of conversationLinks()) {
      for (let node = link.parentElement; node && node !== document.body; node = node.parentElement) {
        if (node.scrollHeight <= node.clientHeight + 80) continue;
        const count = node.querySelectorAll("a[href*='/c/']").length;
        scores.set(node, Math.max(scores.get(node) || 0, count));
      }
    }
    return [...scores.entries()]
      .sort((a, b) => (b[1] - a[1]) || (b[0].clientHeight - a[0].clientHeight))[0]?.[0] || null;
  };

  const snapshot = () => {
    const links = [...document.querySelectorAll("a[href]")].map((a) => ({
      title: text(a),
      href: new URL(a.href, location.href).pathname,
    })).filter((item) => item.title);

    // Current ChatGPT sidebars render Project rows as buttons, not links.
    // Their action button has a stable, human-readable label in both the
    // Traditional-Chinese and English UIs, so derive the Project name from it.
    const projectButtons = [...document.querySelectorAll("button[aria-label]")]
      .map((button) => {
        const label = button.getAttribute("aria-label") || "";
        const title = label
          .replace(/\s*(?:的專案動作|project actions?)\s*$/i, "")
          .trim();
        return { title, href: null, source: "sidebar-action" };
      })
      .filter((item) => item.title && item.title !== (item.href || ""))
      .filter((item) => {
        // Only retain labels which actually describe a project action.
        return [...document.querySelectorAll("button[aria-label]")].some((button) => {
          const label = button.getAttribute("aria-label") || "";
          return /(?:的專案動作|project actions?)\s*$/i.test(label) &&
            label.replace(/\s*(?:的專案動作|project actions?)\s*$/i, "").trim() === item.title;
        });
      });

    return {
      conversations: unique(links.filter((item) => isConversationHref(item.href)), (item) => `${item.href}|${item.title}`),
      projects: unique([
        ...links.filter((item) => isProjectHref(item.href)),
        ...projectButtons,
      ], (item) => item.href ? `${item.href}|${item.title}` : item.title),
    };
  };

  const run = async () => {
    const before = snapshot();
    const maxSteps = 800;
    const quietStepsToFinish = 15;
    let quietSteps = 0;

    for (let step = 0; step < maxSteps && quietSteps < quietStepsToFinish; step += 1) {
      const pane = conversationScroller();
      const beforeCount = snapshot().conversations.length;
      const links = conversationLinks();
      const last = links.at(-1);

      // scrollIntoView is important: ChatGPT sometimes loads the next page
      // only after the final rendered conversation itself becomes visible.
      last?.scrollIntoView({ block: "end" });
      pane?.scrollBy({ top: Math.max(480, pane.clientHeight * 0.9), behavior: "instant" });
      await sleep(350);

      const afterCount = snapshot().conversations.length;
      const atBottom = !pane || pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2;
      quietSteps = afterCount > beforeCount || !atBottom ? 0 : quietSteps + 1;

      if ((step + 1) % 25 === 0) {
        console.info(`Inventory progress: ${afterCount} conversations loaded after ${step + 1} scroll steps.`);
      }
    }

    const after = snapshot();
    const inventory = {
      generatedAt: new Date().toISOString(),
      page: location.href,
      notes: [
        "Read-only snapshot from links currently exposed by the ChatGPT sidebar.",
        "Conversation-to-project membership is not reliably exposed by every ChatGPT UI version.",
        "Use exact titles; ask for review of ambiguous classifications before moving.",
      ],
      conversations: unique([...before.conversations, ...after.conversations], (item) => `${item.href}|${item.title}`),
      projects: unique([...before.projects, ...after.projects], (item) => item.href ? `${item.href}|${item.title}` : item.title),
    };

    const output = JSON.stringify(inventory, null, 2);
    console.log("ChatGPT inventory complete", inventory);
    console.log(output);
    try { await navigator.clipboard.writeText(output); console.info("Inventory JSON copied to clipboard."); }
    catch { console.warn("Clipboard copy was blocked; copy the JSON above manually."); }
    return inventory;
  };

  return run();
})();
