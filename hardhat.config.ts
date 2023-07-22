import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    local: {
      url: 'http://127.0.0.1:8545'
    },
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v5',
  },
};

export default config;
