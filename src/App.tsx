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
  const [storyDetails, setStoryDetails] = useState<any | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  
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

  const handleFetchDetails = async () => {
    if (!jiraId) {
      setError("Please enter a Jira ID first");
      return;
    }

    setFetchingDetails(true);
    setError(null);
    setStoryDetails(null);

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
      const data = await res.json();
      setStoryDetails(data);
      // Auto-fill project and version if available
      if (data.project) setProjectName(data.project);
      if (data.version && data.version !== "N/A") setFixVersion(data.version);
    } catch (err: any) {
      setError(err.message || "Failed to fetch story details");
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (designBy === "Manual Input") {
      if (!manualTitle || !manualDescription || !fixVersion || !projectName) {
        setError("Please fill in all fields for manual input");
        return;
      }
    } else {
      if (!jiraId || !fixVersion || !projectName) {
        setError("Please fill in all fields");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let userStoryData = storyDetails;

      if (designBy === "Manual Input") {
        userStoryData = {
          id: "MANUAL",
          title: manualTitle,
          description: manualDescription,
          acceptanceCriteria: [],
          project: projectName,
          version: fixVersion
        };
      } else if (!userStoryData || userStoryData.id !== jiraId) {
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
        userStoryData = await res.json();
      }

      const generationResult = await generateTestDesign(
        designBy === "Manual Input" ? "MANUAL" : jiraId,
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
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-zinc-600 selection:bg-zinc-200 selection:text-zinc-900 overflow-x-hidden">
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10 transition-all duration-1000"
          style={{ backgroundColor: accentColor }}
        ></div>
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-[0.05] transition-all duration-1000"
          style={{ backgroundColor: accentColor }}
        ></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-0 contrast-150"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 bg-white/70 backdrop-blur-md border-b border-zinc-200 px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-700 rotate-3 hover:rotate-0 shadow-sm"
            style={{ backgroundColor: `${accentColor}05`, borderColor: `${accentColor}20` }}
          >
            <Cpu className="w-6 h-6" style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-serif italic text-zinc-900 tracking-tight">
              Test Cases <span className="text-zinc-400 font-light not-italic">Generator</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></span>
              <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-black">Autonomous Intelligence Suite</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          {view === "results" && (
            <button 
              onClick={() => setView("input")}
              className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400 hover:text-zinc-900 transition-all group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              New Analysis
            </button>
          )}
          <div className="h-8 w-px bg-zinc-200"></div>
          
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase tracking-[0.2em] text-zinc-400 font-black mb-1">Active Mode</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-50 border border-zinc-100">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{genMode}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-200"></div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-[10px] uppercase tracking-widest font-black text-zinc-500 hover:bg-zinc-100 transition-all"
          >
            <Settings className="w-4 h-4" />
            Analyzer Settings
          </button>

          <div className="h-8 w-px bg-zinc-200"></div>
          <div className="flex items-center gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => setAccentColor(color.value)}
                className={cn(
                  "w-4 h-4 rounded-full transition-all hover:scale-125 border-2",
                  accentColor === color.value ? "border-zinc-300 scale-125 shadow-md" : "border-transparent opacity-40 hover:opacity-100"
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
                <div className="bg-white border border-zinc-200 rounded-[2rem] p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-400">Analysis Overview</h3>
                    <div className="px-2 py-1 rounded bg-zinc-50 border border-zinc-100 text-[8px] font-black text-zinc-500 uppercase tracking-widest">Active</div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                          <Zap className="w-4 h-4" style={{ color: accentColor }} />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-zinc-900">Neural Engine</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Utilizing advanced reasoning models to decompose complex requirements into verifiable test protocols.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" style={{ color: accentColor }} />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-zinc-900">Quality Assurance</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Automated edge-case discovery ensures maximum coverage across positive and negative user flows.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50/50 border border-zinc-100 rounded-[2rem] p-8">
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-400 mb-6">System Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-zinc-400">AI Engine</span>
                      <span className="text-emerald-600">Gemini 3.1 Pro</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-zinc-400">Latency</span>
                      <span className="text-zinc-500">~1.2s</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-zinc-400">Security</span>
                      <span className="text-zinc-500">AES-256 Encrypted</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Main Input Form */}
              <div className="lg:col-span-8">
                <div className="bg-white border border-zinc-200 rounded-[3rem] p-12 shadow-xl shadow-zinc-200/50 relative overflow-hidden">
                  <div 
                    className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[150px] opacity-[0.05] transition-colors duration-1000"
                    style={{ backgroundColor: accentColor }}
                  ></div>

                  <div className="relative z-10 mb-12">
                    <h2 className="text-6xl font-serif text-zinc-900 mb-4 tracking-tight leading-tight">
                      Architect Your <br />
                      <span className="italic text-zinc-400 font-light">Test Strategy</span>
                    </h2>
                    <p className="text-zinc-500 text-lg font-light max-w-xl">
                      Leverage advanced neural reasoning to transform user stories into comprehensive, enterprise-grade test suites.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="relative z-10 space-y-12">
                    {/* Methodology Selector */}
                    <div className="space-y-6">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-black block">Analysis Method</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(["Jira ID", "Release Name", "Manual Input"] as DesignBy[]).map((option) => (
                          <button 
                            key={option}
                            type="button"
                            onClick={() => setDesignBy(option)}
                            className={cn(
                              "flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group",
                              designBy === option 
                                ? "bg-zinc-50 text-zinc-900 shadow-sm" 
                                : "bg-transparent border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:text-zinc-600"
                            )}
                            style={{ borderColor: designBy === option ? accentColor : undefined }}
                          >
                            <div className="p-3 rounded-xl bg-white border border-zinc-100 group-hover:border-zinc-200 transition-colors shadow-sm">
                              {option === "Jira ID" && <Search className="w-5 h-5" style={{ color: designBy === option ? accentColor : undefined }} />}
                              {option === "Release Name" && <Layers className="w-5 h-5" style={{ color: designBy === option ? accentColor : undefined }} />}
                              {option === "Manual Input" && <FileText className="w-5 h-5" style={{ color: designBy === option ? accentColor : undefined }} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-widest font-black">{option}</span>
                              <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                {option === "Jira ID" && "Fetch from Atlassian"}
                                {option === "Release Name" && "Bulk Analysis"}
                                {option === "Manual Input" && "Direct Input"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Form Inputs */}
                    <div className="grid grid-cols-1 gap-8">
                      {designBy === "Manual Input" ? (
                        <>
                          <div className="space-y-3">
                            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-black ml-1">Story Title</label>
                            <input 
                              type="text"
                              placeholder="e.g., Implement OAuth2 Authentication Flow"
                              value={manualTitle}
                              onChange={(e) => setManualTitle(e.target.value)}
                              className="w-full px-6 py-5 rounded-2xl border border-zinc-100 bg-zinc-50 text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all text-sm"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-black ml-1">Story Description / Requirements</label>
                            <textarea 
                              placeholder="Paste detailed requirements, acceptance criteria, or user story description here..."
                              value={manualDescription}
                              onChange={(e) => setManualDescription(e.target.value)}
                              className="w-full px-6 py-5 rounded-2xl border border-zinc-100 bg-zinc-50 text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all text-sm min-h-[200px] resize-none"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-3">
                            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-black ml-1">Jira Identifier</label>
                            <div className="flex gap-4">
                              <input 
                                type="text"
                                placeholder="JIRA-925"
                                value={jiraId}
                                onChange={(e) => setJiraId(e.target.value)}
                                className="flex-1 px-6 py-5 rounded-2xl border border-zinc-100 bg-zinc-50 text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all font-mono text-sm"
                              />
                              <button
                                type="button"
                                onClick={handleFetchDetails}
                                disabled={fetchingDetails || !jiraId}
                                className="px-8 py-5 rounded-2xl border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 font-black text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center gap-3 shadow-sm"
                              >
                                {fetchingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Fetch Details
                              </button>
                            </div>
                          </div>

                          {storyDetails && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] uppercase tracking-widest font-black text-zinc-400">Retrieved Story Details</h4>
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">Sync Successful</span>
                              </div>
                              <div className="space-y-2">
                                <p className="text-zinc-900 font-serif italic text-lg">{storyDetails.title}</p>
                                <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">{storyDetails.description}</p>
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4 text-red-600 bg-red-50 p-6 rounded-3xl border border-red-100"
                      >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
                      </motion.div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full h-20 rounded-3xl text-white font-black uppercase tracking-[0.4em] text-xs transition-all flex items-center justify-center gap-4 group relative overflow-hidden shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: accentColor }}
                    >
                      <div className="absolute inset-0 bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
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
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b border-zinc-200 pb-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full bg-zinc-50 border border-zinc-100 text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Analysis Complete</span>
                    <div className="h-px w-12 bg-zinc-100"></div>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">{genMode} Mode</span>
                  </div>
                  <h2 className="text-7xl font-serif text-zinc-900 tracking-tighter leading-none">
                    Intelligence <br />
                    <span className="italic text-zinc-400 font-light">Report</span>
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {[jiraId, projectName, fixVersion].map((meta, i) => (
                      <span key={i} className="flex items-center gap-3 bg-zinc-50 px-5 py-2.5 rounded-2xl border border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-500">
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
                    className="flex items-center gap-4 px-8 py-4 rounded-2xl border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 font-black text-[10px] uppercase tracking-[0.3em] transition-all disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Re-Analyze
                  </button>
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-4 px-8 py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-lg transition-all hover:scale-105 active:scale-95"
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
                  <h3 className="text-[11px] uppercase tracking-[0.5em] font-black text-zinc-400 whitespace-nowrap">Test Scenarios</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result?.scenarios.map((s, i) => (
                    <motion.div 
                      key={s.scenarioId}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="group bg-white border border-zinc-100 p-8 rounded-[2.5rem] hover:border-zinc-200 transition-all flex gap-8 relative overflow-hidden shadow-sm"
                    >
                      <div 
                        className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity duration-700"
                        style={{ backgroundColor: accentColor }}
                      ></div>
                      
                      <div className="flex flex-col items-center justify-center w-20 h-20 bg-zinc-50 rounded-3xl border border-zinc-100 shrink-0 group-hover:border-zinc-200 transition-all">
                        <span className="text-[9px] font-black text-zinc-400 leading-none mb-1 uppercase tracking-widest">ID</span>
                        <span className="text-base font-mono font-bold text-zinc-900">{s.scenarioId}</span>
                      </div>
                      <div className="flex-1 space-y-3 relative z-10">
                        <div className="flex items-center gap-4 flex-wrap">
                          <h4 className="text-xl font-serif text-zinc-900 group-hover:text-zinc-700 transition-colors">{s.scenarioName}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border",
                            s.classification === "Positive" 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                              : "bg-amber-50 border-amber-100 text-amber-600"
                          )}>
                            {s.classification}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-zinc-100 text-zinc-400">
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
                  <h3 className="text-[11px] uppercase tracking-[0.5em] font-black text-zinc-400 whitespace-nowrap">Detailed Protocols</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {result?.testCases.map((tc, i) => (
                    <motion.div 
                      key={tc.testId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white border border-zinc-200 rounded-[3rem] overflow-hidden flex flex-col hover:border-zinc-300 transition-all shadow-md"
                    >
                      <div className="bg-zinc-50 px-10 py-8 border-b border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-xs font-mono font-bold text-zinc-400 shadow-sm">
                            {tc.testId.slice(-3)}
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] block mb-1">{tc.testId}</span>
                            <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">{tc.name}</h4>
                          </div>
                        </div>
                        {tc.automatable === "Y" && (
                          <div 
                            className="flex items-center gap-2 text-[9px] font-black tracking-[0.3em] bg-white px-4 py-2 rounded-full border border-zinc-200"
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
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Execution Protocol</span>
                          </div>
                          <div className="space-y-3 pl-4 border-l border-zinc-100">
                            {Array.isArray(tc.testSteps) ? (
                              tc.testSteps.map((step, idx) => (
                                <div key={idx} className="flex gap-3 text-sm text-zinc-600 leading-relaxed">
                                  <span className="font-mono text-[10px] text-zinc-400 mt-1">{idx + 1}.</span>
                                  <span>{step}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">{tc.testSteps}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Projected Outcome</span>
                          </div>
                          <div className="space-y-3 pl-4 border-l border-zinc-100">
                            {Array.isArray(tc.expectedResult) ? (
                              tc.expectedResult.map((result, idx) => (
                                <div key={idx} className="flex gap-3 text-sm text-zinc-900 font-medium leading-relaxed">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-1 shrink-0" />
                                  <span>{result}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-zinc-900 font-medium leading-relaxed">{tc.expectedResult}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="px-10 py-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                        <div className="flex items-center gap-6">
                          <span>Priority: <span className="text-zinc-600">{tc.priority}</span></span>
                          <span>Status: <span className="text-zinc-600">{tc.automationStatus}</span></span>
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
      
      <footer className="relative z-10 max-w-7xl mx-auto p-12 border-t border-zinc-200 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-black">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <p>© 2026 Test Cases Generator. Neural Engine v4.2</p>
        </div>
        <div className="flex items-center gap-10">
          <span className="hover:text-zinc-600 transition-colors cursor-pointer">Security Protocol</span>
          <span className="hover:text-zinc-600 transition-colors cursor-pointer">AI Ethics</span>
          <span className="hover:text-zinc-600 transition-colors cursor-pointer">Enterprise SLA</span>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
            >
              <div 
                className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-[0.08]"
                style={{ backgroundColor: accentColor }}
              ></div>

              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif italic text-zinc-900">Analyzer & Jira Settings</h3>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-black">Enterprise Configuration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Intelligence Mode */}
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-black block">Intelligence Mode</label>
                  <div className="grid grid-cols-1 gap-3">
                    {(["Normal", "RAG", "Agent"] as GenerationMode[]).map((mode) => (
                      <button 
                        key={mode}
                        type="button"
                        onClick={() => setGenMode(mode)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all group",
                          genMode === mode 
                            ? "bg-zinc-50 text-zinc-900 shadow-sm" 
                            : "bg-transparent border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:text-zinc-600"
                        )}
                        style={{ borderColor: genMode === mode ? accentColor : undefined }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-white border border-zinc-100 group-hover:border-zinc-200 transition-colors shadow-sm">
                            {mode === "Normal" && <Sparkles className="w-4 h-4" style={{ color: genMode === mode ? accentColor : undefined }} />}
                            {mode === "RAG" && <Database className="w-4 h-4" style={{ color: genMode === mode ? accentColor : undefined }} />}
                            {mode === "Agent" && <Cpu className="w-4 h-4" style={{ color: genMode === mode ? accentColor : undefined }} />}
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] uppercase tracking-widest font-black block">{mode}</span>
                            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">
                              {mode === "Normal" && "Standard QA"}
                              {mode === "RAG" && "Context Precision"}
                              {mode === "Agent" && "Autonomous Discovery"}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          "w-2 h-2 rounded-full transition-all duration-500",
                          genMode === mode ? "scale-125 shadow-sm" : "opacity-20"
                        )} style={{ backgroundColor: genMode === mode ? accentColor : 'zinc' }}></div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Release Version</label>
                    <input 
                      type="text"
                      placeholder="v2.4.0"
                      value={fixVersion}
                      onChange={(e) => setFixVersion(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Project Name</label>
                    <input 
                      type="text"
                      placeholder="Project X"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all"
                    />
                  </div>
                </div>

                <div className="h-px bg-zinc-100"></div>

                {/* Jira Config */}
                <div className="space-y-6">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Atlassian Domain</label>
                  <div className="relative group">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                    <input 
                      type="text"
                      placeholder="company.atlassian.net"
                      value={jiraConfig.domain}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, domain: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Authorized Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                    <input 
                      type="email"
                      placeholder="qa-lead@company.com"
                      value={jiraConfig.email}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">API Access Token</label>
                  <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                    <input 
                      type="password"
                      placeholder="••••••••••••••••"
                      value={jiraConfig.apiToken}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[9px] text-zinc-400 leading-relaxed italic max-w-[240px]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <p>Credentials are processed in-memory and never persisted.</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-8 py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: accentColor }}
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
