import React from "react";
import ShimmerPlaceholder from "./ShimmerPlaceholder";

export function AISkeleton() {
  return (
    <div className="premium-glass-card rounded-2xl rounded-tl-sm p-5 border border-outline-variant/15 w-full md:w-[480px] lg:w-[520px] shadow-sm space-y-4">
      {/* 3 Title Text Lines */}
      <div className="space-y-2">
        <ShimmerPlaceholder className="h-4 w-[92%] rounded-md" />
        <ShimmerPlaceholder className="h-4 w-[88%] rounded-md" />
        <ShimmerPlaceholder className="h-4 w-[70%] rounded-md" />
      </div>

      {/* 2 Side-by-Side Placeholder Cards */}
      <div className="grid grid-cols-2 gap-3 py-2">
        <ShimmerPlaceholder className="h-20 w-full rounded-xl border border-outline-variant/10 bg-outline-variant/5" />
        <ShimmerPlaceholder className="h-20 w-full rounded-xl border border-outline-variant/10 bg-outline-variant/5" />
      </div>

      {/* 1 Footer Line */}
      <div className="pt-1">
        <ShimmerPlaceholder className="h-3.5 w-[38%] rounded-md" />
      </div>
    </div>
  );
}

export default AISkeleton;
