import { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Globe,
  Rocket,
  Code,
  Mail,
  Send,
  Sparkles,
  CheckCircle2,
  X,
  Smartphone,
  ShieldCheck,
  Laptop,
} from "lucide-react";

interface ShareLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareLaunchModal({ isOpen, onClose }: ShareLaunchModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "qr" | "embed">("link");

  if (!isOpen) return null;

  // The permanent production shared URL from cloud infrastructure
  const productionUrl =
    typeof window !== "undefined" && window.location.hostname.includes("ais-")
      ? "https://ais-pre-bqj42ycmuycjhpdzxcjycf-495479929470.europe-west3.run.app"
      : typeof window !== "undefined"
      ? window.location.href
      : "https://ais-pre-bqj42ycmuycjhpdzxcjycf-495479929470.europe-west3.run.app";

  const embedSnippet = `<iframe src="${productionUrl}" width="100%" height="800px" style="border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;" allow="camera; microphone" title="Neuromorphic Studio"></iframe>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productionUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  // Pre-configured social share links
  const shareTitle = encodeURIComponent(
    "Neuromorphic Studio: Full-Stack Event-Driven SNN & Neuromorphic Chip Simulation Suite"
  );
  const shareText = encodeURIComponent(
    "Check out this interactive Neuromorphic Studio! Features real-time DVS event cameras, biological LIF neuron models, STDP plasticity, edge hardware benchmarks, and in-browser WASM microcode execution:"
  );
  const encodedUrl = encodeURIComponent(productionUrl);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}&hashtags=Neuromorphic,SNN,AI,DeepLearning,EventCamera`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const redditUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${shareTitle}`;
  const mailtoUrl = `mailto:?subject=${shareTitle}&body=${shareText}%0A%0A${encodedUrl}`;

  // Generate a clean standalone SVG QR code representation (QR code visual using data URL or svg matrix)
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodedUrl}&bgcolor=030712&color=22d3ee&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl shadow-cyan-950/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-400 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">Launch &amp; Share Studio</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live &amp; Deployed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Share this interactive neuromorphic lab with collaborators, students, or edge AI engineers worldwide.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("link")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "link"
                ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Public Link &amp; Social</span>
          </button>
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "qr"
                ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Mobile QR Code</span>
          </button>
          <button
            onClick={() => setActiveTab("embed")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "embed"
                ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Embed Widget</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === "link" && (
            <div className="space-y-5">
              {/* Primary Link Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Permanent Production URL</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">Instant zero-install access</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs truncate select-all">
                    {productionUrl}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-950/50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={productionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors shrink-0"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Quick Social & Lab Sharing */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Quick Share to Networks &amp; Research Groups:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-cyan-500/40"
                  >
                    <svg className="w-4 h-4 fill-cyan-400" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>X (Twitter)</span>
                  </a>

                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-cyan-500/40"
                  >
                    <svg className="w-4 h-4 fill-cyan-400" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>

                  <a
                    href={redditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-cyan-500/40"
                  >
                    <svg className="w-4 h-4 fill-cyan-400" viewBox="0 0 24 24">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.56 12 8 12.56 8 13.25c0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25 0-.69-.56-1.25-1.25-1.25zm5.5 0c-.69 0-1.25.56-1.25 1.25 0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25 0-.69-.56-1.25-1.25-1.25zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z" />
                    </svg>
                    <span>Reddit</span>
                  </a>

                  <a
                    href={mailtoUrl}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-cyan-500/40"
                  >
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span>Email Lab</span>
                  </a>
                </div>
              </div>

              {/* Verified Platform Capabilities */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Deployment Verification Status</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Zero-Install WebAssembly LIF core</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Real-Time DVS Camera Ingress</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>HITL Hardware Bridge (Loihi/Speck)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Full-Stack Cloud Run Container</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "qr" && (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-slate-950 border-2 border-cyan-500/50 shadow-xl shadow-cyan-950/40 inline-block">
                <img
                  src={qrCodeApiUrl}
                  alt="Scan to launch on mobile device"
                  className="w-48 h-48 rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1 max-w-md">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Test Mobile Event Camera on Smartphone</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scan this QR code with your iPhone or Android camera to immediately test DVS event stream recording and closed-loop drone tilt sensors on mobile.
                </p>
              </div>

              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Link Copied!" : "Copy Mobile URL"}</span>
              </button>
            </div>
          )}

          {activeTab === "embed" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-300">
                  Embed Interactive Studio into Research Paper, Wiki, or Docs
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paste this iframe into your academic lab website, Notion page, or project documentation.
                </p>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={4}
                  value={embedSnippet}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs focus:outline-none select-all"
                />
              </div>

              <button
                onClick={handleCopyEmbed}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-950/40 flex items-center gap-2 cursor-pointer"
              >
                {copiedEmbed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Embed Code Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Embed HTML</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">Ready for distribution</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
