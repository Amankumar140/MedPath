import React from "react";
import { motion } from "framer-motion";
import ProgressBar from "../ui/ProgressBar";
import AnimatedBotAvatar from "./AnimatedBotAvatar";

const STAGES = [
  { key: "planning", label: "Planning", desc: "Formulating regional clinical search queries..." },
  { key: "searching", label: "Searching", desc: "Querying medical databases and clinical registries..." },
  { key: "researching", label: "Researching Hospitals", desc: "Resolving departmental matches and routing details..." },
  { key: "ranking", label: "Ranking Hospitals", desc: "Compiling decision matrices and suitability scores..." },
  { key: "preparing", label: "Preparing Recommendations", desc: "Synthesizing advice and layout payloads..." },
  { key: "completed", label: "Completed", desc: "Hospital search compiled successfully!" }
];

const getActiveStageIndex = (percentage) => {
  if (percentage >= 100) return 5; // Completed
  if (percentage >= 90) return 4;  // Preparing Recommendations
  if (percentage >= 70) return 3;  // Ranking Hospitals
  if (percentage >= 40) return 2;  // Researching Hospitals
  if (percentage >= 15) return 1;  // Searching
  return 0;                        // Planning
};

export function DiscoveryProgressCard({ progress }) {
  const safeProgress = progress || {};
  const percentage = safeProgress.percentage ?? safeProgress.progress ?? 0;
  const currentStageName = safeProgress.current_stage || "Planning";
  const activeIndex = getActiveStageIndex(percentage);

  return (
    <div className="flex gap-4 max-w-[90%] sm:max-w-[85%] animate-fade-in my-4">
      {/* Robot Avatar */}
      <AnimatedBotAvatar isStreaming={false} />

      {/* Main card */}
      <div className="flex-grow bg-surface dark:bg-surface-container rounded-2xl rounded-tl-sm p-6 shadow-xl border border-outline-variant/20 w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-body-md font-bold text-primary dark:text-primary-fixed">
              Regional Department Search
            </h4>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5 animate-pulse">
              {STAGES[activeIndex].label}...
            </p>
          </div>
          <span className="text-headline-sm font-bold text-secondary font-mono">
            {Math.round(percentage)}%
          </span>
        </div>

        {/* Progress Bar primitive */}
        <ProgressBar value={percentage} max={100} variant="secondary" className="mb-6" />

        {/* Stages Timeline List */}
        <div className="space-y-4 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-outline-variant/10 -z-10"></div>

          {STAGES.map((stage, idx) => {
            const isFinished = idx < activeIndex;
            const isActive = idx === activeIndex;
            const isPending = idx > activeIndex;

            return (
              <div 
                key={stage.key} 
                className={`flex gap-4 transition-all duration-300 ${
                  isPending ? "opacity-40" : "opacity-100"
                }`}
              >
                {/* Status indicator circle */}
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                    isFinished 
                      ? "bg-tertiary/10 border-tertiary text-tertiary" 
                      : isActive 
                        ? "bg-secondary/15 border-secondary text-secondary animate-pulse" 
                        : "bg-surface-container border-outline-variant text-outline"
                  }`}>
                    {isFinished ? (
                      <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                    ) : isActive ? (
                      <div className="w-3.5 h-3.5 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                    )}
                  </div>
                </div>

                {/* Stage Text */}
                <div className="min-w-0 flex-1">
                  <h5 className={`text-xs font-bold leading-none ${
                    isActive ? "text-secondary font-semibold" : "text-on-surface"
                  }`}>
                    {stage.label}
                  </h5>
                  {isActive && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-[10px] text-on-surface-variant/90 font-medium mt-1 leading-normal"
                    >
                      {stage.desc}
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DiscoveryProgressCard;
