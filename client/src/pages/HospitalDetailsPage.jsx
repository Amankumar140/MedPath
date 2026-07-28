import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Button, Badge, ProgressBar, EmptyState } from "../components/ui";
import { formatEstimatedCost } from "../components/chat/TypingBubble";

export function HospitalDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to top when page opens
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const hospital = location.state?.hospital;

  // If no hospital data provided, show redirect message
  if (!hospital) {
    return (
      <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full" role="main">
        <EmptyState
          icon="info"
          title="Hospital Not Found"
          description="No hospital details available. Please select a hospital from the recommendations page."
          action={{
            label: "Back to Recommendations",
            icon: "arrow_back",
            onClick: () => navigate("/hospitals")
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full animate-fade-in" role="main" aria-label={`Hospital details: ${hospital.hospitalName}`}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-label-md text-secondary hover:text-primary transition-colors mb-6 cursor-pointer font-semibold"
        aria-label="Go back to recommendations"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        Back to Recommendations
      </button>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Hospital Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Card */}
          <Card variant="glass" className="p-6 md:p-8 border border-outline-variant/15 space-y-6">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-headline-lg font-bold text-primary dark:text-primary-fixed leading-snug">
                  {hospital.hospitalName}
                </h2>
                {hospital.hospitalType && (
                  <Badge variant="neutral" className="capitalize">
                    {hospital.hospitalType}
                  </Badge>
                )}
                {hospital.source && (
                  <span className="bg-tertiary-container/30 text-on-tertiary-container dark:text-tertiary px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-tertiary/10">
                    {hospital.source}
                  </span>
                )}
              </div>

              {hospital.accreditations && hospital.accreditations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hospital.accreditations.map((acc, i) => (
                    <span key={i} className="bg-secondary-container/30 text-secondary border border-secondary/20 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {acc}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {hospital.summary && (
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 italic text-on-surface-variant font-medium text-body-md">
                " {hospital.summary} "
              </div>
            )}

            <p className="text-body-lg text-on-surface leading-relaxed font-medium">
              {hospital.reason}
            </p>

            {/* Capabilities badges */}
            <div className="pt-5 border-t border-outline-variant/15 space-y-3">
              <h4 className="text-label-sm font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                Capabilities
              </h4>
              <div className="flex flex-wrap gap-2.5">
                <span className={`px-3 py-1.5 rounded-xl text-label-sm font-semibold border flex items-center gap-1.5 shadow-sm ${
                  hospital.hasEmergency !== false
                    ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                    : "bg-outline-variant/10 text-outline border-outline-variant/15"
                }`}>
                  <span className="material-symbols-outlined text-[16px]">{hospital.hasEmergency !== false ? "check_circle" : "cancel"}</span>
                  Emergency Care
                </span>
                <span className={`px-3 py-1.5 rounded-xl text-label-sm font-semibold border flex items-center gap-1.5 shadow-sm ${
                  hospital.hasIcu !== false
                    ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                    : "bg-outline-variant/10 text-outline border-outline-variant/15"
                }`}>
                  <span className="material-symbols-outlined text-[16px]">{hospital.hasIcu !== false ? "check_circle" : "cancel"}</span>
                  ICU Available
                </span>
                <span className="bg-tertiary/10 text-tertiary border-tertiary/20 px-3 py-1.5 rounded-xl text-label-sm font-semibold border flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Insurance Accepted
                </span>
              </div>
            </div>

            {/* Pros & Cons */}
            {((hospital.pros && hospital.pros.length > 0) || (hospital.cons && hospital.cons.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-outline-variant/15">
                {hospital.pros && hospital.pros.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-label-sm font-bold text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">thumb_up</span>
                      Pros
                    </h4>
                    <ul className="list-disc pl-5 text-body-md text-on-surface-variant space-y-1 font-medium">
                      {hospital.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                    </ul>
                  </div>
                )}
                {hospital.cons && hospital.cons.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-label-sm font-bold text-error uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-error">thumb_down</span>
                      Cons
                    </h4>
                    <ul className="list-disc pl-5 text-body-md text-on-surface-variant space-y-1 font-medium">
                      {hospital.cons.map((con, i) => <li key={i}>{con}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Contact Details */}
            {(hospital.phone || hospital.website || hospital.address) && (
              <div className="space-y-3.5 pt-5 border-t border-outline-variant/15">
                <h4 className="text-label-sm font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                  Contact & Location Details
                </h4>
                <ul className="space-y-3 text-body-md text-on-surface font-semibold">
                  {hospital.address && (
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5" aria-hidden="true">location_on</span>
                      <span className="leading-relaxed">{hospital.address}</span>
                    </li>
                  )}
                  {hospital.phone && (
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">call</span>
                      <a href={`tel:${hospital.phone}`} className="text-secondary hover:text-primary hover:underline">{hospital.phone}</a>
                    </li>
                  )}
                  {hospital.website && (
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">language</span>
                      <a href={hospital.website} target="_blank" rel="noreferrer" className="text-secondary hover:text-primary hover:underline truncate">{hospital.website}</a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </Card>

          {/* Intelligence Score metrics */}
          <Card variant="glass" className="p-6 md:p-8 border border-outline-variant/15 space-y-5">
            <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed">Intelligence & Match Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between shadow-sm">
                <span className="text-outline text-label-sm font-bold uppercase tracking-wider">Trust Score</span>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-headline-md font-bold text-primary dark:text-primary-fixed">{hospital.trustScore}</span>
                  <span className="text-label-sm text-outline font-bold">/ 5.0</span>
                </div>
                <ProgressBar value={hospital.trustScore} max={5} variant="secondary" className="mt-4" />
              </div>

              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between shadow-sm">
                <span className="text-outline text-label-sm font-bold uppercase tracking-wider">Match Confidence</span>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-headline-md font-bold text-primary dark:text-primary-fixed">
                    {Math.round((hospital.confidenceScore > 1 ? hospital.confidenceScore / 100 : hospital.confidenceScore) * 100)}%
                  </span>
                </div>
                <ProgressBar value={hospital.confidenceScore > 1 ? hospital.confidenceScore : hospital.confidenceScore * 100} max={100} variant="secondary" className="mt-4" />
              </div>

              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between shadow-sm">
                <span className="text-outline text-label-sm font-bold uppercase tracking-wider">Ranking Position</span>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-headline-md font-bold text-primary dark:text-primary-fixed">#{hospital.rankingPosition}</span>
                  <span className="text-label-sm text-outline font-bold">of results</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Map & Location Pin */}
        <div className="space-y-6">
          <Card variant="glass" className="p-6 border border-outline-variant/15 flex flex-col h-full justify-between gap-5 shadow-md">
            <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed">Department Locator</h3>

            {/* Map Graphic */}
            <div className="w-full h-64 bg-surface-container-high rounded-2xl overflow-hidden border border-outline-variant/20 relative flex items-center justify-center shadow-inner">
              <div className="absolute inset-0 bg-cover bg-center opacity-85" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400')" }}></div>
              <div className="absolute inset-0 bg-secondary/5 mix-blend-color"></div>

              <div className="relative z-10 flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-error drop-shadow-md animate-bounce" aria-hidden="true">location_on</span>
                <div className="bg-surface/95 dark:bg-surface-container/95 backdrop-blur-sm border border-outline-variant/35 rounded-xl p-3 shadow-md text-center max-w-[210px] mt-1.5">
                  <p className="text-label-sm font-bold text-primary dark:text-primary-fixed truncate">{hospital.hospitalName}</p>
                  <p className="text-[10px] text-outline font-bold mt-0.5">{hospital.distance} away</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 font-semibold">
              <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                <span className="text-outline">Travel Distance</span>
                <span className="font-bold text-primary dark:text-primary-fixed">{hospital.distance}</span>
              </div>
              {hospital.travelTime && (
                <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                  <span className="text-outline">Travel Time</span>
                  <span className="font-bold text-primary dark:text-primary-fixed">{hospital.travelTime}</span>
                </div>
              )}
              <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                <span className="text-outline">Estimated Out-of-Pocket</span>
                <span className="font-bold text-primary dark:text-primary-fixed">{formatEstimatedCost(hospital.estimatedCost)}</span>
              </div>
              {hospital.overallRating && (
                <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                  <span className="text-outline">Overall Rating</span>
                  <span className="font-bold text-primary dark:text-primary-fixed">{hospital.overallRating} ★ ({hospital.reviewCount || 0} reviews)</span>
                </div>
              )}
              <div className="flex justify-between text-body-md pb-1">
                <span className="text-outline">Suitability</span>
                <span className="font-bold text-primary dark:text-primary-fixed">{hospital.source || "Suitable"}</span>
              </div>
            </div>

            <Button
              onClick={() => navigate('/reviews/wizard', {
                state: {
                  conversationId: hospital.conversationId,
                  recommendationSnapshotId: hospital.id,
                  hospitalName: hospital.hospitalName,
                  estimatedCost: hospital.estimatedCost
                }
              })}
              variant="secondary"
              icon="rate_review"
              ariaLabel={`Write a review for ${hospital.hospitalName}`}
              className="w-full touch-target"
            >
              Write a Review
            </Button>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.hospitalName)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full premium-gradient-primary text-on-primary hover:opacity-95 transition-all py-3.5 rounded-xl font-bold text-label-md flex items-center justify-center gap-2 shadow-md text-center cursor-pointer hover-lift"
              aria-label={`Navigate to ${hospital.hospitalName} on Google Maps`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">directions</span>
              Navigate on Google Maps
            </a>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default HospitalDetailsPage;
