import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Button, ProgressBar, EmptyState } from "../components/ui";

export function HospitalDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

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
    <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full animate-slide-up" role="main" aria-label={`Hospital details: ${hospital.hospitalName}`}>
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
          <Card variant="glass" className="p-6 md:p-8 border border-outline-variant/15 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-headline-lg font-bold text-primary dark:text-primary-fixed leading-snug">
                {hospital.hospitalName}
              </h2>
              {hospital.source && (
                <span className="bg-tertiary-container/30 text-on-tertiary-container dark:text-tertiary px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-tertiary/10">
                  {hospital.source}
                </span>
              )}
            </div>

            <p className="text-body-lg text-on-surface leading-relaxed font-medium">
              {hospital.reason}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-outline-variant/15">
              <div className="space-y-3.5">
                <h4 className="text-label-sm font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                  Key Information
                </h4>
                <ul className="space-y-3 text-body-md text-on-surface font-semibold">
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">route</span>
                    <span>Distance: {hospital.distance}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">payments</span>
                    <span>Estimated Cost: {hospital.estimatedCost}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">star</span>
                    <span>Trust Score: {hospital.trustScore} / 5.0</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3.5">
                <h4 className="text-label-sm font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                  Capabilities
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-surface-container-low text-on-surface px-3 py-1.5 rounded-xl text-label-sm font-semibold border border-outline-variant/10 flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-tertiary animate-pulse" aria-hidden="true">check_circle</span>
                    Emergency Care
                  </span>
                  <span className="bg-surface-container-low text-on-surface px-3 py-1.5 rounded-xl text-label-sm font-semibold border border-outline-variant/10 flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-tertiary animate-pulse" aria-hidden="true">check_circle</span>
                    ICU Available
                  </span>
                  <span className="bg-surface-container-low text-on-surface px-3 py-1.5 rounded-xl text-label-sm font-semibold border border-outline-variant/10 flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-tertiary animate-pulse" aria-hidden="true">check_circle</span>
                    Insurance Accepted
                  </span>
                </div>
              </div>
            </div>
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
              <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                <span className="text-outline">Estimated Out-of-Pocket</span>
                <span className="font-bold text-primary dark:text-primary-fixed">{hospital.estimatedCost}</span>
              </div>
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
