import chai, { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { type SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { type TestToken, TestToken__factory, Stacking__factory, type Stacking } from '../typechain-types';
import chaiSubset from 'chai-subset';
chai.use(chaiSubset);

describe('Stacking', () => {
  let token: TestToken;
  let stacking: Stacking;
  let owner: SignerWithAddress;

  const getBalance = async (address: string) => await token.callStatic.balanceOf(address);

  const ONE_HOUR = 3600;
  const ONE_DAY = 24 * ONE_HOUR;
  const ONE_YEAR = 365 * ONE_DAY;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    token = await new TestToken__factory(owner).deploy('GRIMACE', 'Grimace Token');
    stacking = await new Stacking__factory(owner).deploy(token.address);

    const amount = ethers.utils.parseEther('100');
    await token.mint(owner.address, amount);
    await token.approve(stacking.address, ethers.constants.MaxUint256);
  });

  it('Should get minimum deposit error', async () => {
    const firstDeposit = ethers.utils.parseEther('0.0005');
    await expect(stacking.deposit(1, firstDeposit)).to.be.revertedWith('min limit 0.001 is required');
  });

  it('Should get minimum invalid plan error', async () => {
    const amounts = ethers.utils.parseEther('0.1');

    const [planId0, planId1, planId2] = [0, 1, 2];

    await stacking.deposit(planId0, amounts);
    await stacking.deposit(planId1, amounts);
    await stacking.deposit(planId2, amounts);
    await expect(stacking.deposit(3, amounts)).to.be.revertedWith('Invalid plan');

    const planInfo0 = await stacking.callStatic.plans(planId0);
    const planInfo1 = await stacking.callStatic.plans(planId1);
    const planInfo2 = await stacking.callStatic.plans(planId2);

    const plan0 = await stacking.callStatic.getPlanInfo(0);
    const plan1 = await stacking.callStatic.getPlanInfo(1);
    const plan2 = await stacking.callStatic.getPlanInfo(2);

    const expectedPlan0 = { time: planInfo0.time, percent: planInfo0.percent };
    const expectedPlan1 = { time: planInfo1.time, percent: planInfo1.percent };
    const expectedPlan2 = { time: planInfo2.time, percent: planInfo2.percent };

    expect(plan0).to.containSubset(expectedPlan0);
    expect(plan1).to.containSubset(expectedPlan1);
    expect(plan2).to.containSubset(expectedPlan2);
  });

  it('Check contract state after stacking', async () => {
    const amounts = ethers.utils.parseEther('10');
    await stacking.deposit(0, amounts);

    const stackingBalance = await getBalance(stacking.address);
    expect(stackingBalance).to.eq(amounts);

    const contractBalance = await stacking.callStatic.getContractBalance();
    expect(contractBalance).to.eq(amounts);

    const totalStacked = await stacking.callStatic.totalStacked();
    expect(totalStacked).to.eq(amounts);
  });

  it('Check user state after stacking', async () => {
    const amounts = ethers.utils.parseEther('10');
    const planId = 0;
    await stacking.deposit(planId, amounts);

    const userInfo = await stacking.callStatic.users(owner.address);
    const expectedUserInfo = {
      seedIncome: ethers.BigNumber.from('0'),
      withdrawn: ethers.BigNumber.from('0'),
    };
    expect(userInfo).to.containSubset(expectedUserInfo);

    const userAmountOfDeposits = await stacking.callStatic.getUserAmountOfDeposits(owner.address);
    expect(userAmountOfDeposits).to.eq(ethers.BigNumber.from('1'));

    const userTotalDeposits = await stacking.callStatic.getUserTotalDeposits(owner.address);
    expect(userTotalDeposits).to.eq(amounts);

    const planInfo = await stacking.callStatic.plans(planId);

    const timeStep = await stacking.callStatic.TIME_STEP();
    const userDepositInfo = await stacking.callStatic.getUserDepositInfo(owner.address, planId);
    const finishTime = userDepositInfo.start.add(timeStep.mul(ethers.BigNumber.from(planInfo.time)));
    const expectedDepositInfo = {
      plan: planId,
      amount: amounts,
      percent: ethers.BigNumber.from('1000'),
      finish: finishTime,
      isTaken: false,
    };

    expect(userDepositInfo).to.containSubset(expectedDepositInfo);
  });

  it('get user dividends for stacked tokens after one year', async () => {
    const amounts = ethers.utils.parseEther('10');
    const planId = 0;
    await stacking.deposit(planId, amounts);

    await expect(stacking.getUserDividends(owner.address, 1)).to.be.revertedWith('Invalid depositId');

    const userDividendsBefore = await stacking.getUserDividends(owner.address, 0);
    expect(userDividendsBefore).to.eq(ethers.BigNumber.from('0'));

    await network.provider.send('evm_increaseTime', [365 * 24 * ONE_HOUR]);
    await network.provider.send('evm_mine');

    const planInfo = await stacking.callStatic.plans(planId);
    const PERCENT_DIVIDER = await stacking.callStatic.PERCENT_DIVIDER();

    const userDepositInfo = await stacking.callStatic.getUserDepositInfo(owner.address, 0);
    const from = userDepositInfo.start;
    const to = from.add(ethers.BigNumber.from(ONE_DAY).mul(planInfo.time));
    const oneYearDividends = amounts
      .mul(ethers.utils.parseEther(planInfo.percent.toString()).div(PERCENT_DIVIDER))
      .div(ethers.utils.parseEther('1'));
    const totalDevidens = oneYearDividends.mul(to.sub(from)).div(ethers.BigNumber.from(ONE_YEAR));

    const userDividendsAfter = await stacking.getUserDividends(owner.address, 0);
    expect(userDividendsAfter).to.eq(totalDevidens);
  });

  it('withdraw tokens after one year', async () => {
    const amounts = ethers.utils.parseEther('10');
    await stacking.addTokens(amounts); // for dividends tokens withdraw

    const planId = 0;
    const balanceBefore = await getBalance(owner.address);
    await stacking.deposit(planId, amounts);

    await expect(stacking.getUserDividends(owner.address, 1)).to.be.revertedWith('Invalid depositId');

    const userDividendsBefore = await stacking.getUserDividends(owner.address, 0);
    expect(userDividendsBefore).to.eq(ethers.BigNumber.from('0'));

    await network.provider.send('evm_increaseTime', [365 * 24 * ONE_HOUR]);
    await network.provider.send('evm_mine');

    const planInfo = await stacking.callStatic.plans(planId);
    const PERCENT_DIVIDER = await stacking.callStatic.PERCENT_DIVIDER();

    const userDepositInfo = await stacking.callStatic.getUserDepositInfo(owner.address, 0);
    const from = userDepositInfo.start;
    const to = from.add(ethers.BigNumber.from(ONE_DAY).mul(planInfo.time));
    const oneYearDividends = amounts
      .mul(ethers.utils.parseEther(planInfo.percent.toString()).div(PERCENT_DIVIDER))
      .div(ethers.utils.parseEther('1'));
    const totalDevidens = oneYearDividends.mul(to.sub(from)).div(ethers.BigNumber.from(ONE_YEAR));

    await stacking.withdraw(planId);

    const balanceAfter = await getBalance(owner.address);
    const diff = balanceAfter.sub(balanceBefore);

    expect(diff).to.eq(totalDevidens);
  });

  it('cannot withdraw tokens twice', async () => {
    const adminTokens = ethers.utils.parseEther('30');
    const amounts = ethers.utils.parseEther('10');
    await stacking.addTokens(adminTokens); // for dividends tokens withdraw

    await stacking.deposit(0, amounts);

    await network.provider.send('evm_increaseTime', [365 * 24 * ONE_HOUR]);
    await network.provider.send('evm_mine');

    await stacking.withdraw(0);

    await expect(stacking.withdraw(0)).to.be.revertedWith('deposit is already taken');
  });

  it('withdraw with penalty', async () => {
    const adminTokens = ethers.utils.parseEther('30');
    const amounts = ethers.utils.parseEther('10');
    await stacking.addTokens(adminTokens); // for dividends tokens withdraw

    const balanceBefore = await getBalance(owner.address);
    const adminTokensBefore = await stacking.callStatic.adminTokens();

    await stacking.deposit(0, amounts);
    await network.provider.send('evm_increaseTime', [10 * 24 * ONE_HOUR]);
    await network.provider.send('evm_mine');
    await stacking.withdraw(0);
    const adminTokensAfter = await stacking.callStatic.adminTokens();

    const balanceAfter = await getBalance(owner.address);
    const diff = balanceAfter.sub(balanceBefore);
    const expectedLoss = ethers.utils.parseEther('-0.3');
    expect(diff).to.eq(expectedLoss);

    const diffAdminTokens = adminTokensAfter.sub(adminTokensBefore);
    const expectedAdminEarn = ethers.utils.parseEther('0.3');
    expect(diffAdminTokens).to.eq(expectedAdminEarn);
  });
});
