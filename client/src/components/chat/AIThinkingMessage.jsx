import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedBotAvatar from "./AnimatedBotAvatar";
import AISkeleton from "./AISkeleton";
import ProcessingStageCard from "./ProcessingStageCard";

const getStageFromStatus = (statusText) => {
  if (!statusText) return "analyzing";
  const text = statusText.toLowerCase();
  
  if (text.includes("parsing") || text.includes("language") || text.includes("analyzing") || text.includes("triage")) {
    return "analyzing";
  }
  if (text.includes("context") || text.includes("understanding") || text.includes("symptom")) {
    return "understanding";
  }
  if (text.includes("complete") || text.includes("tavily") || text.includes("querying") || text.includes("searching") || text.includes("hospital")) {
    return "searching";
  }
  if (text.includes("ranking") || text.includes("comparing") || text.includes("order") || text.includes("score")) {
    return "ranking";
  }
  if (text.includes("recommendations") || text.includes("preparing") || text.includes("response") || text.includes("layout")) {
    return "preparing";
  }
  if (text.includes("done") || text.includes("completed") || text.includes("ready")) {
    return "completed";
  }
  return "analyzing";
};

const HEADER_STATUS = {
  analyzing: "Analyzing symptoms...",
  understanding: "Understanding context...",
  searching: "Searching hospitals...",
  ranking: "Ranking recommendations...",
  preparing: "Preparing response...",
  completed: "Completed"
};

export function AIThinkingMessage({ statusText = "", className = "" }) {
  const activeStage = useMemo(() => getStageFromStatus(statusText), [statusText]);
  const headerText = HEADER_STATUS[activeStage] || "Analyzing symptoms...";

  return (
    <div className={`flex flex-col gap-3 max-w-[90%] sm:max-w-[85%] animate-fade-in ${className}`}>
      
      {/* 1. Header with Avatar and Text Status */}
      <div className="flex items-center gap-3">
        <AnimatedBotAvatar isStreaming={false} />
        
        {/* Fading status header */}
        <div className="h-5 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.span
              key={activeStage}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.35 }}
              className="text-xs font-bold text-primary animate-pulse tracking-wide select-none"
            >
              {headerText}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Main Body with Active Card */}
      <div className="flex flex-col gap-3 pl-12 w-full">
        {/* Live Processing Card */}
        <ProcessingStageCard stage={activeStage} />
      </div>

    </div>
  );
}

export default AIThinkingMessage;
