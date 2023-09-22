import { Stacking__factory, TestToken__factory } from '../typechain-types';
const { ethers } = require('hardhat');

async function main() {
  const accounts = await ethers.getSigners();
  const owner = accounts[0];
  const token = await new TestToken__factory(owner).deploy('GRIMACE', 'Grimace Token');
  const stacking = await new Stacking__factory(owner).deploy(token.address);

  const amount = ethers.utils.parseEther('100');
  await token.mint(owner.address, amount);
  await token.approve(stacking.address, ethers.constants.MaxUint256);

  const amount0 = ethers.utils.parseEther('10');
  const amount1 = ethers.utils.parseEther('20');
  const amount2 = ethers.utils.parseEther('30');
  const dividends = ethers.utils.parseEther('5');
  await stacking.addTokens(dividends); // for dividends tokens withdraw

  await stacking.deposit(0, amount0);
  await stacking.deposit(1, amount1);
  await stacking.deposit(2, amount2);

  console.log({ stacking: stacking.address });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
