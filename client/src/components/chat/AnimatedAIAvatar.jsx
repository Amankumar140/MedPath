import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function AnimatedAIAvatar({ className = "", isStreaming = false }) {
  const shouldReduceMotion = useReducedMotion();

  // Floating effect variants
  const floatVariants = {
    animate: {
      y: shouldReduceMotion ? 0 : [0, -3, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Outer ring rotation variants
  const rotateVariants = {
    animate: {
      rotate: shouldReduceMotion ? 0 : 360,
      transition: {
        duration: 12,
        repeat: Infinity,
        ease: "linear",
      },
    },
  };

  // Breathing glow/pulse variants
  const pulseVariants = {
    animate: {
      scale: shouldReduceMotion ? 1 : [1, 1.05, 1],
      opacity: [0.85, 1, 0.85],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div
      variants={floatVariants}
      animate="animate"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`relative w-10 h-10 flex-shrink-0 flex items-center justify-center select-none ${className}`}
    >
      {/* 1. Pulsing Outer Glow Aura */}
      <motion.div
        variants={pulseVariants}
        animate="animate"
        className="absolute inset-0 rounded-xl bg-gradient-to-tr from-primary/30 via-secondary/25 to-tertiary/20 blur-md"
      />

      {/* 2. Rotating Outer Ring */}
      <motion.div
        variants={rotateVariants}
        animate="animate"
        className="absolute -inset-1 rounded-xl border border-dashed border-secondary/40 pointer-events-none"
      />

      {/* 3. Gradient Orb Core */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-primary via-secondary to-tertiary shadow-lg flex items-center justify-center overflow-hidden">
        {/* Soft internal gloss effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        
        {/* Medical Cross Icon inside Glowing Circle */}
        <div className="w-5 h-5 rounded-full bg-surface/90 flex items-center justify-center shadow-inner relative z-10">
          <span className="material-symbols-outlined text-[14px] text-primary font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
            add
          </span>
        </div>
      </div>

      {/* 4. Active streaming dot indicator */}
      {isStreaming && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 z-20">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-success border border-surface"></span>
        </span>
      )}
    </motion.div>
  );
}

export default AnimatedAIAvatar;
