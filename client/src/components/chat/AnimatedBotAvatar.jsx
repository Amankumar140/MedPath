import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function AnimatedBotAvatar({ className = "", isStreaming = false }) {
  const shouldReduceMotion = useReducedMotion();

  // Floating container
  const floatVariants = {
    animate: {
      y: shouldReduceMotion ? 0 : [0, -3, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Rotating outer ring
  const rotateVariants = {
    animate: {
      rotate: shouldReduceMotion ? 0 : 360,
      transition: {
        duration: 10,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  // Pulsing glow aura
  const glowVariants = {
    animate: {
      scale: shouldReduceMotion ? 1 : [1, 1.06, 1],
      opacity: [0.3, 0.5, 0.3],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      variants={floatVariants}
      animate="animate"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative w-9 h-9 flex-shrink-0 flex items-center justify-center select-none ${className}`}
    >
      {/* 1. Pulsing Outer Glow */}
      <motion.div
        variants={glowVariants}
        animate="animate"
        className="absolute inset-0 rounded-xl bg-primary/20 blur-sm"
      />

      {/* 2. Rotating Ring (only dashed outline rotates, not internal icon) */}
      <motion.div
        variants={rotateVariants}
        animate="animate"
        className="absolute -inset-1 rounded-xl border border-dashed border-primary/45 pointer-events-none"
      />

      {/* 3. Core Bot Circle */}
      <div className="absolute inset-0 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md relative z-10">
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          robot_2
        </span>
        {/* Soft gloss layer */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* 4. Active streaming green dot */}
      {isStreaming && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 z-20">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success border border-surface"></span>
        </span>
      )}
    </motion.div>
  );
}

export default AnimatedBotAvatar;
