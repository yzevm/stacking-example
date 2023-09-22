import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { type SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { type TestToken, TestToken__factory, Stacking__factory, type Stacking } from '../typechain-types';
import chaiSubset from 'chai-subset';
chai.use(chaiSubset);

describe('Admin management', () => {
  let token: TestToken;
  let stacking: Stacking;
  let owner: SignerWithAddress;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    token = await new TestToken__factory(owner).deploy('GRIMACE', 'Grimace Token');
    stacking = await new Stacking__factory(owner).deploy(token.address);

    const amount = ethers.utils.parseEther('100');
    await token.mint(owner.address, amount);
    await token.approve(stacking.address, ethers.constants.MaxUint256);
  });

  it('Should get error while withdrawing reward tokens', async () => {
    const firstDeposit = ethers.utils.parseEther('0.0005');
    await expect(stacking.withdrawTokens(firstDeposit)).to.be.revertedWith('Admin can withdraw less than adminTokens amount');
  });

  it('Should get minimum invalid plan error', async () => {
    const withrawAmounts = ethers.utils.parseEther('0.2');

    await expect(stacking.withdrawTokens(withrawAmounts)).to.be.revertedWith('Admin can withdraw less than adminTokens amount');
  });
});
