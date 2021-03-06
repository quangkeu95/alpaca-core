const {expectRevert, time} = require("@openzeppelin/test-helpers");
const BFactory = artifacts.require("BFactory");
const ConfigurableRightsPool = artifacts.require("ConfigurableRightsPool");
const CRPFactory = artifacts.require("CRPFactory");
const MasterRancher = artifacts.require("MasterRancher");
//const BFactory = artifacts.require('BFactory');
//const ConfigurableRightsPool = artifacts.require('ConfigurableRightsPool');
//const CRPFactory = artifacts.require('CRPFactory');
//const TToken = artifacts.require('TToken');
const truffleAssert = require("truffle-assertions");
const AlpacaToken = artifacts.require("AlpacaToken");
const MockERC20 = artifacts.require("MockERC20");
const UniswapV2Pair = artifacts.require("UniswapV2Pair");
const UniswapV2Factory = artifacts.require("UniswapV2Factory");
const Migrator = artifacts.require("Migrator");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

contract("MasterRancher", ([alice, bob, carol, dev, minter]) => {

  before(async () => {
    // this.startBlock = (await time.latestBlock()).toNumber();
    sb = await time.latestBlock();
    this.startBlock = sb.toNumber();
  });

  beforeEach(async () => {
    this.paca = await AlpacaToken.new({from: alice});
  });

  it("should set correct state variables", async () => {
    this.ranch = await MasterRancher.new(
      this.paca.address,
      dev,
      "1000",
      String(this.startBlock + 0),
      String(this.startBlock + 1000),
      false,
      {from: alice}
    );
    await this.paca.transferOwnership(this.ranch.address, {from: alice});
    const paca = await this.ranch.paca();
    const devaddr = await this.ranch.devaddr();
    const owner = await this.paca.owner();
    assert.equal(paca.valueOf(), this.paca.address);
    assert.equal(devaddr.valueOf(), dev);
    assert.equal(owner.valueOf(), this.ranch.address);
  });

  it("should allow dev and only dev to update dev", async () => {
    this.ranch = await MasterRancher.new(
      this.paca.address,
      dev,
      "1000",
      String(this.startBlock + 0),
      String(this.startBlock + 1000),
      false,
      {from: alice}
    );
    assert.equal((await this.ranch.devaddr()).valueOf(), dev);
    await expectRevert(this.ranch.dev(bob, {from: bob}), "dev: wut?");
    await this.ranch.dev(bob, {from: dev});
    assert.equal((await this.ranch.devaddr()).valueOf(), bob);
    await this.ranch.dev(alice, {from: bob});
    assert.equal((await this.ranch.devaddr()).valueOf(), alice);
  });

  context("With ERC/LP token added to the field", () => {
    beforeEach(async () => {
      this.lp = await MockERC20.new("LPToken", "LP", "10000000000", {
        from: minter,
      });
      await this.lp.transfer(alice, "1000", {from: minter});
      await this.lp.transfer(bob, "1000", {from: minter});
      await this.lp.transfer(carol, "1000", {from: minter});
      this.lp2 = await MockERC20.new("LPToken2", "LP2", "10000000000", {
        from: minter,
      });
      await this.lp2.transfer(alice, "1000", {from: minter});
      await this.lp2.transfer(bob, "1000", {from: minter});
      await this.lp2.transfer(carol, "1000", {from: minter});
    });

    it("should allow emergency withdraw", async () => {
      // 100 per block farming rate starting at block 100 with bonus until block 1000
      this.ranch = await MasterRancher.new(
        this.paca.address,
        dev,
        "100",
        String(this.startBlock + 100),
        String(this.startBlock + 1000),
        // "100",
        // "1000",
        false,
        {from: alice}
      );
      await this.ranch.add("100", this.lp.address, true);
      await this.lp.approve(this.ranch.address, "1000", {from: bob});
      await this.ranch.deposit(0, "100", {from: bob});
      assert.equal((await this.lp.balanceOf(bob)).valueOf(), "900");
      await this.ranch.emergencyWithdraw(0, {from: bob});
      assert.equal((await this.lp.balanceOf(bob)).valueOf(), "1000");
    });

    it('should give out PACAs only after farming time', async () => {
      // 100 per block farming rate starting at block 100 with bonus until block 1000
      // this.ranch = await MasterRancher.new(this.paca.address, dev, '100', '100', '1000', { from: alice });
      this.ranch = await MasterRancher.new(
        this.paca.address, 
        dev, 
        '110', 
        String(this.startBlock + 100),
        String(this.startBlock + 1000),
        // '100', 
        // '1000', 
        false,
        { from: alice }
      );
      await this.paca.transferOwnership(this.ranch.address, { from: alice });
      await this.ranch.add('100', this.lp.address, true);
      await this.lp.approve(this.ranch.address, '1000', { from: bob });
      await this.ranch.deposit(0, '100', { from: bob });
      // await time.advanceBlockTo(this.startBlock + '90');
      await time.advanceBlockTo(this.startBlock + 90);
      await this.ranch.deposit(0, '0', { from: bob }); // block 91
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), '0');
      await time.advanceBlockTo(this.startBlock + 94);
      await this.ranch.deposit(0, '0', { from: bob }); // block 95
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), '0');
      await time.advanceBlockTo(this.startBlock + 99);
      await this.ranch.deposit(0, '0', { from: bob }); // block 100
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), '0');
      await time.advanceBlockTo(this.startBlock + 100);
      await this.ranch.deposit(0, '0', { from: bob }); // block 101
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), '1000');
      // assert.equal((await this.paca.balanceOf(bob)).valueOf(), '950');
      await time.advanceBlockTo(this.startBlock + 104);
      await this.ranch.deposit(0, '0', { from: bob }); // block 105
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), '5000');
      assert.equal((await this.paca.balanceOf(dev)).valueOf(), '500');
      assert.equal((await this.paca.totalSupply()).valueOf(), '5500');

      // await this.ranch.deposit(0, '0', { from: bob }); // block 101
      // // assert.equal((await this.paca.balanceOf(bob)).valueOf(), '1000');
      // assert.equal((await this.paca.balanceOf(bob)).valueOf(), '950');
      // await time.advanceBlockTo('104');
      // await this.ranch.deposit(0, '0', { from: bob }); // block 105
      // // assert.equal((await this.paca.balanceOf(bob)).valueOf(), '5000');
      // // assert.equal((await this.paca.balanceOf(dev)).valueOf(), '500');
      // // assert.equal((await this.paca.totalSupply()).valueOf(), '5500');
      // assert.equal((await this.paca.balanceOf(bob)).valueOf(), '4750');
      // assert.equal((await this.paca.balanceOf(dev)).valueOf(), '250');
      // assert.equal((await this.paca.totalSupply()).valueOf(), '5000');
    });

    it("should not distribute PACAs if no one deposit", async () => {
      // 100 per block farming rate starting at block 200 with bonus until block 1000
      this.ranch = await MasterRancher.new(
        this.paca.address,
        dev,
        "110",
        String(this.startBlock + 200),
        String(this.startBlock + 1000),
        // "200",
        // "1000",
        false,
        {from: alice}
      );
      
      await this.paca.transferOwnership(this.ranch.address, {from: alice});
      await this.ranch.add("100", this.lp.address, true);
      await this.lp.approve(this.ranch.address, "1000", {from: bob});
      await time.advanceBlockTo(this.startBlock + 199);
      assert.equal((await this.paca.totalSupply()).valueOf(), "0");
      await time.advanceBlockTo(this.startBlock + 204);
      assert.equal((await this.paca.totalSupply()).valueOf(), "0");
      await time.advanceBlockTo(this.startBlock + 209);
      await this.ranch.deposit(0, "10", {from: bob}); // block 210
      assert.equal((await this.paca.totalSupply()).valueOf(), "0");
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), "0");
      assert.equal((await this.paca.balanceOf(dev)).valueOf(), "0");
      assert.equal((await this.lp.balanceOf(bob)).valueOf(), "990");
      await time.advanceBlockTo(this.startBlock + 219);
      await this.ranch.withdraw(0, "10", {from: bob}); // block 220
      assert.equal((await this.paca.totalSupply()).valueOf(), "11000");
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), "10000");
      assert.equal((await this.paca.balanceOf(dev)).valueOf(), "1000");
      assert.equal((await this.lp.balanceOf(bob)).valueOf(), "1000");
    });

    it("should distribute PACAs properly for each staker", async () => {
      // 100 per block farming rate starting at block 300 with bonus until block 1000
      this.ranch = await MasterRancher.new(
        this.paca.address,
        dev,
        "110",
        String(this.startBlock + 300),
        String(this.startBlock + 1000),
        // "300",
        // "1000",
        false,
        {from: alice}
      );
      await this.paca.transferOwnership(this.ranch.address, {from: alice});
      await this.ranch.add("100", this.lp.address, true);
      await this.lp.approve(this.ranch.address, "1000", {from: alice});
      await this.lp.approve(this.ranch.address, "1000", {from: bob});
      await this.lp.approve(this.ranch.address, "1000", {from: carol});
      // Alice deposits 10 LPs at block 310
      await time.advanceBlockTo(this.startBlock + 309);
      await this.ranch.deposit(0, "10", {from: alice});
      // Bob deposits 20 LPs at block 314
      await time.advanceBlockTo(this.startBlock + 313);
      await this.ranch.deposit(0, "20", {from: bob});
      // Carol deposits 30 LPs at block 318
      await time.advanceBlockTo(this.startBlock + 317);
      await this.ranch.deposit(0, "30", {from: carol});
      // Alice deposits 10 more LPs at block 320. At this point:
      //   Alice should have: 4*1000 + 4*1/3*1000 + 2*1/6*1000 = 5666
      //   Masterranch should have the remaining: 10000 - 5666 = 4334
      await time.advanceBlockTo(this.startBlock + 319);
      await this.ranch.deposit(0, "10", {from: alice});
      assert.equal((await this.paca.totalSupply()).valueOf(), "11000");
      assert.equal((await this.paca.balanceOf(alice)).valueOf(), "5666");
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), "0");
      assert.equal((await this.paca.balanceOf(carol)).valueOf(), "0");
      assert.equal(
        (await this.paca.balanceOf(this.ranch.address)).valueOf(),
        "4334"
      );
      assert.equal((await this.paca.balanceOf(dev)).valueOf(), "1000");
      // Bob withdraws 5 LPs at block 330. At this point:
      //   Bob should have: 4*2/3*1000 + 2*2/6*1000 + 10*2/7*1000 = 6190
      await time.advanceBlockTo(this.startBlock + 329);
      await this.ranch.withdraw(0, "5", {from: bob});
      assert.equal((await this.paca.totalSupply()).valueOf(), "22000");
      assert.equal((await this.paca.balanceOf(alice)).valueOf(), "5666");
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), "6190");
      assert.equal((await this.paca.balanceOf(carol)).valueOf(), "0");
      assert.equal(
        (await this.paca.balanceOf(this.ranch.address)).valueOf(),
        "8144"
      );
      assert.equal((await this.paca.balanceOf(dev)).valueOf(), "2000");
      // Alice withdraws 20 LPs at block 340.
      // Bob withdraws 15 LPs at block 350.
      // Carol withdraws 30 LPs at block 360.
      await time.advanceBlockTo(this.startBlock + 339);
      await this.ranch.withdraw(0, "20", {from: alice});
      await time.advanceBlockTo(this.startBlock + 349);
      await this.ranch.withdraw(0, "15", {from: bob});
      await time.advanceBlockTo(this.startBlock + 359);
      await this.ranch.withdraw(0, "30", {from: carol});
      assert.equal((await this.paca.totalSupply()).valueOf(), "55000");
      assert.equal((await this.paca.balanceOf(dev)).valueOf(), "5000");
      // Alice should have: 5666 + 10*2/7*1000 + 10*2/6.5*1000 = 11600
      assert.equal((await this.paca.balanceOf(alice)).valueOf(), "11600");
      // Bob should have: 6190 + 10*1.5/6.5 * 1000 + 10*1.5/4.5*1000 = 11831
      assert.equal((await this.paca.balanceOf(bob)).valueOf(), "11831");
      // Carol should have: 2*3/6*1000 + 10*3/7*1000 + 10*3/6.5*1000 + 10*3/4.5*1000 + 10*1000 = 26568
      assert.equal((await this.paca.balanceOf(carol)).valueOf(), "26568");
      // All of them should have 1000 LPs back.
      assert.equal((await this.lp.balanceOf(alice)).valueOf(), "1000");
      assert.equal((await this.lp.balanceOf(bob)).valueOf(), "1000");
      assert.equal((await this.lp.balanceOf(carol)).valueOf(), "1000");
    });

    it("should give proper PACAs allocation to each pool", async () => {
      // 100 per block farming rate starting at block 400 with bonus until block 1000
      this.ranch = await MasterRancher.new(
        this.paca.address,
        dev,
        "110",
        String(this.startBlock + 400),
        String(this.startBlock + 1000),
        // "400",
        // "1000",
        false,
        {from: alice}
      );
      await this.paca.transferOwnership(this.ranch.address, {from: alice});
      await this.lp.approve(this.ranch.address, "1000", {from: alice});
      await this.lp2.approve(this.ranch.address, "1000", {from: bob});
      // Add first LP to the pool with allocation 1
      await this.ranch.add("10", this.lp.address, true);
      // Alice deposits 10 LPs at block 410
      await time.advanceBlockTo(this.startBlock + 409);
      await this.ranch.deposit(0, "10", {from: alice});
      // Add LP2 to the pool with allocation 2 at block 420
      await time.advanceBlockTo(this.startBlock + 419);
      await this.ranch.add("20", this.lp2.address, true);
      // Alice should have 10*1000 pending reward
      assert.equal((await this.ranch.pendingPaca(0, alice)).valueOf(), "10000");
      // Bob deposits 10 LP2s at block 425
      await time.advanceBlockTo(this.startBlock + 424);
      await this.ranch.deposit(1, "5", {from: bob});
      // Alice should have 10000 + 5*1/3*1000 = 11666 pending reward
      assert.equal((await this.ranch.pendingPaca(0, alice)).valueOf(), "11667");
      await time.advanceBlockTo(this.startBlock + 430);
      // At block 430. Bob should get 5*2/3*1000 = 3333. Alice should get ~1666 more.
      assert.equal((await this.ranch.pendingPaca(0, alice)).valueOf(), "13333");
      assert.equal((await this.ranch.pendingPaca(1, bob)).valueOf(), "3333");
    });

    it("should stop giving bonus PACAs after the bonus period ends", async () => {
      // 100 per block farming rate starting at block 500 with bonus until block 600
      this.ranch = await MasterRancher.new(
        this.paca.address,
        dev,
        "110",
        String(this.startBlock + 500),
        String(this.startBlock + 600),
        // "500",
        // "600",
        false,
        {from: alice}
      );
      await this.paca.transferOwnership(this.ranch.address, {from: alice});
      await this.lp.approve(this.ranch.address, "1000", {from: alice});
      await this.ranch.add("1", this.lp.address, true);
      // Alice deposits 10 LPs at block 590
      await time.advanceBlockTo(this.startBlock + 589);
      await this.ranch.deposit(0, "10", {from: alice});
      // At block 605, she should have 1000*10 + 100*5 = 10500 pending.
      await time.advanceBlockTo(this.startBlock + 605);
      assert.equal((await this.ranch.pendingPaca(0, alice)).valueOf(), "10500");
      // At block 606, Alice withdraws all pending rewards and should get 10600.
      await this.ranch.deposit(0, "0", {from: alice});
      assert.equal((await this.ranch.pendingPaca(0, alice)).valueOf(), "0");
      assert.equal((await this.paca.balanceOf(alice)).valueOf(), "10600");
    });

    it("should allow dev and only dev to update withdrawLock", async () => {
      this.ranch = await MasterRancher.new(
        this.paca.address,
        dev,
        "1000",
        String(this.startBlock + 0),
        String(this.startBlock + 1000),
        // "0",
        // "1000",
        false,
        {from: alice}
      );

      await this.paca.transferOwnership(this.ranch.address, {from: alice});
      await this.lp.approve(this.ranch.address, "1000", {from: alice});
      await this.ranch.add("1", this.lp.address, true);
      
      // Alice deposits 100 LPs
      await this.ranch.deposit(0, "100", {from: alice});
      assert.equal((await this.ranch.userInfo(0, alice))['amount'].toNumber(), 100);
      
      // should work
      await this.ranch.withdraw(0, "50", {from: alice});
      assert.equal((await this.ranch.userInfo(0, alice))['amount'].toNumber(), 50);

      assert.equal((await this.ranch.withdrawLock()).valueOf(), false);
      await expectRevert(this.ranch.emergencySetWithdrawLock(true, {from: bob}), "dev: wut?");
      await this.ranch.emergencySetWithdrawLock(true, {from: dev});
      assert.equal((await this.ranch.withdrawLock()).valueOf(), true);

      await expectRevert(this.ranch.withdraw(0, "50", {from: alice}), "withdrawals not allowed, pls wait for migration");
    });
  });
});
