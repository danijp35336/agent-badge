// AgentBadge frontend config.
// CONTRACT_ADDRESS is empty until the contract is deployed on BNB Chain mainnet.
// After deployment, set it to the deployed address and redeploy this site.
const CONFIG = {
  RPC_URL: "https://bsc-dataseed.binance.org/",
  CHAIN_ID_HEX: "0x38", // BNB Chain mainnet, chainId 56
  AGENT_ID_ADDRESS: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  BADGE_ADDRESS: "", // <-- fill in after mainnet deployment
  DEPLOY_BLOCK: 0, // <-- set to the deployment block after mainnet deployment
};
