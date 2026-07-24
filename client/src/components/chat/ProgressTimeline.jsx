import React from "react";
import { motion } from "framer-motion";

const STAGES = [
  { label: "Understanding", icon: "psychology", color: "from-blue-500 to-cyan-500" },
  { label: "Researching", icon: "search", color: "from-cyan-500 to-teal-500" },
  { label: "Ranking", icon: "bar_chart", color: "from-teal-500 to-emerald-500" },
  { label: "Response Ready", icon: "check_circle", color: "from-emerald-500 to-green-500" }
];

export function ProgressTimeline({ currentStage = 1 }) {
  return (
    <div className="w-full max-w-xl mx-auto py-4 px-2 select-none" aria-label="Analysis progress timeline">
      <div className="relative flex items-center justify-between w-full">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-outline-variant/25 -translate-y-1/2 z-0" />

        {/* Animated Active Progress Line */}
        <motion.div
          className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 -translate-y-1/2 z-0"
          initial={{ width: "0%" }}
          animate={{
            width: `${((currentStage - 1) / (STAGES.length - 1)) * 100}%`
          }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        />

        {/* Steps/Nodes */}
        {STAGES.map((stage, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum <= currentStage;
          const isCurrent = stepNum === currentStage;

          return (
            <div key={idx} className="relative z-10 flex flex-col items-center gap-1.5">
              {/* Step Orb Node */}
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.15 : 1,
                  backgroundColor: isActive ? "var(--color-surface, #ffffff)" : "var(--color-surface-container, #f3f4f6)",
                  borderColor: isActive ? "var(--color-primary, #0f62fe)" : "var(--color-outline-variant, #e5e7eb)"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-sm relative`}
              >
                {/* Inside Gradient Accent Circle for Active/Current */}
                {isActive && (
                  <motion.div
                    layoutId="activeOrbGlow"
                    className={`absolute inset-0.5 rounded-full bg-gradient-to-tr ${stage.color} opacity-10 blur-[1px]`}
                  />
                )}

                {/* Icons with highlighting colors */}
                <motion.span
                  animate={{
                    color: isActive ? "var(--color-primary, #0f62fe)" : "var(--color-outline, #9ca3af)",
                  }}
                  className="material-symbols-outlined text-[18px] font-semibold"
                >
                  {stage.icon}
                </motion.span>

                {/* Ping glow animation for the active step */}
                {isCurrent && (
                  <span className="absolute -inset-1 rounded-full border-2 border-secondary animate-pulse opacity-50" />
                )}
              </motion.div>

              {/* Label */}
              <motion.span
                animate={{
                  fontWeight: isCurrent ? "700" : "500",
                  color: isActive ? "var(--color-on-surface, #1f2937)" : "var(--color-outline, #9ca3af)"
                }}
                className="text-[10px] sm:text-xs text-center font-medium tracking-wide"
              >
                {stage.label}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressTimeline;
