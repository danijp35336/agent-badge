// Verifies the frontend's raw eth_call wiring (selectors + string decoding)
// against a real local deployment. Run while `npx hardhat node` is up:
//   npx hardhat run scripts/verify-frontend-wiring.js --network localhost
const { ethers } = require("hardhat");

const SEL = {
  balanceOf: "0x70a08231",
  handleOf: "0xc50a1514",
  streakOf: "0x4fc1854a",
  tierOf: "0xc8f74bb8",
  hasBadge: "0x5e50864f",
};

function decodeString(hex) {
  const bytes = new Uint8Array(hex.replace(/^0x/, "").match(/../g).map((h) => parseInt(h, 16)));
  const view = new DataView(bytes.buffer);
  const offset = Number(view.getBigUint64(24, false));
  const len = Number(view.getBigUint64(offset + 24, false));
  return new TextDecoder().decode(bytes.slice(offset + 32, offset + 32 + len));
}

async function main() {
  const [deployer, holder] = await ethers.getSigners();
  const Mock = await ethers.getContractFactory("MockAgentId");
  const mock = await Mock.deploy();
  const Badge = await ethers.getContractFactory("AgentBadge");
  const badge = await Badge.deploy(await mock.getAddress());
  await mock.setBalance(holder.address, 1);
  await mock.setHandle(holder.address, "danijp");
  await badge.connect(holder).claimBadge();
  await badge.connect(holder).checkIn();

  const provider = ethers.provider;
  const pad = (a) => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const mockAddr = await mock.getAddress();
  const badgeAddr = await badge.getAddress();

  const bal = await provider.call({ to: mockAddr, data: SEL.balanceOf + pad(holder.address) });
  const handle = decodeString(await provider.call({ to: mockAddr, data: SEL.handleOf + pad(holder.address) }));
  const has = await provider.call({ to: badgeAddr, data: SEL.hasBadge + pad(holder.address) });
  const streak = await provider.call({ to: badgeAddr, data: SEL.streakOf + pad(holder.address) });
  const tier = decodeString(await provider.call({ to: badgeAddr, data: SEL.tierOf + pad(holder.address) }));

  console.log("balanceOf(holder) =", BigInt(bal).toString(), "(expect 1)");
  console.log("handleOf(holder)  =", JSON.stringify(handle), "(expect \"danijp\")");
  console.log("hasBadge(holder)  =", BigInt(has).toString(), "(expect 1)");
  console.log("streakOf(holder)  =", BigInt(streak).toString(), "(expect 1)");
  console.log("tierOf(holder)    =", JSON.stringify(tier), "(expect \"Bronze\")");
  const ok = BigInt(bal) === 1n && handle === "danijp" && BigInt(has) === 1n && BigInt(streak) === 1n && tier === "Bronze";
  console.log(ok ? "FRONTEND WIRING OK" : "FRONTEND WIRING FAILED");
  if (!ok) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
