import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log(`Deploying with ${deployer.address}`);

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();

  const TradingVault = await hre.ethers.getContractFactory("TradingVault");
  const vault = await TradingVault.deploy(await usdc.getAddress(), deployer.address);
  await vault.waitForDeployment();

  await (await vault.setTradeRecorder(deployer.address)).wait();

  console.log(`MockUSDC=${await usdc.getAddress()}`);
  console.log(`TradingVault=${await vault.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
