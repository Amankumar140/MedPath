import React, { useEffect, useRef } from "react";
import { formatEstimatedCost } from "./chat/TypingBubble";
import { getDirectionsUrl, parseHospitalRating, cleanProsCons } from "../utils/location.helpers";

export function HospitalCompareModal({ isOpen, onClose, hospitals = [], selectedLocation }) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    // Autofocus the close button
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || hospitals.length === 0) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Compare Healthcare Facilities"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-surface rounded-3xl border border-outline-variant/30 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between shrink-0 bg-surface-container-low">
          <div>
            <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">compare_arrows</span>
              Compare Hospitals
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Side-by-side comparison to help you choose the best healthcare option.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 text-outline hover:text-on-surface rounded-full hover:bg-surface-container transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
            aria-label="Close comparison"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-6 overflow-x-auto overflow-y-auto flex-grow">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="p-3 text-xs font-bold text-outline uppercase tracking-wider w-1/4">Criteria</th>
                {hospitals.map((h, i) => (
                  <th key={h.id || i} className="p-3 text-sm font-bold text-primary dark:text-primary-fixed w-1/4 align-top">
                    <span className="text-[11px] font-bold text-secondary block">Option {i + 1}</span>
                    <span className="text-base font-bold text-primary dark:text-primary-fixed">{h.hospitalName || h.name}</span>
                    {h.hospitalType && (
                      <span className="text-xs font-normal text-outline block mt-0.5">{h.hospitalType}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-xs text-on-surface">
              {/* Suitability */}
              <tr className="bg-surface-container-low/40">
                <td className="p-3 font-semibold text-on-surface-variant">Match & Suitability</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3 font-bold text-tertiary">
                    {h.suitability || (h.confidenceScore > 0.8 ? "Top Result" : "Good Option")}
                  </td>
                ))}
              </tr>

              {/* Distance & Travel Time */}
              <tr>
                <td className="p-3 font-semibold text-on-surface-variant">Distance & Time</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3 font-medium">
                    {h.distance ? `📍 ${h.distance} ${h.travelTime ? `(${h.travelTime})` : ""}` : (h.travelTime ? `🚗 ${h.travelTime}` : "—")}
                  </td>
                ))}
              </tr>

              {/* Rating & Patient Feedback */}
              <tr className="bg-surface-container-low/40">
                <td className="p-3 font-semibold text-on-surface-variant">Patient Rating</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3 font-bold text-amber-500">
                    {(() => {
                      const ratingVal = parseHospitalRating(h.trustScore ?? h.overallRating);
                      return ratingVal ? (
                        <>
                          ★ {ratingVal}
                          {h.reviewCount > 0 && <span className="text-outline font-normal ml-1">({h.reviewCount} reviews)</span>}
                        </>
                      ) : (
                        <span className="text-on-surface-variant font-medium">No rating</span>
                      );
                    })()}
                  </td>
                ))}
              </tr>

              {/* Estimated Treatment Cost */}
              <tr>
                <td className="p-3 font-semibold text-on-surface-variant">Estimated Cost</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3 font-bold text-primary dark:text-primary-fixed">
                    {formatEstimatedCost(h.estimatedCostRange || h.estimatedCost || h.estimated_cost_range) || "Contact for estimate"}
                  </td>
                ))}
              </tr>

              {/* 24/7 Emergency */}
              <tr className="bg-surface-container-low/40">
                <td className="p-3 font-semibold text-on-surface-variant">24/7 Emergency</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3">
                    {h.hasEmergency === true ? (
                      <span className="text-red-700 dark:text-red-400 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Available
                      </span>
                    ) : h.hasEmergency === false ? (
                      <span className="text-outline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">cancel</span> Not available
                      </span>
                    ) : (
                      <span className="text-outline flex items-center gap-1 font-normal">
                        <span className="material-symbols-outlined text-[16px]">help_outline</span> Not confirmed
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* ICU Facilities */}
              <tr>
                <td className="p-3 font-semibold text-on-surface-variant">ICU Care</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3">
                    {h.hasIcu === true ? (
                      <span className="text-sky-700 dark:text-sky-400 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Available
                      </span>
                    ) : h.hasIcu === false ? (
                      <span className="text-outline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">cancel</span> Not available
                      </span>
                    ) : (
                      <span className="text-outline flex items-center gap-1 font-normal">
                        <span className="material-symbols-outlined text-[16px]">help_outline</span> Not confirmed
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Cashless Insurance */}
              <tr className="bg-surface-container-low/40">
                <td className="p-3 font-semibold text-on-surface-variant">Cashless Insurance</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3 font-semibold">
                    {h.insuranceAccepted ? (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">verified</span> Accepted
                      </span>
                    ) : (
                      <span className="text-outline">Self-pay / reimbursement</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Bed Capacity */}
              <tr className="bg-surface-container-low/40">
                <td className="p-3 font-semibold text-on-surface-variant">Inpatient Beds</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3 font-medium">
                    {h.bedCapacity ? `${h.bedCapacity} Beds` : "Not specified"}
                  </td>
                ))}
              </tr>

              {/* Operating Hours */}
              <tr>
                <td className="p-3 font-semibold text-on-surface-variant">Hours & Emergency</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3 font-medium">
                    {h.operatingHours || (h.hasEmergency ? "24 Hours Emergency" : "Standard OPD")}
                  </td>
                ))}
              </tr>

              {/* Doctors & Specialists */}
              <tr className="bg-surface-container-low/40">
                <td className="p-3 font-semibold text-on-surface-variant">Attending Specialists</td>
                {hospitals.map((h, i) => {
                  const docs = Array.isArray(h.doctors) ? h.doctors : [];
                  return (
                    <td key={i} className="p-3 font-medium">
                      {docs.length > 0 ? (
                        <span className="text-primary dark:text-primary-fixed font-semibold">
                          {docs.length} Specialists Available
                        </span>
                      ) : (
                        <span className="text-outline">Registry pending</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Accreditations */}
              <tr>
                <td className="p-3 font-semibold text-on-surface-variant">Accreditations</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3 font-medium">
                    {Array.isArray(h.accreditations) && h.accreditations.length > 0 
                      ? h.accreditations.join(", ") 
                      : "Standard"}
                  </td>
                ))}
              </tr>

              {/* Highlights & Considerations */}
              <tr className="bg-surface-container-low/40">
                <td className="p-3 font-semibold text-on-surface-variant">
                  <div>Highlights & Considerations</div>
                  <div className="text-[10px] text-outline font-normal italic mt-0.5">AI-generated summary. Verify with the hospital.</div>
                </td>
                {hospitals.map((h, i) => {
                  const pros = cleanProsCons(h.pros, 3);
                  const cons = cleanProsCons(h.cons, 3);
                  const hasNeither = pros.length === 0 && cons.length === 0;

                  return (
                    <td key={i} className="p-3">
                      {hasNeither ? (
                        <span className="text-outline font-normal">—</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {pros.map((p, idx) => (
                            <span
                              key={`modal-pro-${idx}`}
                              className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[11px] font-medium"
                            >
                              <span className="material-symbols-outlined text-[13px] text-emerald-600 dark:text-emerald-400">check</span>
                              {p}
                            </span>
                          ))}
                          {cons.map((c, idx) => (
                            <span
                              key={`modal-con-${idx}`}
                              className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20 text-[11px] font-medium"
                            >
                              <span className="material-symbols-outlined text-[13px] text-amber-600 dark:text-amber-400">info</span>
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Primary Action */}
              <tr className="bg-surface-container-low/60">
                <td className="p-3 font-semibold text-on-surface-variant">Direct Action</td>
                {hospitals.map((h, i) => (
                  <td key={i} className="p-3">
                    <a
                      href={getDirectionsUrl(h, selectedLocation)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 bg-primary text-white hover:bg-primary/90 text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">directions</span>
                      Directions
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-outline-variant/20 bg-surface-container-low flex justify-between items-center text-xs text-outline">
          <span>Comparing {hospitals.length} healthcare facilities</span>
          <button
            onClick={onClose}
            className="font-bold text-primary hover:underline cursor-pointer"
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
}

export default HospitalCompareModal;
