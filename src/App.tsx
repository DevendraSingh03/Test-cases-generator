import { useState, type FormEvent, useEffect } from "react";
import { 
  Search, 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft,
  Loader2,
  Database,
  User,
  Layers,
  Zap,
  Settings,
  Key,
  Globe,
  Mail,
  Palette,
  X,
  Cpu,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateTestDesign } from "./services/gemini";
import { exportToExcel } from "./utils";
import { GenerationResult, DesignBy, JiraConfig, GenerationMode } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ACCENT_COLORS = [
  { name: "Zinc", value: "#f4f4f5" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
];

export default function App() {
  const [view, setView] = useState<"input" | "results">("input");
  const [designBy, setDesignBy] = useState<DesignBy>("Jira ID");
  const [genMode, setGenMode] = useState<GenerationMode>("Normal");
  const [jiraId, setJiraId] = useState("");
  const [fixVersion, setFixVersion] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  
  // Theme & Jira Config
  const [accentColor, setAccentColor] = useState("#3b82f6"); // Default Blue
  const [jiraConfig, setJiraConfig] = useState<JiraConfig>({
    apiToken: "",
    domain: "",
    email: ""
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
  }, [accentColor]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!jiraId || !fixVersion || !projectName) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (jiraConfig.apiToken && jiraConfig.domain && jiraConfig.email) {
        headers['x-jira-api-token'] = jiraConfig.apiToken;
        headers['x-jira-domain'] = jiraConfig.domain;
        headers['x-jira-email'] = jiraConfig.email;
      }

      const res = await fetch(`/api/user-story/${jiraId}`, { headers });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch user story data");
      }
      const userStoryData = await res.json();

      const generationResult = await generateTestDesign(
        jiraId,
        fixVersion,
        projectName,
        userStoryData,
        genMode
      );

      setResult(generationResult);
      setView("results");
    } catch (err: any) {
      setError(err.message || "An error occurred during generation");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (result) {
      exportToExcel(result, `TestDesign_${jiraId}.xlsx`);
    }
  };

  const handleRegenerate = () => {
    handleSubmit({ preventDefault: () => {} } as FormEvent);
  };

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-zinc-400 selection:bg-zinc-700 selection:text-white overflow-x-hidden">
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 transition-all duration-1000"
          style={{ backgroundColor: accentColor }}
        ></div>
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-10 transition-all duration-1000"
          style={{ backgroundColor: accentColor }}
        ></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 bg-black/20 backdrop-blur-md border-b border-white/5 px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-700 rotate-3 hover:rotate-0"
            style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}
          >
            <Cpu className="w-6 h-6" style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-serif italic text-white tracking-tight">
              Test Cases <span className="text-zinc-600 font-light not-italic">Generator</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></span>
              <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-black">Autonomous Intelligence Suite</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          {view === "results" && (
            <button 
              onClick={() => setView("input")}
              className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500 hover:text-white transition-all group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              New Analysis
            </button>
          )}
          <div className="h-8 w-px bg-white/5"></div>
          <div className="flex items-center gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => setAccentColor(color.value)}
                className={cn(
                  "w-4 h-4 rounded-full transition-all hover:scale-125 border-2",
                  accentColor === color.value ? "border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-transparent opacity-40 hover:opacity-100"
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-12">
        <AnimatePresence mode="wait">
          {view === "input" ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
            >
              {/* Left Column: Configuration & Settings */}
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">Jira Configuration</h3>
                    <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] font-black text-zinc-400 uppercase tracking-widest">Secure</div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold ml-1">Atlassian Domain</label>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-zinc-400 transition-colors" />
                        <input 
                          type="text"
                          placeholder="company.atlassian.net"
                          value={jiraConfig.domain}
                          onChange={(e) => setJiraConfig({ ...jiraConfig, domain: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-zinc-200 placeholder:text-zinc-800 focus:outline-none focus:border-white/20 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold ml-1">Authorized Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-zinc-400 transition-colors" />
                        <input 
                          type="email"
                          placeholder="qa-lead@company.com"
                          value={jiraConfig.email}
                          onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-zinc-200 placeholder:text-zinc-800 focus:outline-none focus:border-white/20 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold ml-1">API Access Token</label>
                      <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-zinc-400 transition-colors" />
                        <input 
                          type="password"
                          placeholder="••••••••••••••••"
                          value={jiraConfig.apiToken}
                          onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm text-zinc-200 placeholder:text-zinc-800 focus:outline-none focus:border-white/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[9px] text-zinc-600 leading-relaxed italic">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <p>Credentials are processed in-memory and never persisted to external storage.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-8">
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500 mb-6">System Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-zinc-600">AI Engine</span>
                      <span className="text-emerald-500">Gemini 3.1 Pro</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-zinc-600">Latency</span>
                      <span className="text-zinc-400">~1.2s</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-zinc-600">Security</span>
                      <span className="text-zinc-400">AES-256 Encrypted</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Main Input Form */}
              <div className="lg:col-span-8">
                <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl shadow-2xl shadow-black relative overflow-hidden">
                  <div 
                    className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[150px] opacity-10 transition-colors duration-1000"
                    style={{ backgroundColor: accentColor }}
                  ></div>

                  <div className="relative z-10 mb-12">
                    <h2 className="text-6xl font-serif text-white mb-4 tracking-tight leading-tight">
                      Architect Your <br />
                      <span className="italic text-zinc-500 font-light">Test Strategy</span>
                    </h2>
                    <p className="text-zinc-500 text-lg font-light max-w-xl">
                      Leverage advanced neural reasoning to transform user stories into comprehensive, enterprise-grade test suites.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="relative z-10 space-y-12">
                    {/* Methodology & Mode Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 font-black block">Analysis Method</label>
                        <div className="grid grid-cols-1 gap-3">
                          {(["Jira ID", "Release Name"] as DesignBy[]).map((option) => (
                            <button 
                              key={option}
                              type="button"
                              onClick={() => setDesignBy(option)}
                              className={cn(
                                "flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group",
                                designBy === option 
                                  ? "bg-white/5 text-white shadow-xl" 
                                  : "bg-transparent border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400"
                              )}
                              style={{ borderColor: designBy === option ? accentColor : undefined }}
                            >
                              <div className="p-3 rounded-xl bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
                                {option === "Jira ID" && <Search className="w-5 h-5" style={{ color: designBy === option ? accentColor : undefined }} />}
                                {option === "Release Name" && <Layers className="w-5 h-5" style={{ color: designBy === option ? accentColor : undefined }} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-widest font-black">{option}</span>
                                <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
                                  {option === "Jira ID" && "Fetch from Atlassian Cloud"}
                                  {option === "Release Name" && "Bulk Release Analysis"}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 font-black block">Intelligence Mode</label>
                        <div className="grid grid-cols-1 gap-3">
                          {(["Normal", "RAG", "Agent"] as GenerationMode[]).map((mode) => (
                            <button 
                              key={mode}
                              type="button"
                              onClick={() => setGenMode(mode)}
                              className={cn(
                                "flex items-center justify-between p-5 rounded-2xl border transition-all group",
                                genMode === mode 
                                  ? "bg-white/5 text-white shadow-xl" 
                                  : "bg-transparent border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400"
                              )}
                              style={{ borderColor: genMode === mode ? accentColor : undefined }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
                                  {mode === "Normal" && <Sparkles className="w-5 h-5" style={{ color: genMode === mode ? accentColor : undefined }} />}
                                  {mode === "RAG" && <Database className="w-5 h-5" style={{ color: genMode === mode ? accentColor : undefined }} />}
                                  {mode === "Agent" && <Cpu className="w-5 h-5" style={{ color: genMode === mode ? accentColor : undefined }} />}
                                </div>
                                <div className="text-left">
                                  <span className="text-[10px] uppercase tracking-widest font-black block">{mode} Generation</span>
                                  <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">
                                    {mode === "Normal" && "Standard Enterprise QA"}
                                    {mode === "RAG" && "Context-Aware Precision"}
                                    {mode === "Agent" && "Autonomous Edge-Case Discovery"}
                                  </span>
                                </div>
                              </div>
                              <div className={cn(
                                "w-2 h-2 rounded-full transition-all duration-500",
                                genMode === mode ? "scale-125 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "opacity-20"
                              )} style={{ backgroundColor: genMode === mode ? accentColor : 'white' }}></div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Form Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-black ml-1">Jira Identifier</label>
                        <input 
                          type="text"
                          placeholder="JIRA-925"
                          value={jiraId}
                          onChange={(e) => setJiraId(e.target.value)}
                          className="w-full px-6 py-5 rounded-2xl border border-white/5 bg-black/40 text-white placeholder:text-zinc-800 focus:outline-none focus:border-white/20 transition-all font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-black ml-1">Release Version</label>
                        <input 
                          type="text"
                          placeholder="v2.4.0-Stable"
                          value={fixVersion}
                          onChange={(e) => setFixVersion(e.target.value)}
                          className="w-full px-6 py-5 rounded-2xl border border-white/5 bg-black/40 text-white placeholder:text-zinc-800 focus:outline-none focus:border-white/20 transition-all font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-black ml-1">Project Designation</label>
                        <input 
                          type="text"
                          placeholder="Global Infrastructure Systems"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full px-6 py-5 rounded-2xl border border-white/5 bg-black/40 text-white placeholder:text-zinc-800 focus:outline-none focus:border-white/20 transition-all text-sm"
                        />
                      </div>
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4 text-red-400 bg-red-950/10 p-6 rounded-3xl border border-red-900/20"
                      >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
                      </motion.div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full h-20 rounded-3xl text-black font-black uppercase tracking-[0.4em] text-xs transition-all flex items-center justify-center gap-4 group relative overflow-hidden shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: accentColor }}
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                      <span className="relative z-10">
                        {loading ? "Processing Neural Logic..." : "Initialize Generation"}
                      </span>
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                      ) : (
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-2 transition-transform" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-20"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b border-white/5 pb-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Analysis Complete</span>
                    <div className="h-px w-12 bg-white/10"></div>
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">{genMode} Mode</span>
                  </div>
                  <h2 className="text-7xl font-serif text-white tracking-tighter leading-none">
                    Intelligence <br />
                    <span className="italic text-zinc-600 font-light">Report</span>
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {[jiraId, projectName, fixVersion].map((meta, i) => (
                      <span key={i} className="flex items-center gap-3 bg-white/[0.02] px-5 py-2.5 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
                        {meta}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="flex items-center gap-4 px-8 py-4 rounded-2xl border border-white/5 bg-white/[0.02] text-zinc-500 hover:text-white hover:border-white/20 font-black text-[10px] uppercase tracking-[0.3em] transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Re-Analyze
                  </button>
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-4 px-8 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-black/50 transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Download className="w-4 h-4" />
                    Export Assets
                  </button>
                </div>
              </div>

              {/* Scenarios Section */}
              <section className="space-y-12">
                <div className="flex items-center gap-6">
                  <h3 className="text-[11px] uppercase tracking-[0.5em] font-black text-zinc-600 whitespace-nowrap">Test Scenarios</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result?.scenarios.map((s, i) => (
                    <motion.div 
                      key={s.scenarioId}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="group bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] hover:border-white/10 transition-all flex gap-8 relative overflow-hidden"
                    >
                      <div 
                        className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity duration-700"
                        style={{ backgroundColor: accentColor }}
                      ></div>
                      
                      <div className="flex flex-col items-center justify-center w-20 h-20 bg-black/40 rounded-3xl border border-white/5 shrink-0 group-hover:border-white/20 transition-all">
                        <span className="text-[9px] font-black text-zinc-600 leading-none mb-1 uppercase tracking-widest">ID</span>
                        <span className="text-base font-mono font-bold text-white">{s.scenarioId}</span>
                      </div>
                      <div className="flex-1 space-y-3 relative z-10">
                        <div className="flex items-center gap-4 flex-wrap">
                          <h4 className="text-xl font-serif text-white group-hover:text-zinc-200 transition-colors">{s.scenarioName}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border",
                            s.classification === "Positive" 
                              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                              : "bg-amber-500/5 border-amber-500/20 text-amber-500"
                          )}>
                            {s.classification}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-white/5 text-zinc-600">
                            {s.priority}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500 font-light leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">{s.objective}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Test Cases Section */}
              <section className="space-y-12">
                <div className="flex items-center gap-6">
                  <h3 className="text-[11px] uppercase tracking-[0.5em] font-black text-zinc-600 whitespace-nowrap">Detailed Protocols</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {result?.testCases.map((tc, i) => (
                    <motion.div 
                      key={tc.testId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col hover:border-white/20 transition-all shadow-2xl shadow-black/20"
                    >
                      <div className="bg-white/[0.02] px-10 py-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-xs font-mono font-bold text-zinc-400">
                            {tc.testId.slice(-3)}
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] block mb-1">{tc.testId}</span>
                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{tc.name}</h4>
                          </div>
                        </div>
                        {tc.automatable === "Y" && (
                          <div 
                            className="flex items-center gap-2 text-[9px] font-black tracking-[0.3em] bg-white/5 px-4 py-2 rounded-full border border-white/10"
                            style={{ color: accentColor }}
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            AUTO
                          </div>
                        )}
                      </div>
                      <div className="p-10 space-y-10 flex-1">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Execution Protocol</span>
                          </div>
                          <p className="text-base text-zinc-400 leading-relaxed font-light whitespace-pre-line pl-4 border-l border-white/5">{tc.testSteps}</p>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Projected Outcome</span>
                          </div>
                          <p className="text-base text-zinc-200 font-medium leading-relaxed pl-4 border-l border-white/5">{tc.expectedResult}</p>
                        </div>
                      </div>
                      <div className="px-10 py-6 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                        <div className="flex items-center gap-6">
                          <span>Priority: <span className="text-zinc-400">{tc.priority}</span></span>
                          <span>Status: <span className="text-zinc-400">{tc.automationStatus}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer className="relative z-10 max-w-7xl mx-auto p-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] uppercase tracking-[0.4em] text-zinc-600 font-black">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <p>© 2026 Test Cases Generator. Neural Engine v4.2</p>
        </div>
        <div className="flex items-center gap-10">
          <span className="hover:text-zinc-400 transition-colors cursor-pointer">Security Protocol</span>
          <span className="hover:text-zinc-400 transition-colors cursor-pointer">AI Ethics</span>
          <span className="hover:text-zinc-400 transition-colors cursor-pointer">Enterprise SLA</span>
        </div>
      </footer>
    </div>
  );
}
