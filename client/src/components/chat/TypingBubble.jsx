import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedAIAvatar from "./AnimatedAIAvatar";
import StreamingCursor from "./StreamingCursor";
import { Card, Badge } from "../ui";
import { useNavigate } from "react-router-dom";
import { usePatientLocation } from "../../context/LocationContext";
import { getDirectionsUrl, formatTelUrl, parsePhoneNumbers, parseHospitalRating, cleanProsCons, isValidWebUrl, formatDistance } from "../../utils/location.helpers";

export function formatEstimatedCost(costVal) {
  if (!costVal) return null;
  
  // Handle direct objects: { min: 800, max: 3500, currency: "INR" }
  if (typeof costVal === "object") {
    const minVal = costVal.min ?? costVal.min_inr ?? costVal.min_cost ?? costVal.minimum;
    const maxVal = costVal.max ?? costVal.max_inr ?? costVal.max_cost ?? costVal.maximum;
    if (minVal === undefined && maxVal === undefined) return null;
    const currency = costVal.currency || "INR";
    const currSymbol = currency === "INR" ? "₹" : (currency === "USD" ? "$" : `${currency} `);
    if (minVal !== undefined && maxVal !== undefined) {
      return `${currSymbol}${Number(minVal).toLocaleString()} – ${currSymbol}${Number(maxVal).toLocaleString()}`;
    }
    return `From ${currSymbol}${Number(minVal ?? maxVal).toLocaleString()}`;
  }

  // Handle JSON serialized strings
  try {
    const parsed = JSON.parse(costVal);
    if (parsed && typeof parsed === "object") {
      const minVal = parsed.min ?? parsed.min_inr ?? parsed.min_cost ?? parsed.minimum;
      const maxVal = parsed.max ?? parsed.max_inr ?? parsed.max_cost ?? parsed.maximum;
      if (minVal === undefined && maxVal === undefined) return null;
      const currency = parsed.currency || "INR";
      const currSymbol = currency === "INR" ? "₹" : (currency === "USD" ? "$" : `${currency} `);
      if (minVal !== undefined && maxVal !== undefined) {
        return `${currSymbol}${Number(minVal).toLocaleString()} – ${currSymbol}${Number(maxVal).toLocaleString()}`;
      }
      return `From ${currSymbol}${Number(minVal ?? maxVal).toLocaleString()}`;
    }
  } catch {
    // Treat as raw string
  }

  const strVal = String(costVal).trim();
  if (
    !strVal ||
    strVal === "{}" ||
    strVal === "[]" ||
    strVal === "null" ||
    strVal === "undefined" ||
    strVal.toLowerCase() === "variable cost" ||
    strVal.toLowerCase() === "unknown" ||
    strVal.toLowerCase() === "n/a"
  ) {
    return null;
  }
  return strVal;
}

// Convert confidence/match score to human friendly reason badge
function getHumanMatchLabel(score) {
  const norm = score > 1 ? score / 100 : (score ?? 0.85);
  if (norm >= 0.85) return "Best Match";
  if (norm >= 0.70) return "Strong Match";
  if (norm >= 0.50) return "Good Match";
  return "Alternative";
}

