import React from "react";
import { motion } from "framer-motion";
import ProgressBar from "../ui/ProgressBar";

const STAGES = [
  { key: "planning", label: "Understanding your requirement", desc: "Analyzing reported symptoms and care needs..." },
  { key: "searching", label: "Checking nearby hospitals", desc: "Searching regional healthcare providers and verified registries..." },
  { key: "researching", label: "Comparing specialties & departments", desc: "Verifying matching clinical specialties, ICU, and emergency facilities..." },
  { key: "ranking", label: "Evaluating distance & suitability", desc: "Calculating travel proximity and patient satisfaction benchmarks..." },
  { key: "preparing", label: "Estimating costs & treatment ranges", desc: "Estimating out-of-pocket expenses and insurance compatibility..." },
  { key: "completed", label: "Recommendations ready", desc: "Suitable healthcare options compiled for your review!" }
];

const getActiveStageIndex = (percentage) => {
  if (percentage >= 100) return 5; // Completed
  if (percentage >= 90) return 4;  // Estimating costs
  if (percentage >= 70) return 3;  // Evaluating distance & suitability
  if (percentage >= 40) return 2;  // Comparing specialties
  if (percentage >= 15) return 1;  // Checking nearby hospitals
  return 0;                        // Understanding requirement
};

export function DiscoveryProgressCard({ progress }) {
  const safeProgress = progress || {};
  const percentage = safeProgress.percentage ?? safeProgress.progress ?? 0;
  const activeIndex = getActiveStageIndex(percentage);

  return (
    <div className="flex gap-3 md:gap-4 msg-bubble-ai animate-fade-in my-4" role="region" aria-label="Hospital search progress">
      {/* Hospital search icon avatar */}
      <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs" aria-hidden="true">
        <span className="material-symbols-outlined text-[22px]">local_hospital</span>
      </div>

      {/* Main card */}
      <div className="flex-grow bg-surface rounded-2xl rounded-tl-sm p-5 md:p-6 shadow-xs border border-outline-variant/30 w-full max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-primary dark:text-primary-fixed flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              Finding Suitable Hospitals Near You
            </h4>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {STAGES[activeIndex].label}...
            </p>
          </div>
          <span className="text-base font-bold text-primary dark:text-primary-fixed">
            {Math.round(percentage)}%
          </span>
        </div>

        {/* Progress Bar primitive */}
        <ProgressBar value={percentage} max={100} variant="primary" className="mb-5 h-2" />

        {/* Stages Timeline List */}
        <div className="space-y-3 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-outline-variant/30 -z-10"></div>

          {STAGES.map((stage, idx) => {
            const isFinished = idx < activeIndex;
            const isActive = idx === activeIndex;
            const isPending = idx > activeIndex;

            return (
              <div 
                key={stage.key} 
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isPending ? "opacity-35" : "opacity-100"
                }`}
              >
                {/* Status indicator circle */}
                <div className="flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                    isFinished 
                      ? "bg-tertiary-container border-tertiary text-tertiary font-bold" 
                      : isActive 
                        ? "bg-secondary-container border-secondary text-secondary shadow-xs animate-pulse" 
                        : "bg-surface-container-high border-outline-variant text-outline"
                  }`}>
                    {isFinished ? (
                      <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                    ) : isActive ? (
                      <div className="w-3 h-3 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                    )}
                  </div>
                </div>

                {/* Stage Text */}
                <div className="min-w-0 flex-1">
                  <h5 className={`text-xs font-semibold ${
                    isActive ? "text-primary dark:text-primary-fixed font-bold" : isFinished ? "text-on-surface" : "text-outline"
                  }`}>
                    {stage.label}
                  </h5>
                  {isActive && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-[11px] text-on-surface-variant mt-0.5"
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
