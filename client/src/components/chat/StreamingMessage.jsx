import React from "react";
import { motion } from "framer-motion";
import AnimatedBotAvatar from "./AnimatedBotAvatar";
import StreamingCursor from "./StreamingCursor";

export function StreamingMessage({ text = "", conversationId }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 23 }}
      className="flex gap-3 md:gap-4 w-full msg-bubble-ai justify-start animate-fade-in"
    >
      {/* 1. Streaming Avatar */}
      <AnimatedBotAvatar isStreaming={true} className="mt-1" />

      {/* 2. Shimmering Glowing Bubble */}
      <motion.div
        animate={{
          boxShadow: "0 4px 20px rgba(15, 98, 254, 0.12), 0 0 0 1px rgba(15, 98, 254, 0.25)"
        }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl rounded-tl-sm p-4 relative overflow-hidden premium-glass-card text-on-surface w-fit max-w-full"
      >
        {/* Subtle shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer pointer-events-none" style={{ backgroundSize: "200% 100%" }} />

        {/* Streamed Text with cursor */}
        <p className="text-body-md font-body-md whitespace-pre-wrap leading-relaxed relative z-10">
          {text}
          <StreamingCursor />
        </p>
      </motion.div>
    </motion.div>
  );
}

export default StreamingMessage;
