import React, { useId } from "react";

/**
 * MedPathLogo — Scalable vector brand mark emblem matching the project design system.
 * Features:
 * - Central medical cross (care / clinical guidance)
 * - Dynamic orbital navigation path (Cyan -> Ocean -> Emerald gradient)
 * - Trajectory waypoint nodes (milestones / routing)
 * - Theme-aware dark slate container
 */
export function MedPathLogo({ size = 40, className = "" }) {
  const id = useId();
  const bgId = `medpath-bg-${id}`;
  const arcId = `medpath-arc-${id}`;
  const crossId = `medpath-cross-${id}`;
  const glowId = `medpath-glow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="MedPath Brand Emblem"
    >
      <defs>
        {/* Background circular badge */}
        <radialGradient id={bgId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0B1120" />
        </radialGradient>

        {/* Dynamic Navigational Path Gradient (Cyan -> Ocean -> Emerald) */}
        <linearGradient id={arcId} x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="45%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Clean central cross fill */}
        <linearGradient id={crossId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Soft luminous glow */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Dark Circular Badge Base */}
      <circle cx="50" cy="50" r="46" fill={`url(#${bgId})`} stroke="#334155" strokeWidth="1.5" />

      {/* Navigational Orbital Arc (Glow underlay) */}
      <path
        d="M 50 18 A 32 32 0 1 0 82 50"
        stroke={`url(#${arcId})`}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.35"
        filter={`url(#${glowId})`}
      />

      {/* Primary Navigational Orbital Arc */}
      <path
        d="M 50 18 A 32 32 0 1 0 82 50"
        stroke={`url(#${arcId})`}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Trajectory Guide Track on the Right */}
      <path
        d="M 82 50 A 32 32 0 0 0 72 27"
        stroke={`url(#${arcId})`}
        strokeWidth="2"
        strokeDasharray="2 3"
        opacity="0.75"
      />

      {/* Waypoint Nodes along the path */}
      {/* Node 1: Cyan waypoint */}
      <circle cx="75" cy="31" r="3.5" fill="#00D2FF" stroke="#0B1120" strokeWidth="1.2" />
      <circle cx="75" cy="31" r="1.4" fill="#FFFFFF" />

      {/* Node 2: Ocean cyan waypoint */}
      <circle cx="82" cy="50" r="4" fill="#0284C7" stroke="#0B1120" strokeWidth="1.2" />
      <circle cx="82" cy="50" r="1.6" fill="#FFFFFF" />

      {/* Node 3: Emerald green waypoint */}
      <circle cx="73" cy="69" r="3.5" fill="#10B981" stroke="#0B1120" strokeWidth="1.2" />
      <circle cx="73" cy="69" r="1.4" fill="#FFFFFF" />

      {/* Central Medical Cross with smooth rounded corners */}
      <g filter={`url(#${glowId})`}>
        <path
          d="
            M 44 31
            C 44 29 45.8 27.5 48 27.5
            L 52 27.5
            C 54.2 27.5 56 29 56 31
            L 56 44
            L 69 44
            C 71 44 72.5 45.8 72.5 48
            L 72.5 52
            C 72.5 54.2 71 56 69 56
            L 56 56
            L 56 69
            C 56 71 54.2 72.5 52 72.5
            L 48 72.5
            C 45.8 72.5 44 71 44 69
            L 44 56
            L 31 56
            C 29 56 27.5 54.2 27.5 52
            L 27.5 48
            C 27.5 45.8 29 44 31 44
            L 44 44
            Z
          "
          fill={`url(#${crossId})`}
        />
      </g>
    </svg>
  );
}

export default MedPathLogo;
