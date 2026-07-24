import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedAIAvatar from "./AnimatedAIAvatar";
import ProgressTimeline from "./ProgressTimeline";

const STAGE_CONFIGS = {
  1: { text: "🧠 Understanding your symptoms...", timelineStage: 1 },
  2: { text: "🔎 Searching nearby hospitals...", timelineStage: 2 },
  3: { text: "📊 Comparing hospitals...", timelineStage: 3 },
  4: { text: "🤖 Preparing personalized recommendations...", timelineStage: 4 }
};

export function AIThinkingIndicator({ statusText = "", className = "" }) {
  const [stage, setStage] = useState(1);

  // 1. Map backend status messages to stages
  useEffect(() => {
    if (!statusText) return;
    const lowerStatus = statusText.toLowerCase();

    if (
      lowerStatus.includes("initializing") ||
      lowerStatus.includes("parsing") ||
      lowerStatus.includes("triage") ||
      lowerStatus.includes("language")
    ) {
      setStage(prev => Math.max(prev, 1));
    } else if (
      lowerStatus.includes("complete") ||
      lowerStatus.includes("indexing") ||
      lowerStatus.includes("tavily") ||
      lowerStatus.includes("querying")
    ) {
      setStage(prev => Math.max(prev, 2));
    } else if (
      lowerStatus.includes("compiling") ||
      lowerStatus.includes("scraped") ||
      lowerStatus.includes("decision") ||
      lowerStatus.includes("matrices")
    ) {
      setStage(prev => Math.max(prev, 3));
    } else if (
      lowerStatus.includes("ranking") ||
      lowerStatus.includes("personal") ||
      lowerStatus.includes("hospitals")
    ) {
      setStage(prev => Math.max(prev, 4));
    }
  }, [statusText]);

  // 2. Fallback temporal progression to ensure a rich, conversational experience even during cold starts
  useEffect(() => {
    const timers = [];

    // Stage 1 -> 2 fallback after 1.5 seconds
    timers.push(
      setTimeout(() => {
        setStage(prev => Math.max(prev, 2));
      }, 1500)
    );

    // Stage 2 -> 3 fallback after 3.5 seconds
    timers.push(
      setTimeout(() => {
        setStage(prev => Math.max(prev, 3));
      }, 3500)
    );

    // Stage 3 -> 4 fallback after 5.5 seconds
    timers.push(
      setTimeout(() => {
        setStage(prev => Math.max(prev, 4));
      }, 5500)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  const currentConfig = STAGE_CONFIGS[stage] || STAGE_CONFIGS[1];

  return (
    <div className={`flex gap-4 max-w-[85%] animate-fade-in ${className}`}>
      {/* 1. Animated Avatar */}
      <AnimatedAIAvatar isStreaming={false} className="mt-1" />

      {/* 2. Chat Bubble Container */}
      <div className="premium-glass-card rounded-2xl rounded-tl-sm p-5 text-on-surface shadow-lg border border-outline-variant/15 w-full md:w-[480px]">
        {/* Thinking Status Text with smooth slide-up/fade crossfade */}
        <div className="h-6 overflow-hidden relative mb-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={stage}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-body-md font-bold text-on-surface-variant flex items-center gap-2"
            >
              {currentConfig.text}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* 3. Horizontal Progress Timeline */}
        <ProgressTimeline currentStage={currentConfig.timelineStage} />

        {/* 4. Growing continuous progress line beneath timeline */}
        <div className="mt-4 w-full h-[3px] bg-outline-variant/10 rounded-full overflow-hidden">
          <motion.div
            animate={{
              x: ["-100%", "100%"]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-1/2 h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

export default AIThinkingIndicator;
