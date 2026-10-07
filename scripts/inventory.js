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

  const scrollables = () => [...document.querySelectorAll("aside, nav, [role='navigation'], [data-sidebar] *")]
    .filter((el) => el.scrollHeight > el.clientHeight + 80)
    .sort((a, b) => b.clientHeight - a.clientHeight);

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
    const panes = scrollables();
    const seen = new Set();

    for (const pane of panes) {
      let unchanged = 0;
      for (let step = 0; step < 80 && unchanged < 4; step += 1) {
        const marker = `${pane.scrollTop}:${pane.scrollHeight}`;
        if (seen.has(`${step}:${marker}`)) break;
        seen.add(`${step}:${marker}`);
        const previousHeight = pane.scrollHeight;
        const previousTop = pane.scrollTop;
        pane.scrollBy({ top: Math.max(360, pane.clientHeight * 0.85), behavior: "instant" });
        await sleep(180);
        if (pane.scrollTop === previousTop && pane.scrollHeight === previousHeight) unchanged += 1;
        else unchanged = 0;
      }
      pane.scrollTo({ top: 0, behavior: "instant" });
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
