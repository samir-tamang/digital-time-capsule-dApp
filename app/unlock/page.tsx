"use client";

import { useState } from "react";
import { getCapsule, unlockCapsule } from "@/lib/contract";
import { getFromIPFS } from "@/lib/ipfs";
import { importKey, decryptContent } from "@/lib/crypto";

export default function UnlockPage() {
  const [capsuleId, setCapsuleId] = useState("");
  const [keyHex, setKeyHex] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "decrypting" | "unlocking" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [capsuleInfo, setCapsuleInfo] = useState<{
    creator: string;
    unlockTimestamp: bigint;
    ipfsCID: string;
    isUnlocked: boolean;
    createdAt: bigint;
  } | null>(null);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capsuleId.trim() || !keyHex.trim()) {
      setError("Please enter both Capsule ID and Decryption Key");
      return;
    }

    try {
      setError("");
      setStatus("checking");
      
      const [creator, unlockTimestamp, ipfsCID, isUnlocked, createdAt] = await getCapsule(Number(capsuleId));
      setCapsuleInfo({ creator, unlockTimestamp, ipfsCID, isUnlocked, createdAt });

      const now = BigInt(Math.floor(Date.now() / 1000));
      const canDecrypt = isUnlocked || unlockTimestamp <= now;

      if (canDecrypt) {
        setStatus("decrypting");
        const encryptedBase64 = await getFromIPFS(ipfsCID);
        const cryptoKey = await importKey(keyHex);
        const decrypted = await decryptContent(encryptedBase64, cryptoKey);
        setMessage(decrypted);
        setStatus("success");
      } else {
        setStatus("idle");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Capsule not found or invalid key");
      setStatus("error");
    }
  };

  const handleUnlock = async () => {
    if (!capsuleInfo) return;
    try {
      setStatus("unlocking");
      await unlockCapsule(Number(capsuleId));
      
      setStatus("decrypting");
      const encryptedBase64 = await getFromIPFS(capsuleInfo.ipfsCID);
      const cryptoKey = await importKey(keyHex);
      const decrypted = await decryptContent(encryptedBase64, cryptoKey);
      setMessage(decrypted);
      setStatus("success");
      setCapsuleInfo(prev => prev ? { ...prev, isUnlocked: true } : null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to unlock capsule");
      setStatus("error");
    }
  };

  const unlockDate = capsuleInfo ? new Date(Number(capsuleInfo.unlockTimestamp) * 1000).toLocaleString() : "";
  const isLocked = capsuleInfo ? capsuleInfo.unlockTimestamp > BigInt(Math.floor(Date.now() / 1000)) && !capsuleInfo.isUnlocked : false;

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto fade-in">
        
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-2xl mb-4 shadow-sm">
            🔓
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Unlock Time Capsule
          </h1>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            Enter your Capsule ID and decryption key to reveal the message
          </p>
          <a 
            href="/" 
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            ← Back to Create
          </a>
        </div>

        {/* Form*/}
        <form onSubmit={handleCheck} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-7 space-y-6">
          
          {/* Capsule ID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capsule ID
            </label>
            <input
              type="number"
              value={capsuleId}
              onChange={(e) => setCapsuleId(e.target.value)}
              placeholder="e.g., 3"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl 
                         focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                         transition-all duration-200 placeholder:text-gray-400 
                         disabled:bg-gray-50 disabled:cursor-not-allowed"
              disabled={status !== "idle" && status !== "error"}
            />
          </div>

          {/* Decryption Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decryption Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={keyHex}
                onChange={(e) => setKeyHex(e.target.value)}
                placeholder="Paste your saved hex key..."
                className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-xl 
                           focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                           transition-all duration-200 placeholder:text-gray-400 font-mono text-sm
                           disabled:bg-gray-50 disabled:cursor-not-allowed"
                disabled={status !== "idle" && status !== "error"}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 
                           text-xs font-medium text-gray-600 hover:text-gray-800 
                           bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {showKey ? "🙈 Hide" : "👁️ Show"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              🔐 This key was shown when you created the capsule
            </p>
          </div>

          {/* Status Messages */}
          {status === "checking" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center text-blue-700 font-medium fade-in">
              🔍 Checking blockchain status...
            </div>
          )}
          {status === "decrypting" && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center text-purple-700 font-medium fade-in">
              🔓 Decrypting your message...
            </div>
          )}
          {status === "unlocking" && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center text-orange-700 font-medium fade-in">
              ⛓️  Confirming unlock transaction...
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
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 
                       disabled:bg-gray-300 disabled:cursor-not-allowed 
                       text-white font-semibold rounded-xl shadow-sm hover:shadow-md 
                       transition-all duration-200 active:scale-[0.98] 
                       flex items-center justify-center gap-2"
          >
            {status === "idle" && <>🔍 Check & Decrypt</>}
            {status === "checking" && <>🔍 Checking...</>}
            {status === "decrypting" && <>🔓 Decrypting...</>}
            {status === "unlocking" && <>⛓️  Unlocking...</>}
            {status === "success" && <>✅ Revealed!</>}
            {status === "error" && <>🔄 Try Again</>}
          </button>
        </form>

        {/* Capsule Info Card */}
        {capsuleInfo && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4 fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Created By</p>
                <p className="font-mono text-gray-800 truncate" title={capsuleInfo.creator}>
                  {capsuleInfo.creator}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Unlock Date</p>
                <p className="font-medium text-gray-800">{unlockDate}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-gray-500 mb-1">IPFS CID</p>
                <p className="font-mono text-xs text-gray-600 break-all" title={capsuleInfo.ipfsCID}>
                  {capsuleInfo.ipfsCID}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  capsuleInfo.isUnlocked || !isLocked 
                    ? "bg-green-100 text-green-700" 
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {capsuleInfo.isUnlocked ? "✅ Unlocked" : isLocked ? "🔒 Time-Locked" : "✅ Ready"}
                </span>
              </div>
            </div>

            {/* Time-Locked Warning */}
            {isLocked && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                <p className="text-yellow-800 font-medium mb-2">⏳ This capsule is still time-locked</p>
                <p className="text-sm text-yellow-700 mb-3">
                  Wait until {unlockDate} to decrypt, or force-unlock now.
                </p>
                <button
                  onClick={handleUnlock}
                  disabled={status === "unlocking"}
                  className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 
                             disabled:bg-gray-400 text-white font-medium rounded-lg 
                             transition-colors shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {status === "unlocking" ? "⏳ Unlocking..." : "🔓 Force Unlock Now"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Revealed Message */}
        {status === "success" && message && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4 fade-in">
            <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
              ✨ Message Revealed
            </h3>
            <div className="bg-white p-5 rounded-xl border border-green-100 shadow-inner min-h-[120px]">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                {message}
              </p>
            </div>
            <button
              onClick={() => {
                setCapsuleId("");
                setKeyHex("");
                setMessage("");
                setCapsuleInfo(null);
                setStatus("idle");
                setError("");
                setShowKey(false);
              }}
              className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 
                         text-white font-medium rounded-xl transition-colors 
                         shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Check Another Capsule
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-gray-400">
          <p>Decryption happens entirely in your browser. Keys are never sent to any server.</p>
        </div>
      </div>
    </main>
  );
}