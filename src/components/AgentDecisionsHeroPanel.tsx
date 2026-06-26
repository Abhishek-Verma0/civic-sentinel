import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Report } from '../types';
import { 
  Brain, 
  Cpu, 
  GitFork, 
  ShieldAlert, 
  Layers, 
  Send,
  Zap,
  ChevronDown,
  ChevronUp,
  Building2,
  ScrollText
} from 'lucide-react';

interface AgentDecisionsHeroPanelProps {
  report: Report;
  compact?: boolean;
}

export default function AgentDecisionsHeroPanel({ report, compact = false }: AgentDecisionsHeroPanelProps) {
  const { decisionsReasoning, reasoning } = report;
  const [isGrievanceExpanded, setIsGrievanceExpanded] = useState(false);

  // Stagger configurations for child elements
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border-2 border-indigo-500/50 rounded-2xl text-white shadow-xl max-w-full ${
        compact ? 'p-4' : 'p-5 md:p-6'
      }`}
    >
      {/* Decorative active scanning line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/80 shadow-[0_0_15px_#6366f1] animate-pulse"></div>
      
      {/* Background radial soft light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Panel Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-xl bg-indigo-500/30 blur-xs animate-ping"></div>
            <div className="relative bg-indigo-600/30 border border-indigo-500 p-2.5 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-indigo-500 text-indigo-50 font-black px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                Cognitive Core
              </span>
              <span className="text-[10px] text-indigo-300 font-semibold flex items-center gap-0.5">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> Real-time Inference
              </span>
            </div>
            <h4 className="text-sm font-black text-white tracking-wider uppercase mt-0.5">
              Autonomous Agent Decision Matrix
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center font-mono text-[10px] bg-slate-950/80 border border-indigo-500/30 px-3 py-1 rounded-lg text-indigo-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>INFERENCE_ID: {report.id.substring(0, 8)}</span>
        </div>
      </div>

      {/* Main Core Logic Narrative */}
      {reasoning && (
        <motion.div 
          variants={itemVariants}
          className="relative z-10 bg-indigo-950/75 border border-indigo-500/20 p-3.5 rounded-xl mb-5 space-y-1.5"
        >
          <span className="text-[9px] font-black tracking-wider text-indigo-300 uppercase block font-mono">
            Active Reasoning Log
          </span>
          <p className="text-xs text-indigo-100 font-medium italic leading-relaxed">
            "{reasoning}"
          </p>
        </motion.div>
      )}

      {/* 4-Step Decision Breakdown Grid */}
      <div className={`relative z-10 grid gap-4 ${
        compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
      }`}>
        
        {/* Step 1: Jurisdiction */}
        <motion.div 
          variants={itemVariants}
          className="bg-slate-950/60 hover:bg-slate-950/90 transition-colors p-3.5 rounded-xl border border-indigo-500/15 flex gap-3.5 items-start"
        >
          <div className="bg-indigo-950 border border-indigo-500/30 p-2 rounded-lg text-indigo-300 shrink-0 mt-0.5">
            <GitFork className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider font-mono block">
              01. Jurisdiction Routing
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {decisionsReasoning.departmentChoice}
            </p>
          </div>
        </motion.div>

        {/* Step 2: SLA & Risk */}
        <motion.div 
          variants={itemVariants}
          className="bg-slate-950/60 hover:bg-slate-950/90 transition-colors p-3.5 rounded-xl border border-indigo-500/15 flex gap-3.5 items-start"
        >
          <div className="bg-indigo-950 border border-indigo-500/30 p-2 rounded-lg text-indigo-300 shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider font-mono block">
              02. Risk Parameters & SLA
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {decisionsReasoning.prioritySla}
            </p>
          </div>
        </motion.div>

        {/* Step 3: Duplicate Sweeper */}
        <motion.div 
          variants={itemVariants}
          className="bg-slate-950/60 hover:bg-slate-950/90 transition-colors p-3.5 rounded-xl border border-indigo-500/15 flex gap-3.5 items-start"
        >
          <div className="bg-indigo-950 border border-indigo-500/30 p-2 rounded-lg text-indigo-300 shrink-0 mt-0.5">
            <Layers className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider font-mono block">
              03. Proximity Deduplication
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {decisionsReasoning.duplicateCheck}
            </p>
          </div>
        </motion.div>

        {/* Step 4: Routing Dispatch Command */}
        <motion.div 
          variants={itemVariants}
          className="bg-slate-950/60 hover:bg-slate-950/90 transition-colors p-3.5 rounded-xl border border-indigo-500/15 flex gap-3.5 items-start animate-fade-in"
        >
          <div className="bg-indigo-950 border border-indigo-500/30 p-2 rounded-lg text-indigo-300 shrink-0 mt-0.5">
            <Send className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider font-mono block">
              04. Dispatch Execution
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {decisionsReasoning.routingAction || 'Work-order created, crew schedules finalized, and citizen notifications prepared.'}
            </p>
          </div>
        </motion.div>

      </div>

      {/* Indian Civic Grievance Collapsible Panel */}
      {report.municipalGrievance && (
        <motion.div
          variants={itemVariants}
          className="relative z-10 mt-5 border border-indigo-500/20 rounded-xl overflow-hidden bg-slate-950/40"
        >
          {/* Collapsible Trigger Button */}
          <button
            type="button"
            id="btn-toggle-grievance"
            onClick={() => setIsGrievanceExpanded(!isGrievanceExpanded)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-950/70 transition-all focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-950/50 border border-amber-500/30 p-2 rounded-lg text-amber-400 shrink-0">
                <ScrollText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    Official Grievance (auto-generated)
                  </span>
                </div>
                <h5 className="text-xs font-bold text-white tracking-wide uppercase mt-0.5">
                  Indian Civic Corporation Complaint Petition
                </h5>
              </div>
            </div>
            <div className="text-indigo-300 hover:text-white shrink-0">
              {isGrievanceExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Collapsible Content Area */}
          {isGrievanceExpanded && (
            <div className="p-5 border-t border-indigo-500/20 bg-amber-50/95 border-l-[6px] border-l-amber-600 shadow-inner">
              {/* Decorative Stamp Seal style header for Indian bureaucratic complaints */}
              <div className="flex items-center justify-between border-b border-amber-300/60 pb-3 mb-4 font-sans">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-800 shrink-0" />
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-800 block font-mono">PUBLIC GRIEVANCE PORTAL</span>
                    <span className="text-[9px] font-bold text-slate-700 block">GOVERNMENT OF INDIA • CIVIC DEPT</span>
                  </div>
                </div>
                <div className="text-right font-mono text-[9px] text-amber-900 bg-amber-100 border border-amber-200/60 px-2 py-0.5 rounded font-bold">
                  VERIFIED ATTESTED
                </div>
              </div>

              {/* Render dynamic or fallback markdown grievance petition */}
              {renderGrievanceMarkdown(report.municipalGrievance)}
            </div>
          )}
        </motion.div>
      )}

    </motion.div>
  );
}

// Custom Markdown-to-JSX parser function for the Indian Civic complaint
function renderGrievanceMarkdown(markdown: string) {
  if (!markdown) return null;

  const lines = markdown.split('\n');
  return (
    <div className="space-y-3 font-sans text-slate-800 leading-relaxed text-xs">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal Rule
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={idx} className="border-t border-amber-300/60 my-2" />;
        }

        // H3 Heading (###)
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={idx} className="text-xs font-black text-amber-950 tracking-wide uppercase mt-4 mb-2 flex items-center gap-2 border-b border-amber-300/60 pb-1 font-sans">
              {trimmed.replace('### ', '')}
            </h5>
          );
        }

        // H4 Heading (####)
        if (trimmed.startsWith('#### ')) {
          return (
            <h6 key={idx} className="text-[10px] font-extrabold text-slate-900 uppercase mt-3 mb-1 tracking-wider font-mono">
              {trimmed.replace('#### ', '')}
            </h6>
          );
        }

        // Bullet points with bold text
        if (trimmed.startsWith('- ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 ml-2 my-1">
              <span className="text-amber-700 shrink-0 mt-1.5 font-sans select-none text-[6px]">●</span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {parseBoldText(content)}
              </p>
            </div>
          );
        }

        // General text
        return (
          <p key={idx} className="text-xs text-slate-700 leading-relaxed">
            {parseBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Helper to parse **bold** and *italic* text into React nodes
function parseBoldText(text: string) {
  const parts = [];
  let index = 0;
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > index) {
      parts.push(text.substring(index, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-extrabold text-slate-950">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      );
    }

    index = regex.lastIndex;
  }

  if (index < text.length) {
    parts.push(text.substring(index));
  }

  return parts.length > 0 ? parts : text;
}
