"use client";

import { useState } from "react";
import { generateKey, encryptContent } from "@/lib/crypto";
import { uploadToIPFS } from "@/lib/ipfs";
import { createCapsule, getCapsuleCounter } from "@/lib/contract";

export default function Home() {
  const [message, setMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [status, setStatus] = useState<"idle" | "encrypting" | "uploading" | "deploying" | "success" | "error">("idle");
  const [result, setResult] = useState<{ txHash?: string; capsuleId?: number; keyHex?: string }>({});
  const [error, setError] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !unlockDate) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setError("");
      setStatus("encrypting");

      const { key, keyHex } = await generateKey();
      const encrypted = await encryptContent(message, key);
      
      setStatus("uploading");
      const filename = `capsule-${Date.now()}.enc`;
      const cid = await uploadToIPFS(encrypted, filename);
      
      setStatus("deploying");
      const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
      const receipt = await createCapsule(unlockTimestamp, cid);
      
      let capsuleId: number | undefined;
      const eventLog = receipt.logs?.find((log: any) => log.args?.id !== undefined);
      capsuleId = eventLog?.args?.id ? Number(eventLog.args.id) : await getCapsuleCounter().catch(() => undefined);
      
      setStatus("success");
      setResult({ txHash: receipt.hash, capsuleId, keyHex });
    } catch (err: any) {
      console.error(err);
      if (err.code === "ACTION_REJECTED" || err.message?.includes("rejected")) {
        setError("⚠️ Transaction cancelled. Try again and click 'Confirm' in MetaMask.");
      } else if (err.message?.includes("Unlock date must be in the future")) {
        setError("⏰ Unlock date must be in the future. Please pick a later time.");
      } else {
        setError(err.message || "Something went wrong");
      }
      setStatus("error");
    }
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto fade-in">
        
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 text-2xl mb-4 shadow-sm">
            🕰️
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Digital Time Capsule
          </h1>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            Encrypt your message, lock it on-chain, unlock it in the future
          </p>
          <a 
            href="/unlock" 
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            🔓 Already have a Capsule ID? Unlock it here →
          </a>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-7 space-y-6">
          
          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Secret Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write something for your future self..."
              className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl 
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
                         transition-all duration-200 placeholder:text-gray-400 
                         resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
              disabled={status !== "idle" && status !== "error"}
            />
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unlock Date & Time
            </label>
            <input
              type="datetime-local"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl 
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
                         transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
              disabled={status !== "idle" && status !== "error"}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            />
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              ⏱️ Must be at least 1 minute in the future
            </p>
          </div>

          {/* Status Messages */}
          {status !== "idle" && status !== "error" && (
            <div className={`p-4 rounded-xl text-center font-medium fade-in ${
              status === "success" 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}>
              {status === "encrypting" && "🔐 Encrypting your message..."}
              {status === "uploading" && "🌐 Uploading to IPFS..."}
              {status === "deploying" && "⛓️  Deploying to blockchain..."}
              {status === "success" && "✅ Capsule created successfully!"}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 fade-in flex items-start gap-2">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status !== "idle" && status !== "error"}
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 
                       disabled:bg-gray-300 disabled:cursor-not-allowed 
                       text-white font-semibold rounded-xl shadow-sm hover:shadow-md 
                       transition-all duration-200 active:scale-[0.98] 
                       flex items-center justify-center gap-2"
          >
            {status === "idle" && <>🔒 Create Time Capsule</>}
            {status === "encrypting" && <>🔐 Encrypting...</>}
            {status === "uploading" && <>🌐 Uploading...</>}
            {status === "deploying" && <>⛓️  Deploying...</>}
            {status === "success" && <>✅ Created!</>}
            {status === "error" && <>🔄 Try Again</>}
          </button>
        </form>

        {/* Success Panel */}
        {status === "success" && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4 fade-in">
            <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
              ✨ Capsule Created Successfully!
            </h3>
            
            <div className="space-y-3 text-sm">
              {/* Capsule ID */}
              {result.capsuleId && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-100">
                  <span className="text-gray-600">Capsule ID</span>
                  <span className="font-mono font-bold text-gray-900 text-lg">{result.capsuleId}</span>
                </div>
              )}
              
              {/* Transaction Link */}
              <div>
                <p className="text-gray-600 mb-1">Transaction</p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 hover:underline font-mono text-xs break-all transition-colors"
                >
                  {result.txHash}
                </a>
                {!result.capsuleId && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    🔍 Find Capsule ID in the "Logs" tab on Etherscan
                  </p>
                )}
              </div>

              {/* Decryption Key - CRITICAL */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800 font-medium mb-2 flex items-center gap-2">
                  ⚠️ SAVE THIS KEY TO DECRYPT LATER
                </p>
                <p className="text-xs text-yellow-700 mb-3">
                  Without this key, your message cannot be decrypted. Store it securely.
                </p>
                <div className="relative">
                  <code className="block bg-white px-3 py-2.5 rounded-lg text-xs font-mono break-all text-gray-800 select-all border border-yellow-100 pr-20">
                    {result.keyHex}
                  </code>
                  <button
                    onClick={() => result.keyHex && copyKey(result.keyHex)}
                    className="absolute top-2 right-2 px-3 py-1.5 text-xs font-medium 
                               bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg 
                               transition-colors shadow-sm active:scale-[0.98]"
                  >
                    {copiedKey ? "✅ Copied!" : "📋 Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setMessage("");
                setUnlockDate("");
                setStatus("idle");
                setResult({});
                setCopiedKey(false);
              }}
              className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 
                         text-white font-medium rounded-xl transition-colors 
                         shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              ➕ Create Another Capsule
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-gray-400">
          <p>Ethereum Sepolia</p>
        </div>
      </div>
    </main>
  );
}