export function TypingBubble({
  text,
  isStreaming = false,
  messageType = "TEXT",
  recommendations = null,
  conversationId = null,
}) {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { selectedLocation } = usePatientLocation();

  const isEmergency = text && (
    text.toLowerCase().includes("emergency") ||
    text.toLowerCase().includes("urgent medical attention") ||
    text.toLowerCase().includes("immediately visit an emergency")
  );

  return (
    <div className="flex gap-3 md:gap-4 w-full msg-bubble-ai animate-fade-in" role="article" aria-label="AI message">
      <div className="shrink-0 mt-0.5" aria-hidden="true">
        <AnimatedAIAvatar isStreaming={isStreaming} size="md" />
      </div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="rounded-2xl rounded-tl-sm p-4 md:p-5 shadow-xs border border-outline-variant/30 transition-all bg-surface text-on-surface max-w-2xl flex-1 overflow-hidden"
      >
        {/* Header tag */}
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-outline-variant/20">
          <span className="text-xs font-bold text-primary dark:text-primary-fixed flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" aria-hidden="true"></span>
            MedPath Healthcare Assistant
          </span>
          <span className="text-[11px] text-outline font-medium">
            Decision Support
          </span>
        </div>

        {/* Emergency Alert Banner if urgency detected */}
        {isEmergency && (
          <div className="mb-3.5 bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-xs text-red-900 dark:text-red-200 flex items-start gap-2.5" role="alert">
            <span className="material-symbols-outlined text-[20px] text-red-600 shrink-0 mt-0.5" aria-hidden="true">
              e911_emergency
            </span>
            <div className="space-y-1">
              <strong className="block text-red-700 dark:text-red-300 font-bold">
                🚨 This may require urgent medical attention.
              </strong>
              <p className="leading-relaxed">
                If symptoms are acute, please visit the nearest 24/7 emergency room or call 112 immediately.
              </p>
            </div>
          </div>
        )}

        {/* Response Text */}
        <p className="text-body-md font-body-md whitespace-pre-wrap leading-relaxed relative z-10 break-words text-on-surface">
          {text}
          {isStreaming && <StreamingCursor />}
        </p>

        {/* Inline Hospital Recommendations */}
        {!isStreaming && recommendations && recommendations.length > 0 && (
          <div className="mt-5 space-y-3.5 w-full max-w-full animate-fade-in relative z-10" role="region" aria-label="Hospital recommendations">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-secondary">local_hospital</span>
                <p className="text-xs font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                  Recommended Hospitals & Facilities
                </p>
              </div>
              <button
                onClick={() => navigate('/hospitals', { state: { recommendations } })}
                className="text-xs font-bold text-secondary hover:text-primary hover:underline cursor-pointer flex items-center gap-0.5"
              >
                View all ({recommendations.length})
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            {recommendations.map((hosp, i) => {
              const rawRating = hosp.trustScore ?? hosp.overallRating ?? hosp.overall_rating ?? null;
              const ratingVal = parseHospitalRating(rawRating);
              const phoneVal = hosp.phone || hosp.contact_number || hosp.phone_number || hosp.phoneNumber || hosp.contact || hosp.telephone;
              const addressVal = hosp.address || hosp.formatted_address || hosp.formattedAddress || hosp.location || hosp.full_address;
              const rawDist = hosp.distance || hosp.distance_km;
              const validDistance = formatDistance(rawDist);
              const websiteVal = hosp.website || hosp.website_url || hosp.websiteUrl || hosp.url;
              const hasValidWebsite = isValidWebUrl(websiteVal);
              const estimatedCostFormatted = formatEstimatedCost(hosp.estimatedCostRange || hosp.estimatedCost || hosp.estimated_cost_range);
              const cleanPros = cleanProsCons(hosp.pros, 3);
              const cleanCons = cleanProsCons(hosp.cons, 3);
              const matchLabel = hosp.suitability || getHumanMatchLabel(hosp.confidenceScore);

              return (
                <Card
                  key={hosp.id || i}
                  variant="container"
                  hoverLift
                  className="p-4 border border-outline-variant/25 rounded-2xl flex flex-col gap-3 hover:border-secondary/40 bg-surface shadow-xs transition-all"
                >
                  {/* Top row: Rank badge above hospital name, hospital name dominant */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-secondary-container text-on-secondary-container font-bold text-xs px-2.5 py-0.5 rounded-full" aria-label={`Rank ${i + 1}`}>
                        #{i + 1}
                      </span>
                      <Badge variant={i === 0 ? "tertiary" : "secondary"} className="shrink-0 text-[11px] font-bold">
                        {matchLabel}
                      </Badge>
                    </div>
                    <div>
                      <h5 className="font-bold text-base text-primary dark:text-primary-fixed leading-tight">
                        {hosp.hospitalName || hosp.hospital_name || hosp.name}
                      </h5>
                      {hosp.hospitalType && (
                        <p className="text-xs text-outline mt-0.5">
                          {hosp.hospitalType}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Immediate metadata: Rating · Distance · Travel Time */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-on-surface-variant">
                    {ratingVal ? (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <span className="material-symbols-outlined text-[15px]">star</span>
                        {ratingVal}
                        {hosp.reviewCount > 0 && (
                          <span className="text-outline font-normal">({hosp.reviewCount})</span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-on-surface-variant font-medium">
                        No rating
                      </span>
                    )}
                    {validDistance && (
                      <span className="inline-flex items-center gap-1 text-outline">
                        <span className="material-symbols-outlined text-[15px] text-secondary">near_me</span>
                        {validDistance}
                      </span>
                    )}
                    {hosp.travelTime && (
                      <span className="inline-flex items-center gap-1 text-outline">
                        <span className="material-symbols-outlined text-[15px]">directions_car</span>
                        {hosp.travelTime}
                      </span>
                    )}
                    {addressVal && (
                      <span className="inline-flex items-center gap-1 text-outline truncate max-w-[220px]">
                        <span className="material-symbols-outlined text-[15px]">location_on</span>
                        {addressVal}
                      </span>
                    )}
                  </div>

                  {/* Capabilities badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    {hosp.hasEmergency === true && (
                      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-lg border border-red-500/20">
                        <span className="material-symbols-outlined text-[13px]">e911_emergency</span>
                        24/7 Emergency
                      </span>
                    )}
                    {(hosp.hasEmergency === null || hosp.hasEmergency === undefined) && (
                      <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant/80 px-2 py-0.5 rounded-lg border border-outline-variant/30 text-[11px] font-normal">
                        <span className="material-symbols-outlined text-[13px] text-outline">help_outline</span>
                        Emergency availability not confirmed
                      </span>
                    )}
                    {hosp.hasIcu === true && (
                      <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-lg border border-sky-500/20">
                        <span className="material-symbols-outlined text-[13px]">medical_services</span>
                        ICU
                      </span>
                    )}
                    {hosp.insuranceAccepted && (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        <span className="material-symbols-outlined text-[13px]">verified_user</span>
                        Cashless Insurance
                      </span>
                    )}
                  </div>

                  {/* Why recommended highlights (clear, non-algorithm language) */}
                  {(() => {
                    const reasonText = (hosp.reason || hosp.explanation || hosp.summary || "").trim();
                    if (!reasonText) return null;
                    return (
                      <div className="space-y-1 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20 text-xs">
                        <p className="font-bold text-primary dark:text-primary-fixed text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-tertiary">check_circle</span>
                          Why MedPath Recommends
                        </p>
                        <p className="text-on-surface-variant leading-relaxed line-clamp-2">
                          {reasonText}
                        </p>
                        <p className="text-[10px] text-outline italic">
                          AI-generated summary. Verify with the hospital.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Pros & Cons Tags */}
                  {(cleanPros.length > 0 || cleanCons.length > 0) && (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {cleanPros.map((pro, idx) => (
                          <span
                            key={`bubble-pro-${idx}`}
                            className="inline-flex items-center gap-0.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium"
                          >
                            <span className="material-symbols-outlined text-[12px] text-emerald-600 dark:text-emerald-400">check</span>
                            {pro}
                          </span>
                        ))}
                        {cleanCons.map((con, idx) => (
                          <span
                            key={`bubble-con-${idx}`}
                            className="inline-flex items-center gap-0.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium"
                          >
                            <span className="material-symbols-outlined text-[12px] text-amber-600 dark:text-amber-400">info</span>
                            {con}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-outline italic">
                        AI-generated summary. Verify with the hospital.
                      </p>
                    </div>
                  )}

                  {/* Estimated Cost Section */}
                  {estimatedCostFormatted && (
                    <div className="flex items-center justify-between bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline-variant/20 text-xs">
                      <span className="text-outline font-medium flex items-center gap-1.5 flex-wrap">
                        <span className="material-symbols-outlined text-[16px] text-secondary">payments</span>
                        <span className="font-semibold text-on-surface">Est. Treatment Cost</span>
                        <span className="text-[11px] text-outline font-normal">(Regional benchmark)</span>
                      </span>
                      <span className="font-bold text-primary dark:text-primary-fixed">
                        {estimatedCostFormatted}
                      </span>
                    </div>
                  )}

                  {/* Standardized Action Buttons (Directions -> Call -> Website -> View Details) */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/15">
                    {/* 1. Directions (primary) */}
                    <a
                      href={getDirectionsUrl(hosp, selectedLocation)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-on-primary bg-primary hover:bg-primary/90 min-h-[44px] px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      aria-label={`Get directions to ${hosp.hospitalName || hosp.name}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">directions</span>
                      Directions
                    </a>

                    {/* 2. Call (secondary, hidden when no phone) */}
                    {phoneVal && (
                      <a
                        href={formatTelUrl(parsePhoneNumbers(phoneVal)[0] || phoneVal)}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-on-secondary-container bg-secondary-container hover:bg-secondary-container/80 min-h-[44px] px-3.5 py-2.5 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                        title={`Call ${hosp.hospitalName || hosp.name}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        Call
                      </a>
                    )}

                    {/* 3. Website (secondary, only when valid) */}
                    {hasValidWebsite && (
                      <a
                        href={websiteVal.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary bg-surface border border-outline-variant/40 hover:bg-surface-container min-h-[44px] px-3.5 py-2.5 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        title="Visit official website"
                      >
                        <span className="material-symbols-outlined text-[16px]">language</span>
                        Website
                      </a>
                    )}

                    {/* 4. View Details (tertiary) */}
                    <button
                      type="button"
                      onClick={() => navigate(`/hospitals/${hosp.id || hosp.hospitalName || hosp.name}`, { state: { hospital: hosp } })}
                      className="inline-flex items-center justify-center gap-1 text-xs font-bold text-primary dark:text-primary-fixed hover:bg-primary/10 border border-primary/20 hover:border-primary/40 min-h-[44px] px-3.5 py-2.5 rounded-full transition-colors cursor-pointer sm:ml-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      View Details
                      <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default TypingBubble;
