import { ethers } from "ethers";

const ABI = [
  "function createCapsule(uint256 _unlockTimestamp, string memory _ipfsCID) external",
  "function unlockCapsule(uint256 _id) external",
  "function getCapsule(uint256 _id) external view returns (address, uint256, string memory, bool, uint256)",
  "function capsuleCounter() external view returns (uint256)",
  "event CapsuleCreated(uint256 indexed id, address indexed creator, uint256 unlockTimestamp, string ipfsCID)",
  "event CapsuleUnlocked(uint256 indexed id)"
] as const;

const CONTRACT_ADDRESS = "0xdc055c313DEA1bb48C735DC3A7d79648f1A61D3f";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

async function getProvider(): Promise<ethers.BrowserProvider | ethers.JsonRpcProvider> {
  // If MetaMask is available, use it (for user-signed transactions)
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider(RPC_URL);
}

async function getSigner(): Promise<ethers.Signer> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Please install MetaMask or another Web3 wallet");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  // Sepolia Chain ID in hex: 11155111 = 0xaa36a7
  const SEPOLIA_CHAIN_ID = "0xaa36a7";

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError: any) {
    // Error code 4902 = chain not added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add Sepolia network to MetaMask
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia",
              nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } catch (addError) {
        throw new Error("Could not add Sepolia network to MetaMask. Please add it manually.");
      }
    } else if (switchError.code === 4001 || switchError.message?.includes("rejected")) {
      throw new Error("Network switch rejected by user. Please switch to Sepolia manually in MetaMask.");
    } else {
      throw new Error(`Failed to switch network: ${switchError.message}`);
    }
  }

  return provider.getSigner();
}

export async function createCapsule(unlockTimestamp: number, ipfsCID: string) {
  const signer = await getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  
  // Add explicit gas limit to avoid estimation warnings
  const tx = await contract.createCapsule(unlockTimestamp, ipfsCID, {
    gasLimit: 200000
  });
  
  return await tx.wait(); // Wait for confirmation
}

export async function unlockCapsule(id: number) {
  const signer = await getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  
  const tx = await contract.unlockCapsule(id, {
    gasLimit: 100000
  });
  
  return await tx.wait();
}

export async function getCapsule(id: number): Promise<[string, bigint, string, boolean, bigint]> {
  const provider = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  return await contract.getCapsule(id);
}

export async function getCapsuleCounter(): Promise<number> {
  const provider = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const count = await contract.capsuleCounter();
  return Number(count);
}

export function onCapsuleCreated(callback: (id: number, creator: string, cid: string) => void) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  
  contract.on("CapsuleCreated", (id: bigint, creator: string, _timestamp: bigint, cid: string) => {
    callback(Number(id), creator, cid);
  });
  
  // Return unsubscribe function
  return () => contract.removeAllListeners("CapsuleCreated");
}