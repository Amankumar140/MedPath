import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function StreamingCursor() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [1, 0, 1] }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="inline-block w-1.5 h-4 ml-1 bg-gradient-to-b from-secondary to-primary rounded-full align-middle shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]"
      aria-hidden="true"
    />
  );
}

export default StreamingCursor;
