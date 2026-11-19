require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    bsc: {
      // Public BSC RPC (read-only use here; deployment is a separate, confirmed step).
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
    },
  },
};
