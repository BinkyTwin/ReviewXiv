import { useState, useEffect } from 'react';
import { getAudit, getExplanation } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bot, Sparkles, AlertCircle, ChevronRight, Menu } from 'lucide-react';

export default function Reader({ fileId, onBack }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [explanations, setExplanations] = useState({}); // { 0: "explanation text", ... }
    const [explaining, setExplaining] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        loadAudit();
    }, [fileId]);

    const loadAudit = async () => {
        try {
            const audit = await getAudit(fileId);
            setData(audit);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExplain = async () => {
        if (explaining || explanations[activeSectionIndex]) return;

        setExplaining(true);
        const section = data.structure.sections[activeSectionIndex];
        if (!section?.content) {
            setExplaining(false);
            return;
        }

        try {
            const result = await getExplanation(section.content);
            // Clean up markdown code blocks if any (LLM might wrap in ```markdown)
            // For now just raw text
            setExplanations(prev => ({ ...prev, [activeSectionIndex]: result.explanation }));
        } catch (e) {
            console.error(e);
        } finally {
            setExplaining(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-neutral-400 animate-pulse">Analyse du document...</p>
                </div>
            </div>
        );
    }

    if (!data) return <div className="p-10 text-center text-red-400">Erreur de chargement.</div>;

    const currentSection = data.structure.sections[activeSectionIndex];
    const hasExplanation = !!explanations[activeSectionIndex];

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-950">
            {/* Sidebar Navigation */}
            <motion.div
                animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
                className="border-r border-neutral-800 bg-neutral-900/50 backdrop-blur-sm flex-shrink-0 overflow-hidden"
            >
                <div className="w-[280px] h-full flex flex-col">
                    <div className="p-4 border-b border-neutral-800 flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-semibold text-neutral-200 truncate" title={data.metadata.title}>
                            {data.metadata.title}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {data.structure.sections.map((section, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveSectionIndex(idx)}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between group ${idx === activeSectionIndex
                                        ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30'
                                        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${idx === activeSectionIndex ? 'bg-indigo-500/20 text-indigo-300' : 'bg-neutral-800 text-neutral-500'}`}>
                                        {idx + 1}
                                    </span>
                                    <span className="truncate">{section.title || `Section ${idx + 1}`}</span>
                                </div>
                                {idx === activeSectionIndex && <ChevronRight className="w-4 h-4 opacity-50" />}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-neutral-950 relative">
                {/* Top Bar for Main Area */}
                <div className="h-14 border-b border-neutral-800 flex items-center px-4 justify-between bg-neutral-950/80 backdrop-blur z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400">
                            <Menu className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-neutral-500">
                            Page {activeSectionIndex + 1} / {data.structure.sections.length}
                        </span>
                    </div>

                    <div>
                        {!hasExplanation && (
                            <button
                                onClick={handleExplain}
                                disabled={explaining}
                                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                            >
                                {explaining ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Analyse en cours...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Explication IA
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Original Text */}
                    <div className={`flex-1 overflow-y-auto px-8 py-12 transition-all ${hasExplanation ? 'w-1/2 border-r border-neutral-800' : 'w-full max-w-3xl mx-auto'}`}>
                        <h1 className="text-3xl font-bold text-neutral-100 mb-8 font-serif leading-tight">
                            {currentSection.title}
                        </h1>
                        <div className="prose prose-invert prose-lg max-w-none text-neutral-300 leading-relaxed whitespace-pre-wrap font-serif">
                            {currentSection.content}
                        </div>
                    </div>

                    {/* AI Explanation Panel */}
                    <AnimatePresence>
                        {hasExplanation && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "50%", opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="bg-[#0A0A0A] overflow-y-auto border-l border-neutral-800"
                            >
                                <div className="p-8">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-indigo-500/20">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                            <Bot className="w-6 h-6" />
                                        </div>
                                        <span className="font-semibold text-indigo-200">Analyse DeepRead</span>
                                    </div>

                                    <div className="markdown-body text-neutral-300 leading-relaxed space-y-4">
                                        {/* We can use react-markdown here but for MVP just displaying text is fine. Use pre-wrap */}
                                        <div className="whitespace-pre-wrap">{explanations[activeSectionIndex]}</div>
                                    </div>

                                    <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-yellow-500/50 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-yellow-500/50">
                                            L'IA peut faire des erreurs. Vérifiez toujours le texte original à gauche.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
