import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConversations } from "../context/ConversationContext";
import { SkeletonHospitalCard } from "../components/SkeletonLoader";
import { ReviewsDashboardPage } from "./ReviewsDashboardPage";
import { Card, Button, Badge, EmptyState } from "../components/ui";

export function RecommendationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversations, selectConversation, activeConversation, loadingActive } = useConversations();

  const [distanceLimit, setDistanceLimit] = useState(15);
  const [specialties, setSpecialties] = useState({
    Cardiology: false,
    Neurology: false,
    "General Surgery": false,
  });
  const [costTier, setCostTier] = useState("$$");
  const [hospitals, setHospitals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "recommendations");

  // Sync activeTab if changed via navigate state (e.g. from Review Wizard redirect)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Load recommendations based on route state or active conversation
  useEffect(() => {
    if (location.state?.recommendations) {
      setHospitals(location.state.recommendations);
      setLoaded(true);
    } else if (activeConversation?.recommendationSnapshots?.length > 0) {
      setHospitals(activeConversation.recommendationSnapshots);
      setLoaded(true);
    } else if (!loaded && conversations.length > 0) {
      // Find the first conversation that might have recommendations
      const completedConvo = conversations.find(c => c.status === "COMPLETED" || c.status === "ACTIVE");
      if (completedConvo) {
        selectConversation(completedConvo.id);
      } else {
        setLoaded(true);
      }
    } else {
      setLoaded(true);
    }
  }, [location.state, activeConversation, conversations, selectConversation, loaded]);

  // Sync active conversation snapshots if loaded
  useEffect(() => {
    if (activeConversation?.recommendationSnapshots?.length > 0) {
      setHospitals(activeConversation.recommendationSnapshots);
      setLoaded(true);
    }
  }, [activeConversation]);

  const handleSpecialtyChange = (name) => {
    setSpecialties(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Filter hospitals locally
  const filteredHospitals = hospitals.filter(h => {
    // 1. Distance limit check
    const distNum = parseFloat(h.distance) || 0;
    if (distNum > distanceLimit) return false;

    // 2. Cost tier check
    if (costTier) {
      const level = costTier.length;
      const costText = (h.estimatedCost || "").toLowerCase();
      // If $ tier selected, exclude high/expensive costs
      if (level === 1) {
        const isHigh = costText.includes("high") || costText.includes("expensive") || costText.includes("₹15,000") || costText.includes("₹20,000") || costText.includes("₹50,000");
        if (isHigh) return false;
      }
      // If $$ tier selected, exclude very high costs
      if (level === 2) {
        const isVeryHigh = costText.includes("high") || costText.includes("expensive") || costText.includes("₹20,000") || costText.includes("₹50,000");
        if (isVeryHigh) return false;
      }
    }

    // 3. Specialties check (only if at least one checkbox is checked)
    const selectedSpecs = Object.keys(specialties).filter(s => specialties[s]);
    if (selectedSpecs.length > 0) {
      const searchStr = `${h.hospitalName} ${h.reason} ${h.source}`.toLowerCase();
      const matchesAny = selectedSpecs.some(spec => searchStr.includes(spec.toLowerCase()));
      if (!matchesAny) return false;
    }

    return true;
  });

  const isLoading = !loaded || (loadingActive && hospitals.length === 0);

  return (
    <div className="flex-grow flex flex-col max-w-container-max mx-auto w-full bg-surface-bright dark:bg-background overflow-hidden animate-slide-up" role="main" aria-label="Care Recommendations & Feedback">
      
      {/* Page Tabs */}
      <div className="px-5 md:px-8 pt-5 bg-surface border-b border-outline-variant/15 flex gap-8 shrink-0" role="tablist">
        <button
          onClick={() => {
            setActiveTab("recommendations");
            // Clear router state to prevent sticky tab state
            navigate("/hospitals", { replace: true, state: {} });
          }}
          className={`pb-3.5 text-label-lg font-bold border-b-3 transition-all relative cursor-pointer ${
            activeTab === "recommendations"
              ? "border-primary text-primary dark:border-primary-fixed dark:text-primary-fixed font-bold text-[15px]"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "recommendations"}
        >
          Clinical Recommendations
        </button>
        <button
          onClick={() => {
            setActiveTab("feedback");
            // Clear router state to prevent sticky tab state
            navigate("/hospitals", { replace: true, state: {} });
          }}
          className={`pb-3.5 text-label-lg font-bold border-b-3 transition-all relative cursor-pointer ${
            activeTab === "feedback"
              ? "border-primary text-primary dark:border-primary-fixed dark:text-primary-fixed font-bold text-[15px]"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "feedback"}
        >
          Visit History & Feedback
        </button>
      </div>

      {activeTab === "recommendations" ? (
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          {/* Filters Sidebar */}
          <aside className="w-full md:w-80 p-5 md:p-6 border-b md:border-b-0 md:border-r border-outline-variant/15 bg-surface/90 dark:bg-surface-container-low/90 shrink-0 overflow-y-auto" aria-label="Filters">
            <div className="sticky top-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md font-bold text-primary dark:text-primary-fixed">Filters</h2>
                <button
                  onClick={() => {
                    setDistanceLimit(15);
                    setCostTier("$$");
                    setSpecialties({ Cardiology: false, Neurology: false, "General Surgery": false });
                  }}
                  className="text-label-sm font-bold text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Reset All
                </button>
              </div>

              <div className="space-y-6">
                {/* Distance Slider */}
                <div className="space-y-3">
                  <label className="block text-label-md font-semibold text-on-surface-variant" htmlFor="distanceRange">
                    Maximum Distance
                  </label>
                  <input
                    className="w-full accent-secondary cursor-pointer"
                    id="distanceRange"
                    max="50"
                    min="1"
                    type="range"
                    value={distanceLimit}
                    onChange={(e) => setDistanceLimit(parseInt(e.target.value))}
                    aria-valuemin={1}
                    aria-valuemax={50}
                    aria-valuenow={distanceLimit}
                  />
                  <div className="flex justify-between text-label-sm font-bold text-outline mt-1.5">
                    <span>1 mi</span>
                    <span className="text-primary dark:text-primary-fixed font-bold bg-primary-container/20 dark:bg-primary-container/30 px-2.5 py-0.5 rounded-md">{distanceLimit} mi</span>
                    <span>50 mi</span>
                  </div>
                </div>

                <hr className="border-outline-variant/15"/>

                {/* Specialty Checkbox List */}
                <div className="space-y-3">
                  <label className="block text-label-md font-semibold text-on-surface-variant">Specialty Required</label>
                  <div className="space-y-2.5">
                    {Object.keys(specialties).map(spec => (
                      <label key={spec} className="flex items-center gap-3 cursor-pointer group select-none">
                        <input
                          checked={specialties[spec]}
                          onChange={() => handleSpecialtyChange(spec)}
                          className="rounded border-outline text-secondary focus:ring-secondary/50 w-5 h-5 bg-surface-container-lowest cursor-pointer"
                          type="checkbox"
                        />
                        <span className="text-body-md font-medium text-on-surface-variant group-hover:text-primary transition-colors">
                          {spec}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <hr className="border-outline-variant/15"/>

                {/* Cost Filters */}
                <div className="space-y-3">
                  <label className="block text-label-md font-semibold text-on-surface-variant">Est. Out-of-Pocket Cost</label>
                  <div className="flex gap-2" role="radiogroup" aria-label="Cost tier filter">
                    {["Rs.10,000", "Rs.20,000", "Rs.50,000"].map(tier => (
                      <button
                        key={tier}
                        onClick={() => setCostTier(tier)}
                        className={`flex-1 py-2.5 rounded-xl border text-label-sm font-bold transition-all cursor-pointer hover-lift ${
                          costTier === tier
                            ? "border-secondary text-secondary bg-secondary/10 shadow-sm"
                            : "border-outline-variant text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low"
                        }`}
                        role="radio"
                        aria-checked={costTier === tier}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Hospital list panel */}
          <div className="flex-grow p-5 md:p-8 space-y-6 overflow-y-auto">
            <div>
              <h2 className="text-headline-lg font-bold premium-text-gradient">Recommended Care</h2>
              <p className="text-body-md text-on-surface-variant mt-1.5 font-medium">
                Optimized local departments matching your diagnostic triage profile.
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-5">
                {[1, 2, 3].map(i => <SkeletonHospitalCard key={i} />)}
              </div>
            ) : hospitals.length === 0 ? (
              <EmptyState
                icon="local_hospital"
                title="No Recommendations Yet"
                description="Complete an AI consultation to receive personalized hospital recommendations based on your symptoms and location."
                action={{
                  label: "Start Consultation",
                  icon: "add",
                  onClick: () => navigate("/chat/new")
                }}
              />
            ) : filteredHospitals.length === 0 ? (
              <div className="premium-glass-card rounded-[28px] p-12 text-center text-on-surface-variant shadow-inner">
                No recommended hospitals match the selected filter criteria. Try expanding the maximum distance.
              </div>
            ) : (
              <div className="space-y-5">
                {filteredHospitals.map(hosp => {
                  const confidencePct = Math.round(
                    (hosp.confidenceScore > 1 ? hosp.confidenceScore / 100 : hosp.confidenceScore) * 100
                  );

                  return (
                    <Card
                      key={hosp.id}
                      variant="glass"
                      hoverLift
                      className="p-6 border border-outline-variant/15 flex flex-col lg:flex-row gap-6 justify-between items-start"
                    >
                      <div className="space-y-4.5 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="bg-primary text-on-primary w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm" aria-label={`Rank ${hosp.rankingPosition}`}>
                            {hosp.rankingPosition}
                          </span>
                          <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed leading-snug">
                            {hosp.hospitalName}
                          </h3>

                          {hosp.source && (
                            <Badge variant="neutral">
                              {hosp.source}
                            </Badge>
                          )}
                        </div>

                        <p className="text-body-md text-on-surface-variant whitespace-normal leading-relaxed font-medium">
                          {hosp.reason}
                        </p>

                        <div className="flex flex-wrap gap-2.5 pt-1">
                          <div className="flex items-center gap-1.5 text-label-sm font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/10">
                            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">route</span>
                            <span>{hosp.distance}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-label-sm font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/10">
                            <span className="material-symbols-outlined text-[16px] text-tertiary" aria-hidden="true">star</span>
                            <span>Trust Score: {hosp.trustScore}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-label-sm font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/10">
                            <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">payments</span>
                            <span>Cost: {hosp.estimatedCost}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full lg:w-auto shrink-0 flex flex-col gap-4 justify-center items-stretch lg:items-end self-stretch lg:self-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-outline-variant/10">
                        <div className="text-right hidden lg:block">
                          <span className="text-[10px] text-outline uppercase tracking-wider block font-bold">Match Confidence</span>
                          <span className="text-headline-md font-bold text-secondary mt-0.5 block">{confidencePct}% Match</span>
                        </div>

                        <div className="flex flex-wrap lg:flex-nowrap gap-2.5">
                          <Button
                            onClick={() => navigate('/reviews/wizard', {
                              state: {
                                conversationId: hosp.conversationId || activeConversation?.id,
                                recommendationSnapshotId: hosp.id,
                                hospitalName: hosp.hospitalName,
                                estimatedCost: hosp.estimatedCost
                              }
                            })}
                            variant="secondary"
                            icon="rate_review"
                          >
                            Review
                          </Button>
                          <Button
                            onClick={() => navigate(`/hospitals/${hosp.id || hosp.hospitalName}`, { state: { hospital: hosp } })}
                            variant="primary"
                            className="flex-grow"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ReviewsDashboardPage />
        </div>
      )}
    </div>
  );
}

export default RecommendationsPage;
