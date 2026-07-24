import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const STAGE_DETAILS = {
  analyzing: {
    title: "Analyzing symptoms",
    description: "Parsing clinical descriptions and identifying key indicators...",
    icon: "psychology",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20"
  },
  understanding: {
    title: "Understanding context",
    description: "Synthesizing symptoms into patient clinical profile...",
    icon: "insights",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20"
  },
  searching: {
    title: "Searching hospitals",
    description: "Locating regional clinics and emergency departments...",
    icon: "search",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10 border-cyan-500/20"
  },
  ranking: {
    title: "Ranking recommendations",
    description: "Ordering options by trust score, cost, and distance...",
    icon: "sort",
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/20"
  },
  preparing: {
    title: "Preparing response",
    description: "Formulating clinical recommendations and layout...",
    icon: "edit_note",
    color: "text-teal-500",
    bg: "bg-teal-500/10 border-teal-500/20"
  },
  completed: {
    title: "Completed",
    description: "Search finalized. Recommendations compiled successfully!",
    icon: "verified",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20"
  }
};

export function ProcessingStageCard({ stage = "analyzing" }) {
  const currentStage = STAGE_DETAILS[stage] || STAGE_DETAILS.analyzing;

  return (
    <div className="w-full max-w-[480px] lg:max-w-[520px] select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className={`flex gap-3.5 p-4 rounded-xl border ${currentStage.bg} shadow-[0_4px_16px_rgba(0,0,0,0.02)]`}
        >
          {/* Active Stage Icon */}
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-outline-variant/10 shadow-sm`}>
              <span className={`material-symbols-outlined text-[18px] font-bold ${currentStage.color}`}>
                {currentStage.icon}
              </span>
            </div>
          </div>

          {/* Title & description */}
          <div className="flex-grow min-w-0">
            <h5 className="font-bold text-sm text-on-surface leading-normal">
              {currentStage.title}
            </h5>
            <p className="text-xs text-on-surface-variant/90 leading-relaxed font-medium mt-0.5 truncate">
              {currentStage.description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default ProcessingStageCard;
