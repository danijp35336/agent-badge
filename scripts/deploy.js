const { ethers } = require("hardhat");

// Agent ID contract (SPACE ID) on BNB Chain mainnet.
const AGENT_ID_MAINNET = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";

async function main() {
  const AgentBadge = await ethers.getContractFactory("AgentBadge");
  const badge = await AgentBadge.deploy(AGENT_ID_MAINNET);
  const receipt = await badge.deploymentTransaction().wait();
  console.log("AgentBadge deployed to:", await badge.getAddress());
  console.log("Constructor arg (Agent ID):", AGENT_ID_MAINNET);
  console.log("Deployment gasUsed:", receipt.gasUsed.toString());
  console.log("Deployer:", receipt.from);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
