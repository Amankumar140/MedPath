import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedAIAvatar from "./AnimatedAIAvatar";
import StreamingCursor from "./StreamingCursor";
import { Card, Button, Badge } from "../ui";
import { useNavigate } from "react-router-dom";
import { usePatientLocation } from "../../context/LocationContext";
import { getDirectionsUrl, formatTelUrl, parsePhoneNumbers } from "../../utils/location.helpers";

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
  text,
  isStreaming = false,
  isLast = false,
  messageType = "TEXT",
  recommendations = null,
  onChipClick = () => {},
  conversationId = null,
}) {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { selectedLocation } = usePatientLocation();

  return (
    <div className="flex gap-3 md:gap-4 w-full msg-bubble-ai animate-fade-in" role="article" aria-label="AI message">
      <div className="shrink-0 mt-0.5" aria-hidden="true">
        <AnimatedAIAvatar isStreaming={isStreaming} size="md" />
      </div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl p-4 md:p-5 shadow-sm border transition-all glass-morphism dark:glass-morphism-dark text-on-surface rounded-tl-sm max-w-2xl flex-1 overflow-hidden"
      >
        {/* Header tag */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-outline-variant/15">
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" aria-hidden="true"></span>
            MedPath AI Core
          </span>
          {messageType === "FINAL" && (
            <Badge variant="tertiary" className="text-[10px] py-0.5">
              Verified Triage
            </Badge>
          )}
        </div>

        {/* Clinical Disclaimer banner */}
        {messageType === "FINAL" && (
          <div className="mb-3.5 bg-secondary-container/20 border border-secondary/20 p-2.5 rounded-xl text-xs text-on-surface flex items-start gap-2" role="note">
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5" aria-hidden="true">clinical_notes</span>
            <p className="leading-snug">
              <strong>Clinical Triage Complete:</strong> Options matched to your reported symptoms & geolocation.
            </p>
          </div>
        )}

        {/* Response Text */}
        <p className="text-body-md font-body-md whitespace-pre-wrap leading-relaxed relative z-10 break-words">
          {text}
          {isStreaming && <StreamingCursor />}
        </p>

        {/* Inline Recommendations */}
        {!isStreaming && recommendations && recommendations.length > 0 && (
          <div className="mt-4 space-y-3 w-full max-w-full animate-fade-in relative z-10" role="region" aria-label="Hospital recommendations">
            <div className="flex items-center gap-1.5 border-b border-outline-variant/15 pb-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-secondary">local_hospital</span>
              <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Recommended Healthcare Facilities</p>
            </div>
            {recommendations.map((hosp, i) => {
              const ratingVal = hosp.trustScore || hosp.overallRating || hosp.overall_rating || 4.5;
              const phoneVal = hosp.phone || hosp.contact_number || hosp.phone_number || hosp.phoneNumber || hosp.contact || hosp.telephone;
              const addressVal = hosp.address || hosp.formatted_address || hosp.formattedAddress || hosp.location || hosp.full_address;
              const rawDist = hosp.distance || hosp.distance_km;
              const validDistance = (rawDist && rawDist !== 'Unknown' && rawDist !== 'Nearby' && !rawDist.includes('Nearby')) ? rawDist : null;

              return (
                <Card
                  key={hosp.id || i}
                  variant="lowest"
                  hoverLift
                  className="p-4 border border-outline-variant/20 flex flex-col gap-3 hover:border-outline-variant/35"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-fixed w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
                        {hosp.rankingPosition || i + 1}
                      </span>
                      <h5 className="font-bold text-sm text-primary dark:text-primary-fixed leading-tight break-words">
                        {hosp.hospitalName || hosp.hospital_name || hosp.name}
                      </h5>
                    </div>
                    <Badge variant="secondary">
                      {Math.round((hosp.confidenceScore > 1 ? hosp.confidenceScore / 100 : hosp.confidenceScore) * 100)}% Match
                    </Badge>
                  </div>

                  {/* Rating & Address line */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-on-surface-variant">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                      <span className="material-symbols-outlined text-[14px]">star</span>
                      {ratingVal}
                    </span>
                    {addressVal && (
                      <span className="inline-flex items-center gap-1 text-outline truncate max-w-[240px]">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {addressVal}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant/90 line-clamp-2 leading-relaxed font-medium">
                    {hosp.reason || hosp.explanation || hosp.summary}
                  </p>

                  {/* Distance & Contact Info */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-on-surface">
                    {validDistance && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/10">
                        <span className="material-symbols-outlined text-[13px] text-secondary">route</span>
                        {validDistance}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/10">
                      <span className="material-symbols-outlined text-[13px] text-primary">payments</span>
                      {formatEstimatedCost(hosp.estimatedCost || hosp.estimated_cost_range)}
                    </span>
                    {phoneVal && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary bg-surface-container-low dark:bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/10">
                        <span className="material-symbols-outlined text-[13px]">call</span>
                        {/* Mobile tel link */}
                        <a
                          href={formatTelUrl(parsePhoneNumbers(phoneVal)[0] || phoneVal)}
                          className="md:hidden underline hover:text-primary"
                          title="Tap to call hospital"
                        >
                          {phoneVal}
                        </a>
                        {/* Desktop text display */}
                        <span className="hidden md:inline">{phoneVal}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-outline-variant/10">
                    <a
                      href={getDirectionsUrl(hosp, selectedLocation)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-colors px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                      aria-label={`Get directions to ${hosp.hospitalName}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">directions</span>
                      Get Directions
                    </a>

                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                      <button
                        onClick={() => navigate('/reviews/wizard', {
                          state: {
                            conversationId: conversationId,
                            recommendationSnapshotId: hosp.id,
                            hospitalName: hosp.hospitalName,
                            estimatedCost: hosp.estimatedCost
                          }
                        })}
                        className="text-primary hover:text-secondary font-bold transition-colors cursor-pointer hover:underline text-xs flex items-center gap-0.5 touch-target"
                      >
                        <span className="material-symbols-outlined text-[14px]">rate_review</span>
                        Review
                      </button>
                      <button
                        onClick={() => navigate(`/hospitals/${hosp.id || hosp.hospitalName}`, { state: { hospital: hosp } })}
                        className="text-secondary hover:text-primary font-bold transition-colors cursor-pointer hover:underline text-xs flex items-center gap-0.5 touch-target"
                      >
                        View Details &rarr;
                      </button>
                    </div>
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
