import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function ShimmerPlaceholder({ className = "", style = {} }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`relative overflow-hidden bg-outline-variant/10 rounded-lg ${className}`}
      style={{
        ...style,
        transform: "translate3d(0, 0, 0)" // Force GPU acceleration on container
      }}
    >
      {!shouldReduceMotion && (
        <motion.div
          animate={{
            x: ["-100%", "100%"]
          }}
          transition={{
            duration: 1.3,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            transform: "translate3d(0, 0, 0)" // Force GPU acceleration on sliding gradient
          }}
        />
      )}
    </div>
  );
}

export default ShimmerPlaceholder;
