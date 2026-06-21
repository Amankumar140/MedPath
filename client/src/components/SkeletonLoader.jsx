import React from "react";

/**
 * Reusable shimmer skeleton components for loading states.
 */

export function SkeletonPulse({ className = "" }) {
  return (
    <div className={`animate-pulse bg-surface-container-high/60 rounded-xl ${className}`} />
  );
}

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse
          key={i}
          className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = "w-10 h-10", className = "" }) {
  return (
    <SkeletonPulse className={`${size} rounded-full ${className}`} />
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`premium-glass-card rounded-[22px] p-6 space-y-3.5 border border-outline-variant/10 shadow-sm ${className}`}>
      <div className="flex items-center gap-4">
        <SkeletonCircle size="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-3/4" />
          <SkeletonPulse className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonStatCard({ className = "" }) {
  return (
    <div className={`premium-glass-card rounded-[22px] p-5 flex items-center gap-4 border border-outline-variant/10 shadow-sm ${className}`}>
      <SkeletonPulse className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="h-3 w-16" />
        <SkeletonPulse className="h-6 w-10" />
      </div>
    </div>
  );
}

export function SkeletonChatBubble({ isUser = false, className = "" }) {
  return (
    <div className={`flex gap-4 ${isUser ? "ml-auto justify-end" : ""} max-w-[85%] ${className}`}>
      {!isUser && <SkeletonCircle size="w-9 h-9" />}
      <div className={`premium-glass-card rounded-2xl p-4 space-y-2 border border-outline-variant/10 shadow-sm ${isUser ? "rounded-tr-sm w-48" : "rounded-tl-sm w-64"}`}>
        <SkeletonText lines={isUser ? 1 : 3} />
      </div>
    </div>
  );
}

export function SkeletonHospitalCard({ className = "" }) {
  return (
    <div className={`premium-glass-card rounded-[28px] p-6 border border-outline-variant/15 flex flex-col lg:flex-row gap-6 ${className}`}>
      <div className="space-y-4 flex-1">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-7 h-7 rounded-xl" />
          <SkeletonPulse className="h-6 w-48" />
          <SkeletonPulse className="h-5 w-20 rounded-full" />
        </div>
        <SkeletonText lines={2} />
        <div className="flex flex-wrap gap-2.5 pt-1">
          <SkeletonPulse className="h-8.5 w-24 rounded-xl" />
          <SkeletonPulse className="h-8.5 w-32 rounded-xl" />
          <SkeletonPulse className="h-8.5 w-24 rounded-xl" />
        </div>
      </div>
      <div className="w-full lg:w-32 space-y-3 shrink-0 flex flex-col justify-end">
        <SkeletonPulse className="h-10 w-full rounded-xl" />
        <SkeletonPulse className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}


