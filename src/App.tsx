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
  ArrowRight,
  Layout,
  Briefcase,
  FileUp,
  Plus,
  Wand2,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateTestDesign } from "./services/gemini";
import { exportToExcel } from "./utils";
import { GenerationResult, DesignBy, JiraConfig, GenerationMode, AIConfig } from "./types";
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import { GoogleGenAI } from "@google/genai";

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
  const [settingsTab, setSettingsTab] = useState<"intelligence" | "jira" | "ai">("intelligence");
  const [customFormat, setCustomFormat] = useState("");
  const [lastSource, setLastSource] = useState<DesignBy>("Jira ID");
  
  // Theme & Jira Config
  const [accentColor, setAccentColor] = useState("#3b82f6"); // Default Blue
  const [jiraConfig, setJiraConfig] = useState<JiraConfig>({
    apiToken: "",
    domain: "",
    email: ""
  });
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: "Gemini",
    geminiKey: "",
    openaiKey: "",
    anthropicKey: "",
    customProviders: []
  });
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderKey, setNewProviderKey] = useState("");
  const [newProviderBase, setNewProviderBase] = useState<"OpenAI" | "Anthropic" | "Gemini">("OpenAI");
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [suggestingFormat, setSuggestingFormat] = useState(false);
  const [suggestedFormats, setSuggestedFormats] = useState<{name: string, content: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleSuggestFormat = async () => {
    setSuggestingFormat(true);
    try {
      const apiKey = aiConfig.geminiKey || process.env.GEMINI_API_KEY || "";
      if (!apiKey) throw new Error("API Key required for suggestions");
      
      const genAI = new GoogleGenAI({ apiKey });
      const model = "gemini-3.1-pro-preview";
      
      const prompt = `Suggest 3 different professional enterprise-grade test case formats in markdown or plain text. 
      Format 1: Standard (ID, Title, Steps, Expected)
      Format 2: Detailed (ID, Objective, Precondition, Steps, Expected, Post-condition, Priority)
      Format 3: Gherkin Style (Feature, Scenario, Given, When, Then)
      
      Return ONLY a JSON array of objects with 'name' and 'content' properties. No other text.`;

      const response = await genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const suggestions = JSON.parse(response.text || "[]");
      setSuggestedFormats(suggestions);
      setShowSuggestions(true);
    } catch (err: any) {
      setError("Failed to suggest formats: " + err.message);
    } finally {
      setSuggestingFormat(false);
    }
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'xlsx' || extension === 'xls') {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_csv(ws);
          setCustomFormat(data);
        };
        reader.readAsBinaryString(file);
      } else if (extension === 'csv') {
        Papa.parse(file, {
          complete: (results) => {
            setCustomFormat(JSON.stringify(results.data, null, 2));
          }
        });
      } else if (extension === 'docx') {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          setCustomFormat(result.value);
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (re) => {
          setCustomFormat(re.target?.result as string);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setError("Failed to parse file. Please try a different format.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const effectiveDesignBy = designBy === "Custom Format" ? lastSource : designBy;
    
    if (effectiveDesignBy === "Manual Input") {
      if (!manualTitle || !manualDescription || !fixVersion || !projectName) {
        setError("Please fill in all fields (Manual Story details + Project/Version)");
        return;
      }
    } else {
      if (!jiraId || !fixVersion || !projectName) {
        setError("Please fill in all fields (Jira ID + Project/Version)");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let userStoryData = storyDetails;

      if (effectiveDesignBy === "Manual Input") {
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
        effectiveDesignBy === "Manual Input" ? "MANUAL" : jiraId,
        fixVersion,
        projectName,
        userStoryData,
        genMode,
        aiConfig,
        customFormat
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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {(["Jira ID", "Release Name", "Manual Input", "Custom Format"] as DesignBy[]).map((option) => (
                          <button 
                            key={option}
                            type="button"
                            onClick={() => {
                              setDesignBy(option);
                              if (option !== "Custom Format") setLastSource(option);
                            }}
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
                              {option === "Custom Format" && <FileUp className="w-5 h-5" style={{ color: designBy === option ? accentColor : undefined }} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-widest font-black">{option}</span>
                              <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                {option === "Jira ID" && "Fetch from Atlassian"}
                                {option === "Release Name" && "Bulk Analysis"}
                                {option === "Manual Input" && "Direct Input"}
                                {option === "Custom Format" && "Output Template"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Form Inputs */}
                    <div className="grid grid-cols-1 gap-8">
                      <AnimatePresence mode="wait">
                        {designBy === "Manual Input" && (
                          <motion.div 
                            key="manual"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                          >
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
                          </motion.div>
                        )}

                        {designBy === "Jira ID" && (
                          <motion.div 
                            key="jira"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                          >
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
                          </motion.div>
                        )}

                        {designBy === "Custom Format" && (
                          <motion.div 
                            key="format"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                          >
                            <div className="space-y-6">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-black ml-1">Output Template / Format</label>
                                  <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Define manual structure or upload existing assets</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleSuggestFormat}
                                    disabled={suggestingFormat}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 shadow-md"
                                  >
                                    {suggestingFormat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                    <span>Suggest Formats</span>
                                  </button>
                                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer hover:border-zinc-300 transition-all shadow-sm">
                                    <FileUp className="w-3.5 h-3.5" />
                                    <span>Upload Asset</span>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept=".txt,.md,.json,.xlsx,.xls,.csv,.docx"
                                      onChange={handleFileUpload}
                                    />
                                  </label>
                                </div>
                              </div>

                              <AnimatePresence>
                                {showSuggestions && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 overflow-hidden"
                                  >
                                    {suggestedFormats.map((f, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          setCustomFormat(f.content);
                                          setShowSuggestions(false);
                                        }}
                                        className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 text-left hover:border-zinc-300 transition-all group"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">{f.name}</span>
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <p className="text-[8px] text-zinc-400 line-clamp-2 font-mono">{f.content}</p>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div className="relative group/textarea">
                                <textarea 
                                  placeholder="Define your custom test case format, fields, or specific instructions..."
                                  value={customFormat}
                                  onChange={(e) => setCustomFormat(e.target.value)}
                                  className="w-full h-80 px-8 py-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all resize-none font-mono leading-relaxed"
                                />
                                <div className="absolute top-6 right-6 flex items-center gap-2">
                                  {customFormat && (
                                    <button 
                                      type="button"
                                      onClick={() => setCustomFormat("")}
                                      className="p-2.5 rounded-xl bg-white border border-zinc-100 text-zinc-400 hover:text-red-500 transition-all shadow-sm"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                
                                <div className="absolute bottom-8 left-8 flex items-center gap-4">
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-100 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Live Editor</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-200" />
                                    <FileJson className="w-3.5 h-3.5 text-zinc-200" />
                                    <FileCode className="w-3.5 h-3.5 text-zinc-200" />
                                  </div>
                                </div>
                              </div>

                              <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex items-start gap-4">
                                <div className="p-2 rounded-xl bg-white border border-emerald-100 shadow-sm">
                                  <Sparkles className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-emerald-900 uppercase tracking-widest font-black">
                                    Neural Alignment Active
                                  </p>
                                  <p className="text-[9px] text-emerald-600/80 font-bold uppercase tracking-widest leading-relaxed">
                                    The AI will strictly adhere to the provided structural constraints. 
                                    All generated test cases will be mapped to your custom schema.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                      <div className="p-0 flex-1">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="pl-10 pr-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 w-20">Step</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Action</th>
                                <th className="px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Expected Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                              {(() => {
                                const steps = Array.isArray(tc.testSteps) ? tc.testSteps : [tc.testSteps];
                                const results = Array.isArray(tc.expectedResult) ? tc.expectedResult : [tc.expectedResult];
                                const rowCount = Math.max(steps.length, results.length);
                                
                                return Array.from({ length: rowCount }).map((_, idx) => (
                                  <tr key={idx} className="group hover:bg-zinc-50/30 transition-colors">
                                    <td className="pl-10 pr-4 py-5 align-top">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-100 text-[10px] font-mono font-bold text-zinc-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        {idx + 1}
                                      </span>
                                    </td>
                                    <td className="px-4 py-5 align-top">
                                      <p className="text-sm text-zinc-600 leading-relaxed max-w-md">
                                        {steps[idx] || "-"}
                                      </p>
                                    </td>
                                    <td className="px-10 py-5 align-top">
                                      <div className="flex gap-3">
                                        {results[idx] && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
                                        <p className={cn(
                                          "text-sm leading-relaxed",
                                          results[idx] ? "text-zinc-900 font-medium" : "text-zinc-400 italic"
                                        )}>
                                          {results[idx] || "No specific outcome defined"}
                                        </p>
                                      </div>
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
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
          <div className="h-4 w-px bg-zinc-200"></div>
          <span className="text-zinc-900 font-black uppercase tracking-widest text-[10px]">devendra singh</span>
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

              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-8 right-8 w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all z-20 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-lg font-serif italic text-zinc-900">Analyzer & Jira Settings</h3>
                  <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-black">Enterprise Configuration</p>
                </div>
              </div>

              {/* Settings Tabs */}
              <div className="flex items-center gap-1 mb-8 p-1 bg-zinc-50 rounded-2xl border border-zinc-100">
                {[
                  { id: "intelligence", label: "Intelligence", icon: Layout },
                  { id: "jira", label: "Jira & Project", icon: Briefcase },
                  { id: "ai", label: "AI Config", icon: Cpu },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      settingsTab === tab.id
                        ? "bg-white text-zinc-900 shadow-sm border border-zinc-100"
                        : "text-zinc-400 hover:text-zinc-600"
                    )}
                    style={{ color: settingsTab === tab.id ? accentColor : undefined }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {settingsTab === "intelligence" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  </div>
                )}

                {settingsTab === "jira" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                      <div className="space-y-2">
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
                  </div>
                )}

                {settingsTab === "ai" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* AI Model Configuration */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Preferred Provider</label>
                          <button 
                            onClick={() => setIsAddingProvider(true)}
                            className="text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            Add Custom
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(["Gemini", "OpenAI", "Anthropic"] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => setAiConfig({ ...aiConfig, provider: p })}
                              className={cn(
                                "py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                aiConfig.provider === p
                                  ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                                  : "bg-zinc-50 text-zinc-400 border-zinc-100 hover:border-zinc-200"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                          {aiConfig.customProviders.map((cp) => (
                            <div key={cp.id} className="relative group/cp">
                              <button
                                onClick={() => setAiConfig({ ...aiConfig, provider: cp.id })}
                                className={cn(
                                  "py-2 px-3 pr-8 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                  aiConfig.provider === cp.id
                                    ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                                    : "bg-zinc-50 text-zinc-400 border-zinc-100 hover:border-zinc-200"
                                )}
                              >
                                {cp.name}
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAiConfig({
                                    ...aiConfig,
                                    provider: aiConfig.provider === cp.id ? "Gemini" : aiConfig.provider,
                                    customProviders: aiConfig.customProviders.filter(p => p.id !== cp.id)
                                  });
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover/cp:opacity-100 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="h-px bg-zinc-100 my-2"></div>

                      <AnimatePresence mode="wait">
                        {aiConfig.provider === "Gemini" && (
                          <motion.div 
                            key="gemini-input"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-2"
                          >
                            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Gemini API Key</label>
                            <div className="relative group">
                              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                              <input 
                                type="password"
                                placeholder="Gemini API Key (Optional Override)"
                                value={aiConfig.geminiKey}
                                onChange={(e) => setAiConfig({ ...aiConfig, geminiKey: e.target.value })}
                                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all"
                              />
                            </div>
                          </motion.div>
                        )}

                        {aiConfig.provider === "OpenAI" && (
                          <motion.div 
                            key="openai-input"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-2"
                          >
                            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">OpenAI (GPT) API Key</label>
                            <div className="relative group">
                              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                              <input 
                                type="password"
                                placeholder="sk-••••••••••••••••"
                                value={aiConfig.openaiKey}
                                onChange={(e) => setAiConfig({ ...aiConfig, openaiKey: e.target.value })}
                                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all"
                              />
                            </div>
                          </motion.div>
                        )}

                        {aiConfig.provider === "Anthropic" && (
                          <motion.div 
                            key="anthropic-input"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-2"
                          >
                            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Anthropic API Key</label>
                            <div className="relative group">
                              <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                              <input 
                                type="password"
                                placeholder="ant-••••••••••••••••"
                                value={aiConfig.anthropicKey}
                                onChange={(e) => setAiConfig({ ...aiConfig, anthropicKey: e.target.value })}
                                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all"
                              />
                            </div>
                          </motion.div>
                        )}

                        {aiConfig.customProviders.find(cp => cp.id === aiConfig.provider) && (
                          <motion.div 
                            key={`custom-${aiConfig.provider}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-2"
                          >
                            <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">
                              {aiConfig.customProviders.find(cp => cp.id === aiConfig.provider)?.name} API Key
                            </label>
                            <div className="relative group">
                              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                              <input 
                                type="password"
                                placeholder="Enter API Key"
                                value={aiConfig.customProviders.find(cp => cp.id === aiConfig.provider)?.apiKey || ""}
                                onChange={(e) => {
                                  const updated = aiConfig.customProviders.map(cp => 
                                    cp.id === aiConfig.provider ? { ...cp, apiKey: e.target.value } : cp
                                  );
                                  setAiConfig({ ...aiConfig, customProviders: updated });
                                }}
                                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 transition-all"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {isAddingProvider && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">New Custom Provider</h4>
                            <button onClick={() => setIsAddingProvider(false)} className="text-zinc-400 hover:text-zinc-900">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold ml-1">Name</label>
                              <input 
                                type="text"
                                placeholder="e.g., My GPT"
                                value={newProviderName}
                                onChange={(e) => setNewProviderName(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-zinc-100 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold ml-1">Base API</label>
                              <select 
                                value={newProviderBase}
                                onChange={(e) => setNewProviderBase(e.target.value as any)}
                                className="w-full px-3 py-2 bg-white border border-zinc-100 rounded-lg text-xs"
                              >
                                <option value="OpenAI">OpenAI Compatible</option>
                                <option value="Anthropic">Anthropic Compatible</option>
                                <option value="Gemini">Gemini Compatible</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold ml-1">API Key</label>
                            <input 
                              type="password"
                              placeholder="sk-••••••••"
                              value={newProviderKey}
                              onChange={(e) => setNewProviderKey(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-zinc-100 rounded-lg text-xs"
                            />
                          </div>
                          <button 
                            onClick={() => {
                              if (!newProviderName || !newProviderKey) return;
                              const id = `custom-${Date.now()}`;
                              setAiConfig({
                                ...aiConfig,
                                provider: id,
                                customProviders: [
                                  ...aiConfig.customProviders,
                                  { id, name: newProviderName, apiKey: newProviderKey, baseProvider: newProviderBase }
                                ]
                              });
                              setNewProviderName("");
                              setNewProviderKey("");
                              setIsAddingProvider(false);
                            }}
                            className="w-full py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                            Add Provider
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
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
