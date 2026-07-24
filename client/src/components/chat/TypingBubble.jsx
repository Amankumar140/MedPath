import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedAIAvatar from "./AnimatedAIAvatar";
import StreamingCursor from "./StreamingCursor";
import { Card, Button, Badge } from "../ui";
import { useNavigate } from "react-router-dom";

export function formatEstimatedCost(costVal) {
  if (!costVal) return "Variable Cost";
  if (typeof costVal === "object") {
    const { min_inr, max_inr, currency = "INR" } = costVal;
    if (min_inr !== undefined && max_inr !== undefined) {
      return `${currency} ${min_inr.toLocaleString()} - ${max_inr.toLocaleString()}`;
    }
    return "Variable Cost";
  }
  try {
    const parsed = JSON.parse(costVal);
    if (parsed && typeof parsed === "object") {
      const { min_inr, max_inr, currency = "INR" } = parsed;
      if (min_inr !== undefined && max_inr !== undefined) {
        return `${currency} ${min_inr.toLocaleString()} - ${max_inr.toLocaleString()}`;
      }
    }
  } catch (e) {
    // Treat as raw text
  }
  if (costVal === "{}" || costVal === "[]" || !costVal) return "Variable Cost";
  return costVal;
}

export function TypingBubble({
  text = "",
  isStreaming = false,
  isLast = false,
  messageType = "TEXT",
  recommendations = [],
  onChipClick,
  conversationId
}) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  // Floating/shimmer overlay variants while streaming
  const shimmerVariants = {
    animate: {
      backgroundPosition: shouldReduceMotion ? "0% 50%" : ["200% 50%", "-200% 50%"],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  return (
    <div className="flex gap-4 w-full max-w-[85%] animate-fade-in justify-start">
      {/* 1. Animated Avatar */}
      <AnimatedAIAvatar isStreaming={isStreaming} className="mt-1" />

      {/* 2. Premium Message Bubble */}
      <motion.div
        animate={{
          boxShadow: isStreaming
            ? "0 4px 20px rgba(15, 98, 254, 0.12), 0 0 0 1px rgba(15, 98, 254, 0.25)"
            : "0 1px 3px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(229, 231, 235, 0.15)"
        }}
        transition={{ duration: 0.5 }}
        className={`rounded-2xl rounded-tl-sm p-4 relative overflow-hidden premium-glass-card text-on-surface w-fit max-w-full ${
          recommendations && recommendations.length > 0 ? "w-full md:w-[480px] lg:w-[520px]" : ""
        }`}
      >
        {/* Subtle Shimmer Background Overlay while streaming */}
        {isStreaming && !shouldReduceMotion && (
          <motion.div
            variants={shimmerVariants}
            animate="animate"
            style={{ backgroundSize: "400% 100%" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-60 pointer-events-none"
          />
        )}

        {/* Response Text */}
        <p className="text-body-md font-body-md whitespace-pre-wrap leading-relaxed relative z-10">
          {text}
          {isStreaming && <StreamingCursor />}
        </p>



        {/* Inline Recommendations (rendered only when complete) */}
        {!isStreaming && recommendations && recommendations.length > 0 && (
          <div className="mt-4 space-y-3 w-full max-w-full animate-fade-in relative z-10" role="region" aria-label="Hospital recommendations">
            <div className="flex items-center gap-1.5 border-b border-outline-variant/15 pb-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-secondary">local_hospital</span>
              <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Recommended Healthcare Facilities</p>
            </div>
            {recommendations.map((hosp, i) => (
              <Card
                key={hosp.id || i}
                variant="lowest"
                hoverLift
                className="p-4 border border-outline-variant/20 flex flex-col gap-2.5 hover:border-outline-variant/35"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-fixed w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
                      {hosp.rankingPosition}
                    </span>
                    <h5 className="font-bold text-sm text-primary dark:text-primary-fixed leading-tight truncate">
                      {hosp.hospitalName}
                    </h5>
                  </div>
                  <Badge variant="secondary">
                    {Math.round((hosp.confidenceScore > 1 ? hosp.confidenceScore / 100 : hosp.confidenceScore) * 100)}% Match
                  </Badge>
                </div>
                <p className="text-xs text-on-surface-variant/90 line-clamp-2 leading-relaxed font-medium">
                  {hosp.reason}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-outline-variant/10">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/10">
                      <span className="material-symbols-outlined text-[13px] text-secondary">route</span>
                      {hosp.distance && hosp.distance !== 'Unknown' ? hosp.distance : 'Nearby'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/10">
                      <span className="material-symbols-outlined text-[13px] text-primary">payments</span>
                      {formatEstimatedCost(hosp.estimatedCost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => navigate('/reviews/wizard', {
                        state: {
                          conversationId: conversationId,
                          recommendationSnapshotId: hosp.id,
                          hospitalName: hosp.hospitalName,
                          estimatedCost: hosp.estimatedCost
                        }
                      })}
                      className="text-primary hover:text-secondary font-bold transition-colors cursor-pointer hover:underline text-xs flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">rate_review</span>
                      Review
                    </button>
                    <button
                      onClick={() => navigate(`/hospitals/${hosp.id || hosp.hospitalName}`, { state: { hospital: hosp } })}
                      className="text-secondary hover:text-primary font-bold transition-colors cursor-pointer hover:underline text-xs flex items-center gap-0.5"
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default TypingBubble;
