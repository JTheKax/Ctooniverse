"use strict";
// This endpoint publishes one aggregate number; browser clients never query auth.users.
(() => {
  const total = document.getElementById("home-player-count");
  const status = document.getElementById("home-player-status");
  if (!total || !status) return;
  const key = "sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
  const url = "https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/site_player_stats?select=registered_players&id=eq.1";
  let sequence = 0;
  let previous = null;
  async function refresh() {
    const seq = ++sequence;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { apikey: key, Authorization: "Bearer " + key },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("Player count unavailable");
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length !== 1) throw new Error("Missing registration statistics");
      const count = Number(rows[0].registered_players);
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid registration total");
      if (seq !== sequence) return;
      previous = count;
      total.textContent = count.toLocaleString();
      status.textContent = "Updates automatically";
    } catch (_) {
      if (seq !== sequence) return;
      total.textContent = previous === null ? "—" : previous.toLocaleString();
      status.textContent = previous === null ? "Count temporarily unavailable" : "Last available count";
    } finally {
      clearTimeout(timeout);
    }
  }
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  window.addEventListener("focus", refresh);
})();
