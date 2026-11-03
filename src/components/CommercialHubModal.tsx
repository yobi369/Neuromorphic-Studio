import { useState, useEffect, type FormEvent, type MouseEvent } from "react";
import { CommercialTier, UserProfile, InvoiceRecord, TeamMember } from "../types";
import {
  Check,
  Shield,
  CreditCard,
  Key,
  FileText,
  Building,
  Sparkles,
  Zap,
  Cpu,
  Lock,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  ArrowRight,
  ShieldCheck,
  Printer,
  ChevronRight,
  BadgeAlert,
  ArrowUpRight,
  Users,
  UserPlus,
  Trash2,
  Clock,
  Mail,
} from "lucide-react";

interface CommercialHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateTier: (newTier: CommercialTier, newLicenseKey?: string) => void;
  initialPlanSelect?: CommercialTier | null;
}

export function CommercialHubModal({
  isOpen,
  onClose,
  userProfile,
  onUpdateTier,
  initialPlanSelect = null,
}: CommercialHubModalProps) {
  const [activeTab, setActiveTab] = useState<"plans" | "license" | "team" | "invoices" | "eula">("plans");
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(userProfile.billingInterval || "month");

  // Invoices & Billing state
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [activeInvoiceModal, setActiveInvoiceModal] = useState<InvoiceRecord | null>(null);

  // Team & Seat Management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"Lead Scientist" | "Neuromorphic Engineer" | "Research Fellow" | "Hardware Architect">("Neuromorphic Engineer");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Enterprise Trial state
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialSuccess, setTrialSuccess] = useState<string | null>(null);

  // License Key Activation state
  const [licenseInput, setLicenseInput] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: string | null;
  }>({ loading: false, error: null, success: null });

  // Interactive Checkout Dialog state
  const [checkoutPlan, setCheckoutPlan] = useState<CommercialTier | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"form" | "authorizing" | "success">("form");
  const [checkoutAuthStage, setCheckoutAuthStage] = useState(1);
  const [checkoutResult, setCheckoutResult] = useState<{
    licenseKey: string;
    invoice: InvoiceRecord;
    message: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Payment Form Inputs
  const [paymentMethod, setPaymentMethod] = useState<"card" | "academic_po" | "corporate_net30">("card");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("889");
  const [cardName, setCardName] = useState(userProfile.name || "Dr. Elena Rostova");
  const [billingZip, setBillingZip] = useState("94305");
  const [billingCountry, setBillingCountry] = useState("United States");
  const [poNumber, setPoNumber] = useState("PO-2026-STANFORD-SNN-81");
  const [institutionGrant, setInstitutionGrant] = useState(userProfile.institution || "Stanford Neuromorphic Lab");
  const [approverEmail, setApproverEmail] = useState(userProfile.email);

  // Downgrade / Cancel Confirmation Modal state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [globalBanner, setGlobalBanner] = useState<string | null>(null);

  // Fetch invoices from backend
  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch("/api/billing/invoices");
      const data = await res.json();
      if (data.invoices) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Fetch Team Members
  const fetchTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch("/api/billing/team");
      const data = await res.json();
      if (data.members) {
        setTeamMembers(data.members);
      }
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleInviteMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch("/api/billing/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (data.success && data.member) {
        setTeamMembers((prev) => [...prev, data.member]);
        setInviteSuccess(`Invitation sent to ${inviteEmail}! Seat provisioned.`);
        setInviteEmail("");
        setInviteName("");
      } else {
        setInviteError(data.error || "Failed to invite member");
      }
    } catch (err: any) {
      setInviteError("Network error: " + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke the seat for ${name}?`)) return;
    try {
      const res = await fetch(`/api/billing/team/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to revoke member:", err);
    }
  };

  const handleStartEnterpriseTrial = async () => {
    setTrialLoading(true);
    setTrialSuccess(null);
    try {
      const res = await fetch("/api/billing/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        onUpdateTier("enterprise", data.licenseKey);
        setTrialSuccess("14-Day Enterprise Trial Activated! Multi-chip clusters and unlimited team seats enabled.");
        fetchInvoices();
        fetchTeamMembers();
      }
    } catch (err) {
      console.error("Trial error:", err);
    } finally {
      setTrialLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
      fetchTeamMembers();
      if (initialPlanSelect && initialPlanSelect !== userProfile.tier) {
        handleOpenCheckout(initialPlanSelect);
      }
    }
  }, [isOpen, initialPlanSelect]);

  if (!isOpen) return null;

  // Pricing Matrix Definition
  const plans = [
    {
      id: "community" as CommercialTier,
      name: "Community Explorer",
      priceMonth: "$0",
      priceYear: "$0",
      billedYearText: "$0 forever",
      badge: "Free Forever",
      description: "Ideal for students and neuromorphic beginners experimenting with core biological models.",
      features: [
        "LIF & Izhikevich 2-variable dynamics sandbox",
        "Synthetic DVS event generator & Poisson rate encoder",
        "Basic 3-layer feedforward SNN simulation",
        "Community STDP learning curve visualizer",
        "Standard Web Audio biophysical action potential clicks",
        "Local experiment saving in browser storage",
      ],
      missing: [
        "Intel Loihi 2 Lava production code export",
        "Hardware-In-The-Loop physical sensor bridge",
        "Multi-seat lab workspaces & centralized project sync",
        "Commercial deployment rights & patent indemnification",
      ],
      isPopular: false,
    },
    {
      id: "pro" as CommercialTier,
      name: "Pro Researcher",
      priceMonth: "$49",
      priceYear: "$39",
      billedYearText: "$468 / year (Save $120)",
      badge: "Most Popular",
      description: "For computational neuroscientists, edge AI engineers, and university research fellows.",
      features: [
        "Everything in Community, plus:",
        "Full Intel Lava (.py) & snnTorch production exporters",
        "Ultra-low-power C++ embedded firmware generators",
        "Standardized ONNX-Spiking graph format export",
        "High-precision Runge-Kutta 4th Order ODE integrators",
        "Real-time Cart-Pole closed-loop reflex physics simulator",
        "Unlimited AI Neuromorphic Architect queries",
        "Full commercial model ownership & zero royalty claims",
      ],
      missing: [
        "Hardware-In-The-Loop (HITL) physical USB/WebSocket bridge",
        "Air-gapped on-premise node-locked deployment",
        "Enterprise 99.9% uptime SLA and priority engineering support",
      ],
      isPopular: true,
    },
    {
      id: "enterprise" as CommercialTier,
      name: "Enterprise Lab & OEM",
      priceMonth: "$299",
      priceYear: "$249",
      billedYearText: "$2,988 / year (Save $600)",
      badge: "Full Hardware Access",
      description: "For semiconductor vendors, defense contractors, robotics OEMs, and funded academic laboratories.",
      features: [
        "Everything in Pro Researcher, plus:",
        "Hardware-In-The-Loop (HITL) physical DVS camera & silicon bridge",
        "Prophesee Metavision & Intel Loihi 2 live WebUSB streaming",
        "Unlimited multi-seat team workspaces & centralized project sync",
        "Air-gapped node-locked license keys for classified/secure labs",
        "White-label OEM export SDK & custom chip profiler integration",
        "Dedicated Neuromorphic Systems Solutions Architect support",
        "Full ITAR / EAR export compliance documentation & 99.9% SLA",
      ],
      missing: [],
      isPopular: false,
    },
  ];

  // Open Checkout for paid tier or prompt downgrade for Community
  const handleOpenCheckout = (planId: CommercialTier) => {
    if (planId === userProfile.tier) return;

    if (planId === "community") {
      setShowCancelConfirm(true);
      return;
    }

    setCheckoutPlan(planId);
    setCheckoutStep("form");
    setCheckoutResult(null);
  };

  const handleAutoFillDemoCard = () => {
    setCardNumber("4242 •••• •••• 4242");
    setCardExpiry("12/28");
    setCardCvc("889");
    setCardName(userProfile.name || "Dr. Elena Rostova");
    setBillingZip("94305");
  };

  const handleExecuteCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;

    setCheckoutStep("authorizing");
    setCheckoutAuthStage(1);

    // Realistic multi-stage verification
    const timer1 = setTimeout(() => setCheckoutAuthStage(2), 700);
    const timer2 = setTimeout(() => setCheckoutAuthStage(3), 1500);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: checkoutPlan,
          interval: billingInterval,
          customerEmail: userProfile.email,
          paymentMethod,
          cardLast4: cardNumber.replace(/\s+/g, "").slice(-4) || "4242",
          billingName: cardName,
        }),
      });

      const data = await res.json();
      clearTimeout(timer1);
      clearTimeout(timer2);

      if (data.success) {
        setCheckoutAuthStage(4);
        setTimeout(() => {
          onUpdateTier(checkoutPlan, data.licenseKey);
          setCheckoutResult({
            licenseKey: data.licenseKey,
            invoice: data.invoice,
            message: data.message,
          });
          setCheckoutStep("success");
          fetchInvoices();
        }, 500);
      } else {
        alert(data.error || "Checkout authorization failed.");
        setCheckoutStep("form");
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      alert("Billing error: " + err.message);
      setCheckoutStep("form");
    }
  };

  const handleCancelSubscription = async () => {
    setIsProcessingCancel(true);
    try {
      const res = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        onUpdateTier("community", "NEURO-FREE-COMMUNITY");
        setShowCancelConfirm(false);
        setGlobalBanner("Your subscription was cancelled. Your account is now on Community Explorer.");
        fetchInvoices();
      }
    } catch (err: any) {
      alert("Error cancelling subscription: " + err.message);
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleSwitchInterval = async (newInterval: "month" | "year") => {
    setBillingInterval(newInterval);
    try {
      await fetch("/api/billing/switch-interval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: userProfile.tier,
          newInterval,
        }),
      });
      setGlobalBanner(`Billing cycle switched to ${newInterval === "year" ? "Annual (20% Savings applied)" : "Monthly"}.`);
      setTimeout(() => setGlobalBanner(null), 4000);
    } catch (e) {}
  };

  const handleVerifyKey = async () => {
    if (!licenseInput.trim()) return;
    setLicenseStatus({ loading: true, error: null, success: null });
    try {
      const res = await fetch("/api/billing/verify-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: licenseInput }),
      });
      const data = await res.json();
      if (data.valid) {
        onUpdateTier(data.tier, licenseInput.trim().toUpperCase());
        setLicenseStatus({
          loading: false,
          error: null,
          success: `Key Verified! Upgraded to ${data.tier.toUpperCase()} (${data.organization || "Commercial License"}). Valid until ${data.expiresAt}.`,
        });
        fetchInvoices();
      } else {
        setLicenseStatus({
          loading: false,
          error: data.error || "Invalid license key",
          success: null,
        });
      }
    } catch (err: any) {
      setLicenseStatus({
        loading: false,
        error: "Network error validating license: " + err.message,
        success: null,
      });
    }
  };

  const generateDemoKey = (tier: "pro" | "enterprise") => {
    const prefix = tier === "enterprise" ? "NEURO-ENT-2026" : "NEURO-PRO-2026";
    const rand = Math.random().toString(16).substring(2, 7).toUpperCase();
    const demoKey = `${prefix}-${rand}-LAB`;
    setLicenseInput(demoKey);
  };

  const copyLicenseToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden my-8">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 px-6 py-4 border-b border-cyan-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-md">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100 tracking-wide">
                  Neuromorphic Studio Commercial Hub
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-semibold">
                  ACTIVE TIER: {userProfile.tier.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Commercial subscriptions, hardware compiler licenses, and academic lab billing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Banner Notification */}
        {globalBanner && (
          <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{globalBanner}</span>
            </div>
            <button
              onClick={() => setGlobalBanner(null)}
              className="text-emerald-400 font-mono hover:underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-900 bg-slate-950">
          <button
            onClick={() => setActiveTab("plans")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === "plans"
                ? "bg-slate-900 border-t-2 border-cyan-400 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Subscription Tiers &amp; Pricing</span>
          </button>
          <button
            onClick={() => setActiveTab("license")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
              activeTab === "license"
                ? "bg-slate-900 border-t-2 border-cyan-400 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>License Key Activation</span>
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
              activeTab === "team"
                ? "bg-slate-900 border-t-2 border-cyan-400 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Lab Team &amp; Seats ({teamMembers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === "invoices"
                ? "bg-slate-900 border-t-2 border-cyan-400 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Billing History &amp; Invoices ({invoices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("eula")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === "eula"
                ? "bg-slate-900 border-t-2 border-cyan-400 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Commercial EULA &amp; IP Rights</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto">
          {/* TAB 1: SUBSCRIPTION PLANS & TIERS */}
          {activeTab === "plans" && (
            <div className="space-y-6">
              {/* Active Plan Management Header */}
              {userProfile.tier !== "community" && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        <span>Current Active Subscription:</span>
                        <span className="text-cyan-300 uppercase font-mono">{userProfile.tier} TIER</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                          Auto-Renew Active
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                        License Key: <span className="text-slate-200">{userProfile.licenseKey}</span> • Next Renewal:{" "}
                        {new Date(userProfile.licenseValidUntil).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSwitchInterval(billingInterval === "month" ? "year" : "month")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-medium text-xs transition-colors"
                    >
                      Switch to {billingInterval === "month" ? "Annual (Save 20%)" : "Monthly"}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 font-medium text-xs transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              )}

              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center gap-3 pb-1">
                <span
                  onClick={() => handleSwitchInterval("month")}
                  className={`text-xs cursor-pointer ${
                    billingInterval === "month" ? "text-cyan-300 font-bold" : "text-slate-400"
                  }`}
                >
                  Monthly Billing
                </span>
                <button
                  onClick={() => handleSwitchInterval(billingInterval === "month" ? "year" : "month")}
                  className="relative w-12 h-6 rounded-full bg-slate-800 p-0.5 transition-colors border border-slate-700 focus:outline-none"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-cyan-400 shadow-md transform transition-transform ${
                      billingInterval === "year" ? "translate-x-6 bg-emerald-400" : "translate-x-0"
                    }`}
                  />
                </button>
                <div
                  onClick={() => handleSwitchInterval("year")}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <span
                    className={`text-xs ${
                      billingInterval === "year" ? "text-emerald-300 font-bold" : "text-slate-400"
                    }`}
                  >
                    Annual Billing
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-[10px] text-emerald-300 font-bold animate-pulse">
                    Save 20%
                  </span>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans.map((plan) => {
                  const isCurrent = userProfile.tier === plan.id;
                  const price = billingInterval === "month" ? plan.priceMonth : plan.priceYear;

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col rounded-2xl p-5 border transition-all ${
                        isCurrent
                          ? "bg-gradient-to-b from-slate-900 to-cyan-950/40 border-cyan-400 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-400"
                          : plan.isPopular
                          ? "bg-slate-900/90 border-cyan-500/70 shadow-lg shadow-cyan-500/5 hover:border-cyan-400"
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {plan.isPopular && !isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow">
                          {plan.badge}
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-slate-100">{plan.name}</h3>
                        {isCurrent && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 min-h-[36px] mb-4">
                        {plan.description}
                      </p>

                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-slate-100 font-mono">
                            {price}
                          </span>
                          {plan.id !== "community" && (
                            <span className="text-xs text-slate-400 font-mono">
                              / {billingInterval === "month" ? "mo" : "mo, billed annually"}
                            </span>
                          )}
                        </div>
                        {plan.id !== "community" && billingInterval === "year" && (
                          <div className="text-[11px] text-emerald-400 font-mono mt-0.5 font-semibold">
                            {plan.billedYearText}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenCheckout(plan.id)}
                        disabled={isCurrent}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all mb-5 cursor-pointer flex items-center justify-center gap-2 ${
                          isCurrent
                            ? "bg-slate-800 text-slate-400 cursor-default border border-slate-700"
                            : plan.isPopular
                            ? "bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-md font-bold"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Current Plan</span>
                          </>
                        ) : plan.id === "community" ? (
                          <span>Downgrade to Community</span>
                        ) : (
                          <>
                            <span>Subscribe to {plan.name}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>

                      <div className="space-y-2.5 text-xs flex-1">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                          Included Capabilities:
                        </div>
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}

                        {plan.missing.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-2">
                            {plan.missing.map((miss, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-slate-500 line-through text-[11px]"
                              >
                                <X className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                                <span>{miss}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Commercial Value Proposition Info */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <Cpu className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">Direct Silicon Compilers</div>
                    <div className="text-slate-400 text-[11px]">
                      Verified outputs for Intel Loihi 2, BrainChip Akida, and SynSense Speck neuromorphic silicon.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">Air-Gapped Lab Operation</div>
                    <div className="text-slate-400 text-[11px]">
                      Deploy without internet connection in air-gapped defense and confidential university labs.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">Zero Model Royalties</div>
                    <div className="text-slate-400 text-[11px]">
                      All generated weights, topologies, and exported microcode belong 100% to your organization.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LICENSE KEY ACTIVATION */}
          {activeTab === "license" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      Activate Commercial or Academic Site License
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enter your node-locked or floating license key issued by your lab administrator
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-300">
                    LICENSE KEY FORMAT: NEURO-[TIER]-[YEAR]-[CODE]-LAB
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={licenseInput}
                      onChange={(e) => setLicenseInput(e.target.value.toUpperCase())}
                      placeholder="e.g. NEURO-ENT-2026-X88F-LAVA99"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={handleVerifyKey}
                      disabled={licenseStatus.loading}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                    >
                      {licenseStatus.loading ? "Verifying..." : "Activate Key"}
                    </button>
                  </div>
                </div>

                {licenseStatus.error && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{licenseStatus.error}</span>
                  </div>
                )}

                {licenseStatus.success && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{licenseStatus.success}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Need an evaluation key for lab grant proposal?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateDemoKey("pro")}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono cursor-pointer"
                    >
                      Generate Pro Demo Key
                    </button>
                    <button
                      onClick={() => generateDemoKey("enterprise")}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-mono cursor-pointer"
                    >
                      Generate Enterprise Demo Key
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Active License Overview */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs font-mono space-y-2">
                <div className="text-slate-400 font-sans font-semibold text-xs mb-2">
                  Active Installation Status:
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>License Identifier:</span>
                  <span className="text-cyan-400">{userProfile.licenseKey || "NEURO-COMMUNITY-FREE"}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Authorized Tier:</span>
                  <span className="text-emerald-400 uppercase font-bold">{userProfile.tier}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Institution / Lab:</span>
                  <span>{userProfile.institution}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Expiration / Renewal Date:</span>
                  <span>{new Date(userProfile.licenseValidUntil).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEAM & SEAT MANAGEMENT */}
          {activeTab === "team" && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header / Summary Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100">Lab Research Team &amp; Seat Allocation</h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase font-semibold">
                        {userProfile.tier === "enterprise"
                          ? "Unlimited Enterprise Seats"
                          : userProfile.tier === "pro"
                          ? `${teamMembers.length} / 10 Allocated`
                          : "1 / 1 Solo Seat"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Manage lab scientists, research fellows, and hardware architects accessing your Neuromorphic Studio workspace.
                    </p>
                  </div>
                </div>

                {userProfile.tier !== "enterprise" && (
                  <button
                    onClick={handleStartEnterpriseTrial}
                    disabled={trialLoading}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/30 flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{trialLoading ? "Activating Evaluation..." : "Start 14-Day Enterprise Trial"}</span>
                  </button>
                )}
              </div>

              {trialSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{trialSuccess}</span>
                </div>
              )}

              {/* Add Member Form */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  <span>Invite New Team Member to Lab Workspace</span>
                </div>

                {inviteError && (
                  <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}
                {inviteSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{inviteSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleInviteMember} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="e.g. Dr. Kwesi Mensah"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="e.g. kmensah@stanford.edu"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Workspace Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e: any) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Lead Scientist">Lead Scientist</option>
                      <option value="Neuromorphic Engineer">Neuromorphic Engineer</option>
                      <option value="Research Fellow">Research Fellow</option>
                      <option value="Hardware Architect">Hardware Architect</option>
                    </select>
                  </div>
                  <div className="sm:col-span-4 flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-950/40 flex items-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{isInviting ? "Provisioning Seat..." : "Invite Member & Assign Seat"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Members List Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
                <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Active Allocated Seats ({teamMembers.length})</span>
                  <button
                    onClick={fetchTeamMembers}
                    className="text-[11px] text-slate-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingTeam ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Name &amp; Role</th>
                        <th className="p-3.5">Email</th>
                        <th className="p-3.5">Added Date</th>
                        <th className="p-3.5">Access Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-100">{member.name}</div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/60 mt-0.5">
                              {member.role}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 text-xs">{member.email}</td>
                          <td className="p-3.5 text-slate-400 font-mono text-xs">{member.addedAt}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active Seat
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {member.email !== userProfile.email ? (
                              <button
                                onClick={() => handleRevokeMember(member.id, member.name)}
                                className="text-rose-400 hover:text-rose-300 hover:underline inline-flex items-center gap-1 font-mono text-xs cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Revoke</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-mono italic">Account Owner</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BILLING HISTORY & INVOICES */}
          {activeTab === "invoices" && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-100 text-sm">Commercial Billing Entity</div>
                  <div className="text-xs text-slate-400">Neuromorphic Systems Lab • Tax ID: US-EIN-8849201</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                    Account in Good Standing
                  </span>
                  <button
                    onClick={fetchInvoices}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                    title="Refresh Invoices"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingInvoices ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/80 text-slate-400 font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Plan / Description</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono text-cyan-400 font-bold">{inv.id}</td>
                        <td className="p-3 text-slate-400">{inv.date}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-200">{inv.description}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Key: {inv.licenseKey}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{inv.paymentMethod}</td>
                        <td className="p-3 font-mono font-bold text-slate-100">{inv.amount}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              inv.status === "paid"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                : "bg-amber-950 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setActiveInvoiceModal(inv)}
                            className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <Printer className="w-3 h-3" /> View / Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: COMMERCIAL EULA & LEGAL */}
          {activeTab === "eula" && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-w-3xl mx-auto">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Commercial Software License &amp; IP Rights Agreement (EULA)
                </h3>
                <p className="text-slate-400">
                  Neuromorphic Studio Pro is commercial proprietary software providing event-driven
                  simulation and silicon compiling for asynchronous bio-inspired processors.
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-semibold text-slate-100">1. Complete Model &amp; Synaptic Weight Ownership</div>
                <p className="text-slate-400">
                  Any spiking neural network architectures, neuron parameterizations, STDP weight tensors,
                  and exported C++/Python scripts synthesized through Neuromorphic Studio belong entirely and
                  exclusively to the licensee. Neuromorphic Studio claims zero patent, copyright, or royalty
                  entitlements over generated intellectual property.
                </p>

                <div className="font-semibold text-slate-100">2. Dual-Use &amp; Export Control (EAR / ITAR)</div>
                <p className="text-slate-400">
                  Neuromorphic computing algorithms are categorized under multilateral dual-use regimes
                  (ECCN 3A504 / 4A003 for neural hardware acceleration). The licensee agrees to comply with all
                  applicable United States, European Union, and multilateral export administration regulations
                  regarding the transfer of neuromorphic microcode to restricted entities.
                </p>

                <div className="font-semibold text-slate-100">3. Air-Gapped Operation &amp; Telemetry Guarantee</div>
                <p className="text-slate-400">
                  Enterprise Lab licensees are permitted to deploy Neuromorphic Studio in completely air-gapped,
                  offline laboratory network perimeters without outbound internet telemetry, phone-home checks,
                  or cloud dependencies.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500 font-mono text-[11px]">
                  Document Ref: NS-EULA-2026.4 • Revision: Approved for Commercial Resale
                </span>
                <button
                  onClick={() => alert("EULA PDF generated and ready for legal counsel review.")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Signed EULA PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>Stripe Commercial Verified Gateway • 256-bit AES Encryption</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* INTERACTIVE CHECKOUT & PAYMENT GATEWAY MODAL OVERLAY */}
      {/* ============================================================ */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="relative w-full max-w-2xl bg-slate-950 border border-cyan-500/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Checkout Header */}
            <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 px-6 py-4 border-b border-cyan-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {checkoutStep === "success"
                      ? "Order Confirmed & Activated"
                      : `Subscribe to ${checkoutPlan === "enterprise" ? "Enterprise Lab & OEM" : "Pro Researcher"}`}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Instant License Delivery</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono">256-Bit SSL Encrypted</span>
                  </div>
                </div>
              </div>
              {checkoutStep !== "authorizing" && (
                <button
                  onClick={() => setCheckoutPlan(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* STEP 1: FORM VIEW */}
            {checkoutStep === "form" && (
              <form onSubmit={handleExecuteCheckout} className="p-6 space-y-5">
                {/* Order Summary Line Item */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-100 text-sm">
                        Neuromorphic Studio: {checkoutPlan.toUpperCase()} SEAT
                      </div>
                      <div className="text-xs text-slate-400">
                        {billingInterval === "year"
                          ? "Annual Plan (Includes 20% savings discount)"
                          : "Monthly Subscription (Cancel anytime)"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-cyan-400">
                        {checkoutPlan === "enterprise"
                          ? billingInterval === "year"
                            ? "$2,988.00"
                            : "$299.00"
                          : billingInterval === "year"
                          ? "$468.00"
                          : "$49.00"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {billingInterval === "year" ? "Billed annually" : "Per month"}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Academic &amp; Research Tax Exemption (0% VAT):</span>
                    <span className="font-mono text-emerald-400">-$0.00</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === "card"
                          ? "bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Credit Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("academic_po")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === "academic_po"
                          ? "bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span>University PO</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("corporate_net30")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === "corporate_net30"
                          ? "bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Net-30 Invoice</span>
                    </button>
                  </div>
                </div>

                {/* Card Inputs */}
                {paymentMethod === "card" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Cardholder Details</span>
                      <button
                        type="button"
                        onClick={handleAutoFillDemoCard}
                        className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3" /> Auto-Fill Demo Card
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Card Number (4242 •••• •••• 4242)"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                          required
                        />
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="CVC"
                          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                          required
                        />
                      </div>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Cardholder Full Name"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Academic PO Inputs */}
                {paymentMethod === "academic_po" && (
                  <div className="space-y-2.5 text-xs">
                    <div className="font-semibold text-slate-300">Academic Grant &amp; Purchase Order Details</div>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="Purchase Order #"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
                      required
                    />
                    <input
                      type="text"
                      value={institutionGrant}
                      onChange={(e) => setInstitutionGrant(e.target.value)}
                      placeholder="University or Grant Agency (e.g. NSF / DARPA)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                      required
                    />
                    <input
                      type="email"
                      value={approverEmail}
                      onChange={(e) => setApproverEmail(e.target.value)}
                      placeholder="Accounts Payable Approver Email"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                      required
                    />
                  </div>
                )}

                {/* Corporate Net-30 Inputs */}
                {paymentMethod === "corporate_net30" && (
                  <div className="space-y-2.5 text-xs">
                    <div className="font-semibold text-slate-300">Corporate Net-30 Procurement Terms</div>
                    <input
                      type="text"
                      defaultValue="Advanced Neuromorphic Robotics Inc."
                      placeholder="Company Name"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                      required
                    />
                    <input
                      type="text"
                      defaultValue="US-EIN-9482012"
                      placeholder="Tax ID / EIN Number"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
                      required
                    />
                    <input
                      type="email"
                      defaultValue="procurement@robotics-edge.com"
                      placeholder="Finance / AP Billing Email"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                      required
                    />
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>
                      Authorize &amp; Activate {checkoutPlan.toUpperCase()}{" "}
                      (
                      {checkoutPlan === "enterprise"
                        ? billingInterval === "year"
                          ? "$2,988.00"
                          : "$299.00"
                        : billingInterval === "year"
                        ? "$468.00"
                        : "$49.00"}
                      )
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[11px] text-center text-slate-500 mt-2">
                    By confirming, you agree to the Neuromorphic Studio Commercial EULA. Immediate node access unlocked.
                  </p>
                </div>
              </form>
            )}

            {/* STEP 2: AUTHORIZING ANIMATION VIEW */}
            {checkoutStep === "authorizing" && (
              <div className="p-10 space-y-6 text-center">
                <div className="relative w-16 h-16 mx-auto">
                  <RefreshCw className="w-16 h-16 text-cyan-400 animate-spin" />
                  <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-slate-100">
                    Processing Commercial Authorization
                  </h4>
                  <p className="text-xs text-slate-400">
                    Connecting to encrypted payment gateway and provisioning neuromorphic node licenses...
                  </p>
                </div>

                {/* Step Indicators */}
                <div className="max-w-md mx-auto space-y-2 text-left text-xs font-mono">
                  <div className={`p-2.5 rounded-lg flex items-center gap-2.5 ${checkoutAuthStage >= 1 ? "bg-cyan-950/60 border border-cyan-500/40 text-cyan-300" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-4 h-4 ${checkoutAuthStage >= 1 ? "text-cyan-400" : "text-slate-600"}`} />
                    <span>1. Validating 256-bit payment credentials &amp; card token...</span>
                  </div>
                  <div className={`p-2.5 rounded-lg flex items-center gap-2.5 ${checkoutAuthStage >= 2 ? "bg-cyan-950/60 border border-cyan-500/40 text-cyan-300" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-4 h-4 ${checkoutAuthStage >= 2 ? "text-cyan-400" : "text-slate-600"}`} />
                    <span>2. Generating cryptographic SNN license token...</span>
                  </div>
                  <div className={`p-2.5 rounded-lg flex items-center gap-2.5 ${checkoutAuthStage >= 3 ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-4 h-4 ${checkoutAuthStage >= 3 ? "text-emerald-400" : "text-slate-600"}`} />
                    <span>3. Allocating dedicated Intel Loihi 2 / Akida compiler node...</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SUCCESS & RECEIPT VIEW */}
            {checkoutStep === "success" && checkoutResult && (
              <div className="p-6 space-y-5">
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-3 text-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">
                      Subscription Activated: Welcome to {checkoutPlan.toUpperCase()}!
                    </h4>
                    <p className="text-xs text-emerald-300/90">
                      Your commercial node license has been issued and immediately applied across your studio.
                    </p>
                  </div>
                </div>

                {/* Issued License Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">CRYPTOGRAPHIC LICENSE KEY</span>
                    <span className="text-emerald-400 font-bold">NODE-LOCKED &amp; VERIFIED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/50 flex items-center justify-between">
                    <span className="font-mono text-cyan-300 font-bold text-sm tracking-wider">
                      {checkoutResult.licenseKey}
                    </span>
                    <button
                      onClick={() => copyLicenseToClipboard(checkoutResult.licenseKey)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Receipt Details */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Number:</span>
                    <span className="text-cyan-400 font-bold">{checkoutResult.invoice.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="text-emerald-400 font-bold">{checkoutResult.invoice.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Period:</span>
                    <span>{billingInterval === "year" ? "Annual (Next renewal: 2027)" : "Monthly"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Instrument:</span>
                    <span>{checkoutResult.invoice.paymentMethod}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCheckoutPlan(null);
                      setActiveInvoiceModal(checkoutResult.invoice);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View &amp; Print Receipt</span>
                  </button>
                  <button
                    onClick={() => {
                      setCheckoutPlan(null);
                      onClose();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Launch {checkoutPlan.toUpperCase()} Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CANCEL SUBSCRIPTION CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border border-rose-500/50 rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <BadgeAlert className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-100">Cancel Subscription?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to downgrade to <strong>Community Explorer</strong>? You will lose access
              to Intel Loihi 2 Lava export, C++ embedded firmware synthesis, and Hardware-In-The-Loop physical device bridges.
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              Existing synthesized models and local project files will remain safely saved on your computer.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Keep My Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessingCancel}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                {isProcessingCancel ? "Processing..." : "Confirm Downgrade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PRINTABLE INVOICE RECEIPT MODAL */}
      {/* ============================================================ */}
      {activeInvoiceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-950 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Tax Invoice &amp; Payment Receipt</h3>
                <span className="text-xs text-cyan-400 font-mono">{activeInvoiceModal.id}</span>
              </div>
              <button
                onClick={() => setActiveInvoiceModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-500 font-mono text-[10px] uppercase">Vendor</div>
                  <div className="font-bold text-slate-200">Neuromorphic Systems Lab LLC</div>
                  <div className="text-slate-400">Silicon Valley Neuromorphic Research Park</div>
                  <div className="text-slate-400 font-mono text-[11px]">EIN: US-8849201</div>
                </div>
                <div>
                  <div className="text-slate-500 font-mono text-[10px] uppercase">Billed To</div>
                  <div className="font-bold text-slate-200">{userProfile.name}</div>
                  <div className="text-slate-400">{userProfile.institution}</div>
                  <div className="text-slate-400">{userProfile.email}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Invoice Date:</span>
                  <span>{activeInvoiceModal.date}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Payment Method:</span>
                  <span>{activeInvoiceModal.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cryptographic License Key:</span>
                  <span className="text-cyan-400 truncate max-w-[240px]">{activeInvoiceModal.licenseKey}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Payment Status:</span>
                  <span className="text-emerald-400 font-bold uppercase">{activeInvoiceModal.status}</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr>
                      <td className="p-2.5">
                        <div className="font-semibold">{activeInvoiceModal.description}</div>
                        <div className="text-slate-500 text-[11px]">Includes commercial compiler deployment rights</div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-100">
                        {activeInvoiceModal.amount}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-900/60 font-mono font-bold border-t border-slate-800 text-slate-200">
                    <tr>
                      <td className="p-2.5 text-right">Total Paid (USD):</td>
                      <td className="p-2.5 text-right text-emerald-400">{activeInvoiceModal.amount}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-500 text-[11px] font-mono">
                Electronic Receipt • Valid without physical signature
              </span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
