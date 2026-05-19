const { expect } = require("chai");
const hre = require("hardhat");

describe("TradingVault", function () {
  async function deployFixture() {
    const [owner, user, recorder] = await hre.ethers.getSigners();
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const TradingVault = await hre.ethers.getContractFactory("TradingVault");
    const vault = await TradingVault.deploy(await usdc.getAddress(), owner.address);
    await vault.setTradeRecorder(recorder.address);
    await usdc.connect(user).faucet();
    await usdc.connect(user).approve(await vault.getAddress(), hre.ethers.parseUnits("5000", 6));
    return { owner, user, recorder, usdc, vault };
  }

  it("lets users mint, deposit, allocate, and withdraw collateral", async function () {
    const { user, vault } = await deployFixture();
    const amount = hre.ethers.parseUnits("2500", 6);
    const allocation = hre.ethers.parseUnits("1000", 6);

    await expect(vault.connect(user).deposit(amount))
      .to.emit(vault, "Deposited")
      .withArgs(user.address, amount);

    await expect(vault.connect(user).allocate(1, allocation))
      .to.emit(vault, "BotAllocated")
      .withArgs(user.address, 1, allocation);

    expect(await vault.availableBalance(user.address)).to.equal(hre.ethers.parseUnits("1500", 6));
    expect(await vault.botAllocation(user.address, 1)).to.equal(allocation);
  });

  it("records profitable simulated trades on-chain", async function () {
    const { user, recorder, vault } = await deployFixture();
    const amount = hre.ethers.parseUnits("1000", 6);
    const profit = hre.ethers.parseUnits("120", 6);

    await vault.connect(user).deposit(amount);
    await vault.connect(user).allocate(3, amount);

    await expect(vault.connect(recorder).openTrade(user.address, 3, "BTC/USDT", true, amount, 72_000_00000000n))
      .to.emit(vault, "TradeOpened")
      .withArgs(1, user.address, 3, "BTC/USDT", true, amount, 72_000_00000000n);

    await expect(vault.connect(recorder).closeTrade(1, 74_400_00000000n, profit))
      .to.emit(vault, "TradeClosed")
      .withArgs(1, user.address, 3, 74_400_00000000n, profit, true);

    expect(await vault.botAllocation(user.address, 3)).to.equal(amount + profit);
    expect(await vault.getUserTrades(user.address)).to.deep.equal([1n]);
  });

  it("applies losing trade PnL against allocated capital", async function () {
    const { user, recorder, vault } = await deployFixture();
    const amount = hre.ethers.parseUnits("1000", 6);
    const loss = hre.ethers.parseUnits("75", 6);

    await vault.connect(user).deposit(amount);
    await vault.connect(user).allocate(5, amount);
    await vault.connect(recorder).openTrade(user.address, 5, "ETH/USDT", false, amount, 3_600_00000000n);
    await vault.connect(recorder).closeTrade(1, 3_690_00000000n, -loss);

    expect(await vault.botAllocation(user.address, 5)).to.equal(amount - loss);
  });
});
