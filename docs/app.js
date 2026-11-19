// AgentBadge frontend — vanilla JS, no libraries, no trackers.
// Talks only to the injected wallet provider and the public chain RPC.
// Selectors below were computed from the contract ABI (see contracts/AgentBadge.sol).
(function () {
  "use strict";
  const SEL = {
    balanceOf: "0x70a08231",
    handleOf: "0xc50a1514",
    claimBadge: "0x56e56942",
    checkIn: "0x183ff085",
    streakOf: "0x4fc1854a",
    tierOf: "0xc8f74bb8",
    hasBadge: "0x5e50864f",
  };
  const TOPIC_CHECKED_IN = "0x621d62c6c0c4a0c35e883c6b27ad50ecc3093f08bfaf8aa5f58127d351feeb21";

  const $ = (id) => document.getElementById(id);
  const statusEl = $("status");
  let account = null;

  function setStatus(msg) { statusEl.textContent = msg || ""; }
  function shortAddr(a) { return a.slice(0, 6) + "…" + a.slice(-4); }
  function padAddr(a) { return a.toLowerCase().replace(/^0x/, "").padStart(64, "0"); }
  function hexToBigInt(hex) { return BigInt(hex); }

  async function rpc(method, params) {
    const res = await fetch(CONFIG.RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    return json.result;
  }

  async function ethCall(to, data) {
    return rpc("eth_call", [{ to, data }, "latest"]);
  }

  // Decode an ABI-encoded string return value.
  function decodeString(hex) {
    const bytes = new Uint8Array(hex.replace(/^0x/, "").match(/../g).map((h) => parseInt(h, 16)));
    const view = new DataView(bytes.buffer);
    const offset = Number(view.getBigUint64(24, false));
    const len = Number(view.getBigUint64(offset + 24, false));
    return new TextDecoder().decode(bytes.slice(offset + 32, offset + 32 + len));
  }

  function tierFor(streak) {
    if (streak >= 30n) return "Gold";
    if (streak >= 7n) return "Silver";
    return "Bronze";
  }

  async function refresh() {
    if (!account) return;
    try {
      const balHex = await ethCall(CONFIG.AGENT_ID_ADDRESS, SEL.balanceOf + padAddr(account));
      const isHolder = hexToBigInt(balHex) > 0n;
      let handle = "";
      try { handle = await decodeString(await ethCall(CONFIG.AGENT_ID_ADDRESS, SEL.handleOf + padAddr(account))); } catch (e) { /* handle optional */ }
      $("walletLine").textContent = "Connected: " + shortAddr(account) + (handle ? "  ·  Agent ID: " + handle + ".agent" : "");
      $("holderLine").textContent = isHolder
        ? "✅ You hold an Agent ID" + (handle ? " (" + handle + ")" : "") + " — you can claim a badge."
        : "❌ This address holds no Agent ID, so it cannot claim a badge.";
      if (!CONFIG.BADGE_ADDRESS) {
        $("badgeLine").textContent = "Contract not deployed yet — claiming opens after deployment.";
        $("claimBtn").disabled = true;
        $("checkinBtn").disabled = true;
        return;
      }
      const hasHex = await ethCall(CONFIG.BADGE_ADDRESS, SEL.hasBadge + padAddr(account));
      const has = hexToBigInt(hasHex) !== 0n;
      const streakHex = await ethCall(CONFIG.BADGE_ADDRESS, SEL.streakOf + padAddr(account));
      const streak = hexToBigInt(streakHex);
      $("streak").textContent = streak.toString();
      const tier = tierFor(streak);
      const tierEl = $("tier");
      tierEl.textContent = tier;
      tierEl.className = "tier " + tier;
      $("badgeLine").textContent = has ? "✅ Badge claimed." : "No badge yet.";
      $("claimBtn").disabled = !isHolder || has;
      $("checkinBtn").disabled = !has;
    } catch (e) {
      setStatus("Error reading chain state: " + e.message);
    }
  }

  async function loadLeaderboard() {
    const body = $("board");
    if (!CONFIG.BADGE_ADDRESS) {
      body.innerHTML = "<tr><td colspan='4'>Leaderboard opens once the contract is deployed.</td></tr>";
      return;
    }
    try {
      const logs = await rpc("eth_getLogs", [{
        address: CONFIG.BADGE_ADDRESS,
        fromBlock: "0x" + CONFIG.DEPLOY_BLOCK.toString(16),
        toBlock: "latest",
        topics: [TOPIC_CHECKED_IN],
      }]);
      const best = new Map(); // holder -> max streak
      for (const log of logs) {
        const holder = "0x" + log.topics[1].slice(-40);
        const streak = hexToBigInt(log.data.slice(0, 66));
        if (!best.has(holder) || streak > best.get(holder)) best.set(holder, streak);
      }
      const rows = [...best.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1)).slice(0, 10);
      if (!rows.length) { body.innerHTML = "<tr><td colspan='4'>No check-ins yet.</td></tr>"; return; }
      body.innerHTML = "";
      for (let i = 0; i < rows.length; i++) {
        const [holder, streak] = rows[i];
        let label = shortAddr(holder);
        try {
          const h = await decodeString(await ethCall(CONFIG.AGENT_ID_ADDRESS, SEL.handleOf + padAddr(holder)));
          if (h) label = h + " (" + shortAddr(holder) + ")";
        } catch (e) { /* keep address */ }
        const tier = tierFor(streak);
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (i + 1) + "</td><td></td><td>" + streak.toString() + "</td><td class='tier " + tier + "'>" + tier + "</td>";
        tr.children[1].textContent = label;
        body.appendChild(tr);
      }
    } catch (e) {
      body.innerHTML = "<tr><td colspan='4'>Could not load leaderboard: " + e.message + "</td></tr>";
    }
  }

  $("connectBtn").addEventListener("click", async () => {
    if (!window.ethereum) { setStatus("No injected wallet found. Install MetaMask or use a wallet browser."); return; }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== CONFIG.CHAIN_ID_HEX) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONFIG.CHAIN_ID_HEX }] });
        } catch (e) { setStatus("Please switch your wallet to BNB Chain mainnet (chainId 56)."); return; }
      }
      setStatus("");
      await refresh();
    } catch (e) { setStatus("Wallet connection failed: " + (e.message || e)); }
  });

  async function sendTx(data, label) {
    setStatus("Waiting for you to confirm the " + label + " transaction in your wallet…");
    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: CONFIG.BADGE_ADDRESS, data, value: "0x0" }],
      });
      setStatus(label + " submitted: " + txHash + " — waiting for confirmation…");
      // Poll for receipt.
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
        if (receipt) {
          setStatus(receipt.status === "0x1" ? label + " confirmed ✅ (" + txHash + ")" : label + " failed on-chain (" + txHash + ")");
          await refresh();
          await loadLeaderboard();
          return;
        }
      }
      setStatus(label + " submitted (" + txHash + ") — still pending; refresh the page to check.");
    } catch (e) { setStatus(label + " failed: " + (e.message || e)); }
  }

  $("claimBtn").addEventListener("click", () => sendTx(SEL.claimBadge, "Claim"));
  $("checkinBtn").addEventListener("click", () => sendTx(SEL.checkIn, "Check-in"));

  if (!CONFIG.BADGE_ADDRESS) $("deployNotice").hidden = false;
  loadLeaderboard();
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accs) => { account = accs[0] || null; refresh(); });
  }
})();
