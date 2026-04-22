// Load .env.local EXPLICITLY from the current directory
require('dotenv').config({ path: './.env.local' });
const { ethers } = require("hardhat");

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  
  // Hard validation
  if (!privateKey) {
    console.error("❌ FATAL: PRIVATE_KEY is missing from .env.local");
    console.error("👉 Current directory:", process.cwd());
    console.error("👉 Try running: node test-env.js to debug");
    process.exit(1);
  }

  console.log("🔑 Private key loaded (length:", privateKey.length, ")");

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("🚀 Deploying from:", await wallet.getAddress());
  
  // Check balance
  const balance = await provider.getBalance(wallet.getAddress());
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("⚠️  Warning: 0 ETH. Fund at: https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
    return;
  }

  // Deploy
  const TimeCapsule = await ethers.getContractFactory("TimeCapsule", wallet);
  const contract = await TimeCapsule.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ TimeCapsule deployed to:", address);
  console.log("🔗 Etherscan: https://sepolia.etherscan.io/address/" + address);
}

main().catch((error) => {
  console.error("❌ Deployment error:", error.message);
  process.exitCode = 1;
});