import chai, { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { TestToken, TestToken__factory, Stacking__factory, Stacking } from '../typechain-types';
import chaiSubset from 'chai-subset';
chai.use(chaiSubset);

describe('Stacking', () => {
  let token: TestToken;
  let stacking: Stacking;
  let owner: SignerWithAddress

  const getBalance = (address: string) => token.callStatic.balanceOf(address)

  const ONE_HOUR = 3600
  const ONE_DAY = 24 * ONE_HOUR
  const ONE_YEAR = 365 * ONE_DAY

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    token = await new TestToken__factory(owner).deploy('GRIMACE', 'Grimace Token');
    stacking = await new Stacking__factory(owner).deploy(token.address);

    const amount = ethers.utils.parseEther('100');
    await token.mint(owner.address, amount);
    await token.approve(stacking.address, ethers.constants.MaxUint256);
  })

  it('Should get minimum deposit error', async () => {
    const firstDeposit = ethers.utils.parseEther('0.0005');
    await expect(stacking.depositTokens(1, firstDeposit)).to.be.revertedWith('min limit 0.001 is required');
  });

  it('Should get minimum invalid plan error', async () => {
    const amounts = ethers.utils.parseEther('0.1');

    await stacking.depositTokens(0, amounts);
    await stacking.depositTokens(1, amounts);
    await stacking.depositTokens(2, amounts);
    await expect(stacking.depositTokens(3, amounts)).to.be.revertedWith('Invalid plan');

    const plan0 = await stacking.callStatic.getPlanInfo(0)
    const plan1 = await stacking.callStatic.getPlanInfo(1)
    const plan2 = await stacking.callStatic.getPlanInfo(2)

    const expectedPlan0 = { time: ethers.BigNumber.from('30'), percent: ethers.BigNumber.from('1000') }
    const expectedPlan1 = { time: ethers.BigNumber.from('60'), percent: ethers.BigNumber.from('1500') }
    const expectedPlan2 = { time: ethers.BigNumber.from('90'), percent: ethers.BigNumber.from('2000') }

    expect(plan0).to.containSubset(expectedPlan0);
    expect(plan1).to.containSubset(expectedPlan1);
    expect(plan2).to.containSubset(expectedPlan2);
  });

  it('Check contract state after stacking', async () => {
    const amounts = ethers.utils.parseEther('10');
    await stacking.depositTokens(0, amounts);

    const stackingBalance = await getBalance(stacking.address)
    expect(stackingBalance).to.eq(amounts);

    const contractBalance = await stacking.callStatic.getContractBalance()
    expect(contractBalance).to.eq(amounts)
    
    const totalStacked = await stacking.callStatic.totalStacked()
    expect(totalStacked).to.eq(amounts)
  });

  it('Check user state after stacking', async () => {
    const amounts = ethers.utils.parseEther('10');
    await stacking.depositTokens(0, amounts);

    const userInfo = await stacking.callStatic.users(owner.address)
    const expectedUserInfo = {
      seedIncome: ethers.BigNumber.from('0'),
      withdrawn: ethers.BigNumber.from('0'),
    }
    expect(userInfo).to.containSubset(expectedUserInfo);

    const userAmountOfDeposits = await stacking.callStatic.getUserAmountOfDeposits(owner.address)
    expect(userAmountOfDeposits).to.eq(ethers.BigNumber.from('1'))

    const userTotalDeposits = await stacking.callStatic.getUserTotalDeposits(owner.address)
    expect(userTotalDeposits).to.eq(amounts)

    const timeStep = await stacking.callStatic.TIME_STEP()
    const userDepositInfo = await stacking.callStatic.getUserDepositInfo(owner.address, 0)
    const finishTime = userDepositInfo.start.add(timeStep.mul(ethers.BigNumber.from('30')))
    const expectedDepositInfo = {
      plan: 0,
      amount: amounts,
      percent: ethers.BigNumber.from('1000'),
      finish: finishTime,
    }

    expect(userDepositInfo).to.containSubset(expectedDepositInfo);
  });

  it('get user dividends for stacked tokens after one year', async () => {
    const amounts = ethers.utils.parseEther('10');
    await stacking.depositTokens(0, amounts);

    await expect(stacking.getUserDividends(owner.address, 1)).to.be.revertedWith('Invalid depositId');

    const userDividendsBefore = await stacking.getUserDividends(owner.address, 0);
    expect(userDividendsBefore).to.eq(ethers.BigNumber.from('0'))
    
    await network.provider.send("evm_increaseTime", [365 * 24 * ONE_HOUR]);
    await network.provider.send("evm_mine");

    const userDepositInfo = await stacking.callStatic.getUserDepositInfo(owner.address, 0)
    const from = userDepositInfo.start;
    const to = from.add(ethers.BigNumber.from(ONE_DAY).mul(ethers.BigNumber.from(30)));
    const oneYearDividends = amounts.mul(ethers.utils.parseEther('0.1')).div(ethers.utils.parseEther('1'))
    const totalDevidens = oneYearDividends.mul(to.sub(from)).div(ethers.BigNumber.from(ONE_YEAR));

    const userDividendsAfter = await stacking.getUserDividends(owner.address, 0);
    expect(userDividendsAfter).to.eq(totalDevidens)
  })

  it('withdraw tokens after one year', async () => {
    const amounts = ethers.utils.parseEther('10');
    await stacking.addTokens(amounts); // for dividends tokens withdraw

    const balanceBefore = await getBalance(owner.address)
    await stacking.depositTokens(0, amounts);

    await expect(stacking.getUserDividends(owner.address, 1)).to.be.revertedWith('Invalid depositId');

    const userDividendsBefore = await stacking.getUserDividends(owner.address, 0);
    expect(userDividendsBefore).to.eq(ethers.BigNumber.from('0'))
    
    await network.provider.send("evm_increaseTime", [365 * 24 * ONE_HOUR]);
    await network.provider.send("evm_mine");

    const userDepositInfo = await stacking.callStatic.getUserDepositInfo(owner.address, 0)
    const from = userDepositInfo.start;
    const to = from.add(ethers.BigNumber.from(ONE_DAY).mul(ethers.BigNumber.from(30)));
    const oneYearDividends = amounts.mul(ethers.utils.parseEther('0.1')).div(ethers.utils.parseEther('1'))
    const totalDevidens = oneYearDividends.mul(to.sub(from)).div(ethers.BigNumber.from(ONE_YEAR));

    await stacking.withdraw(0);

    const balanceAfter = await getBalance(owner.address)
    const diff = balanceAfter.sub(balanceBefore)

    expect(diff).to.eq(totalDevidens);
  })
});