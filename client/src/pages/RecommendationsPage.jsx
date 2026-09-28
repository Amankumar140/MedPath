import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConversations } from "../context/ConversationContext";
import { usePatientLocation } from "../context/LocationContext";
import { SkeletonHospitalCard } from "../components/SkeletonLoader";
import { ReviewsDashboardPage } from "./ReviewsDashboardPage";
import { useToast } from "../components/Toast";
import { Card, Button, Badge, EmptyState } from "../components/ui";
import { formatEstimatedCost } from "../components/chat/TypingBubble";
import { getDirectionsUrl, formatTelUrl, parsePhoneNumbers, parseHospitalRating, cleanProsCons, isValidWebUrl, formatDistance } from "../utils/location.helpers";
import HospitalCompareModal from "../components/HospitalCompareModal";

function HospitalReasoningBox({ reasonText }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = reasonText.length > 150;

  return (
    <div className="space-y-1.5 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 text-xs">
      <p className="font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
        Why Recommended
      </p>
      <p className={`text-on-surface-variant leading-relaxed ${!expanded && isLong ? "line-clamp-2" : ""}`}>
        {reasonText}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="text-secondary dark:text-secondary-fixed hover:underline text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer pt-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
        >
          {expanded ? "Show less" : "Read more"}
          <span className="material-symbols-outlined text-[15px]">
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </button>
      )}
      <p className="text-[10px] text-outline italic">
        AI-generated summary. Verify with the hospital.
      </p>
    </div>
  );
}

export function RecommendationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { conversations, selectConversation, activeConversation, loadingActive } = useConversations();
  const { selectedLocation } = usePatientLocation();

  const [distanceLimit, setDistanceLimit] = useState(25);
  const [selectedSpecialties, setSelectedSpecialties] = useState({});
  const [costTier, setCostTier] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "recommendations");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Decision Modes (Section 14)
  const [sortMode, setSortMode] = useState("bestMatch"); // bestMatch | lowestCost | closest | highestRated
  const [filterEmergencyOnly, setFilterEmergencyOnly] = useState(false);
  const [filterCashlessOnly, setFilterCashlessOnly] = useState(false);

  // Comparison State (Section 17)
  const [compareList, setCompareList] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Derive available specialties dynamically
  const availableSpecialties = useMemo(() => {
    const specs = new Set();
    hospitals.forEach(h => {
      if (Array.isArray(h.specialties)) {
        h.specialties.forEach(s => { if (typeof s === 'string' && s.trim()) specs.add(s.trim()); });
      } else if (typeof h.specialties === 'string') {
        h.specialties.split(',').forEach(s => { if (s.trim()) specs.add(s.trim()); });
      }
    });
    return Array.from(specs);
  }, [hospitals]);

  // Sync activeTab if changed via navigate state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Load recommendations
  useEffect(() => {
    if (location.state?.recommendations && location.state.recommendations.length > 0) {
      setHospitals(location.state.recommendations);
      setLoaded(true);
    } else if (activeConversation?.recommendationSnapshots?.length > 0) {
      setHospitals(activeConversation.recommendationSnapshots);
      setLoaded(true);
    } else if (!loaded && conversations.length > 0) {
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

  useEffect(() => {
    if (activeConversation?.recommendationSnapshots?.length > 0) {
      setHospitals(activeConversation.recommendationSnapshots);
      setLoaded(true);
    }
  }, [activeConversation]);

  const handleSpecialtyChange = (name) => {
    setSelectedSpecialties(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCompare = (hospital) => {
    setCompareList(prev => {
      const exists = prev.some(h => (h.id || h.hospitalName) === (hospital.id || hospital.hospitalName));
      if (exists) {
        return prev.filter(h => (h.id || h.hospitalName) !== (hospital.id || hospital.hospitalName));
      }
      if (prev.length >= 3) {
        showToast("You can compare up to 3 hospitals at a time.", "warning", "Comparison Limit");
        return prev;
      }
      return [...prev, hospital];
    });
  };

  // Filter & Sort Hospitals locally
  const processedHospitals = useMemo(() => {
    let result = [...hospitals];

    // Filter distance
    result = result.filter(h => {
      const distNum = parseFloat(h.distance) || 0;
      if (distNum > 0 && distNum > distanceLimit) return false;
      return true;
    });

    // Filter 24/7 Emergency
    if (filterEmergencyOnly) {
      result = result.filter(h => h.hasEmergency === true);
    }

    // Filter Cashless Insurance
    if (filterCashlessOnly) {
      result = result.filter(h => h.insuranceAccepted === true);
    }

    // Filter Specialty
    const activeSpecs = Object.keys(selectedSpecialties).filter(s => selectedSpecialties[s]);
    if (activeSpecs.length > 0) {
      result = result.filter(h => {
        const hospSpecs = Array.isArray(h.specialties) ? h.specialties : [];
        const searchStr = `${h.hospitalName} ${h.reason || ''}`.toLowerCase();
        return activeSpecs.some(spec => {
          const sLower = spec.toLowerCase();
          return hospSpecs.some(hs => typeof hs === 'string' && hs.toLowerCase().includes(sLower)) ||
            searchStr.includes(sLower);
        });
      });
    }

    // Filter cost tier
    if (costTier) {
      result = result.filter(h => {
        const costStr = (h.estimatedCost || h.estimatedCostRange || "").toLowerCase();
        if (costTier === "budget") {
          return costStr.includes("budget") || costStr.includes("from ₹") || costStr.includes("govt");
        }
        return true;
      });
    }

    // Sort Modes
    result.sort((a, b) => {
      if (sortMode === "closest") {
        const distA = parseFloat(a.distance) || 999;
        const distB = parseFloat(b.distance) || 999;
        return distA - distB;
      }
      if (sortMode === "highestRated") {
        const ratingA = parseHospitalRating(a.trustScore ?? a.overallRating) ?? 0;
        const ratingB = parseHospitalRating(b.trustScore ?? b.overallRating) ?? 0;
        return ratingB - ratingA;
      }
      if (sortMode === "lowestCost") {
        const getCostVal = (obj) => {
          if (typeof obj === 'number') return obj;
          const str = String(obj || "");
          const match = str.match(/\d[\d,]*/);
          return match ? parseInt(match[0].replace(/,/g, "")) : 999999;
        };
        return getCostVal(a.estimatedCost || a.estimatedCostRange) - getCostVal(b.estimatedCost || b.estimatedCostRange);
      }
      // Default: best match (rankingPosition or confidenceScore)
      const rankA = a.rankingPosition || 99;
      const rankB = b.rankingPosition || 99;
      return rankA - rankB;
    });

    return result;
  }, [hospitals, distanceLimit, filterEmergencyOnly, filterCashlessOnly, selectedSpecialties, costTier, sortMode]);

  const isLoading = !loaded || (loadingActive && hospitals.length === 0);

  // Search context
  const discoverySpecialty = activeConversation?.contextData?.discoverySpecialty || activeConversation?.patientContext?.contextData?.discoverySpecialty || location.state?.discoverySpecialty;
  const searchedLocation = activeConversation?.contextData?.discoveryLocation || activeConversation?.patientContext?.location || activeConversation?.patientContext?.city || selectedLocation?.city || selectedLocation?.formattedAddress?.split(",")[0];
  const hasSpecialtyContext = Boolean(discoverySpecialty && searchedLocation);

  const careContextSymptom = activeConversation?.patientContext?.symptoms || "Your reported symptoms";
  const careContextLocation = selectedLocation?.city || selectedLocation?.formattedAddress?.split(",")[0] || "Your current location";

  return (
    <div className="flex-grow flex flex-col max-w-container-max mx-auto w-full bg-surface-bright dark:bg-background overflow-hidden animate-slide-up" role="main" aria-label="Hospital Recommendations">
      
      {/* Page Tabs */}
      <div className="px-4 md:px-8 pt-4 md:pt-5 bg-surface border-b border-outline-variant/15 flex gap-4 md:gap-8 shrink-0" role="tablist">
        <button
          onClick={() => {
            setActiveTab("recommendations");
            navigate("/hospitals", { replace: true, state: {} });
          }}
          className={`pb-3 md:pb-3.5 text-label-md md:text-label-lg font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === "recommendations"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "recommendations"}
        >
          Hospital Recommendations ({processedHospitals.length < hospitals.length ? `${processedHospitals.length} of ${hospitals.length}` : hospitals.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("feedback");
            navigate("/hospitals", { replace: true, state: {} });
          }}
          className={`pb-3 md:pb-3.5 text-label-md md:text-label-lg font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === "feedback"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "feedback"}
        >
          Patient Reviews & Community Feedback
        </button>
      </div>

      {activeTab === "recommendations" ? (
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          
          {/* Filters Sidebar */}
          <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-outline-variant/15 bg-surface shrink-0 md:overflow-y-auto" aria-label="Filters">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="md:hidden w-full flex items-center justify-between px-4 py-3 text-label-md font-bold text-primary cursor-pointer"
              aria-expanded={mobileFiltersOpen}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                Refine Options & Filters
              </span>
              <span className={`material-symbols-outlined text-[20px] transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`}>
                expand_more
              </span>
            </button>

            <div className={`${mobileFiltersOpen ? "block" : "hidden"} md:block p-4 md:p-6 space-y-6`}>
              <div className="flex items-center justify-between">
                <h3 className="text-body-lg font-bold text-primary dark:text-primary-fixed">Filters</h3>
                <button
                  onClick={() => {
                    setDistanceLimit(25);
                    setSelectedSpecialties({});
                    setCostTier("");
                    setFilterEmergencyOnly(false);
                    setFilterCashlessOnly(false);
                  }}
                  className="text-xs font-semibold text-secondary hover:underline cursor-pointer"
                >
                  Reset All
                </button>
              </div>

              {/* Distance Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-on-surface">
                  <span>Max Travel Distance</span>
                  <span className="text-secondary bg-secondary-container px-2 py-0.5 rounded-full">{distanceLimit} km</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  value={distanceLimit}
                  onChange={(e) => setDistanceLimit(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer"
                  aria-label="Distance limit in kilometers"
                />
                <div className="flex justify-between text-[11px] text-outline">
                  <span>2 km</span>
                  <span>50 km</span>
                </div>
              </div>

              {/* Key Facility Filters */}
              <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                <span className="text-xs font-bold text-on-surface block">Capabilities Required</span>
                <label className="flex items-center gap-2.5 text-xs font-medium text-on-surface cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterEmergencyOnly}
                    onChange={(e) => setFilterEmergencyOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span>24/7 Emergency ICU on site</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-medium text-on-surface cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterCashlessOnly}
                    onChange={(e) => setFilterCashlessOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span>Cashless Insurance Accepted</span>
                </label>
              </div>

              {/* Specialty Required */}
              {availableSpecialties.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                  <span className="text-xs font-bold text-on-surface block">Specialties</span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableSpecialties.map(spec => (
                      <label key={spec} className="flex items-center gap-2.5 text-xs font-medium text-on-surface-variant hover:text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!selectedSpecialties[spec]}
                          onChange={() => handleSpecialtyChange(spec)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="truncate">{spec}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Results Main Area */}
          <div className="flex-grow p-4 md:p-6 lg:p-8 space-y-5 overflow-y-auto">
            
            {/* 1. Context Summary Bar (Section 11) */}
            <div className="bg-surface border border-outline-variant/25 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-outline font-semibold">
                  <span className="material-symbols-outlined text-[16px] text-secondary">manage_search</span>
                  Search Context
                </div>
                {hasSpecialtyContext ? (
                  <p className="text-sm font-bold text-primary dark:text-primary-fixed">
                    Showing facilities for <span className="underline decoration-secondary decoration-2 underline-offset-2">{discoverySpecialty}</span> in {searchedLocation}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-primary dark:text-primary-fixed">
                    Showing hospitals for <span className="underline decoration-secondary decoration-2 underline-offset-2">"{careContextSymptom}"</span> near {careContextLocation}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (activeConversation?.id) {
                    navigate(`/chat/${activeConversation.id}`);
                  } else {
                    navigate("/home");
                  }
                }}
                className="self-start sm:self-center text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1 bg-secondary-container/40 hover:bg-secondary-container px-3 py-1.5 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
                Edit Search
              </button>
            </div>

            {/* 2. Decision Modes / Sorting Controls & Active Filter Count (Section 14, D5) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1 border-b border-outline-variant/15">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-semibold text-on-surface-variant mr-1">
                  {processedHospitals.length < hospitals.length ? (
                    <span>Showing <strong className="text-primary dark:text-primary-fixed">{processedHospitals.length}</strong> of {hospitals.length} hospitals</span>
                  ) : (
                    <span>{hospitals.length} facilities available</span>
                  )}
                </div>
                <span className="text-outline text-xs hidden sm:inline">•</span>
                <span className="text-xs font-bold text-outline">Sort By:</span>
                <button
                  onClick={() => setSortMode("bestMatch")}
                  aria-pressed={sortMode === "bestMatch"}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    sortMode === "bestMatch"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  🌟 Best Match
                </button>
                <button
                  onClick={() => setSortMode("closest")}
                  aria-pressed={sortMode === "closest"}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    sortMode === "closest"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  📍 Closest
                </button>
                <button
                  onClick={() => setSortMode("highestRated")}
                  aria-pressed={sortMode === "highestRated"}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    sortMode === "highestRated"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  ★ Highest Rated
                </button>
                <button
                  onClick={() => setSortMode("lowestCost")}
                  aria-pressed={sortMode === "lowestCost"}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    sortMode === "lowestCost"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  💰 Lowest Cost
                </button>
              </div>

              {/* Compare Trigger button if any selected */}
              {compareList.length > 0 && (
                <button
                  onClick={() => setIsCompareModalOpen(true)}
                  className="bg-secondary text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm hover:bg-secondary/90 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
                  Compare ({compareList.length}/3)
                </button>
              )}
            </div>

            {/* 3. Hospital Cards List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <SkeletonHospitalCard key={i} />)}
              </div>
            ) : hospitals.length === 0 ? (
              <EmptyState
                icon="local_hospital"
                title="No Hospital Recommendations Yet"
                description="Start a healthcare consultation to receive verified recommendations tailored to your symptoms, insurance, and location."
                action={{
                  label: "Start Consultation",
                  icon: "search",
                  onClick: () => navigate("/home")
                }}
              />
            ) : processedHospitals.length === 0 ? (
              <div className="bg-surface rounded-2xl p-10 text-center border border-outline-variant/20 space-y-3">
                <span className="material-symbols-outlined text-[44px] text-outline">filter_alt_off</span>
                <h4 className="text-base font-bold text-primary dark:text-primary-fixed">No hospitals match current filters</h4>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                  Try increasing your maximum distance slider or unchecking specialty restrictions to see nearby facilities.
                </p>
                <button
                  onClick={() => {
                    setDistanceLimit(50);
                    setSelectedSpecialties({});
                    setFilterEmergencyOnly(false);
                    setFilterCashlessOnly(false);
                  }}
                  className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-full cursor-pointer hover:bg-primary/90 transition-all"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {processedHospitals.map((hosp, i) => {
                  const rawRating = hosp.trustScore ?? hosp.overallRating ?? hosp.overall_rating ?? null;
                  const ratingVal = parseHospitalRating(rawRating);
                  const phoneVal = hosp.phone || hosp.contact_number || hosp.phone_number || hosp.phoneNumber || hosp.contact;
                  const addressVal = hosp.address || hosp.formatted_address || hosp.formattedAddress || hosp.location;
                  const rawDist = hosp.distance || hosp.distance_km;
                  const validDistance = formatDistance(rawDist);
                  const estimatedCostFormatted = formatEstimatedCost(hosp.estimatedCostRange || hosp.estimatedCost || hosp.estimated_cost_range);
                  const isCompared = compareList.some(h => (h.id || h.hospitalName) === (hosp.id || hosp.hospitalName));
                  const cleanPros = cleanProsCons(hosp.pros, 3);
                  const cleanCons = cleanProsCons(hosp.cons, 3);
                  const websiteUrl = hosp.website || hosp.websiteUrl || hosp.website_url;
                  const hasValidWebsite = isValidWebUrl(websiteUrl);

                  return (
                    <Card
                      key={hosp.id || i}
                      variant="container"
                      hoverLift
                      className="p-5 md:p-6 border border-outline-variant/25 rounded-2xl flex flex-col gap-4 bg-surface shadow-xs hover:border-secondary/40 transition-all"
                    >
                      <div className="space-y-3 flex-1 min-w-0">
                        
                        {/* Rank above hospital name, hospital name dominant */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-secondary-container text-on-secondary-container font-bold text-xs px-2.5 py-0.5 rounded-full" aria-label={`Rank ${i + 1}`}>
                              #{i + 1} {i === 0 ? "Best Match" : "Match"}
                            </span>
                            {hosp.hospitalType && (
                              <Badge variant="neutral" className="text-xs">
                                {hosp.hospitalType}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed leading-tight">
                            {hosp.hospitalName || hosp.name}
                          </h3>
                        </div>

                        {/* Immediate metadata: Rating, Distance, Travel Time */}
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-on-surface-variant">
                          {ratingVal ? (
                            <span className="inline-flex items-center gap-1 text-amber-500">
                              <span className="material-symbols-outlined text-[16px]">star</span>
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
                              <span className="material-symbols-outlined text-[16px] text-secondary">near_me</span>
                              {validDistance}
                            </span>
                          )}
                          {hosp.travelTime && (
                            <span className="inline-flex items-center gap-1 text-outline">
                              <span className="material-symbols-outlined text-[16px]">directions_car</span>
                              {hosp.travelTime}
                            </span>
                          )}
                          {addressVal && (
                            <span className="inline-flex items-center gap-1 text-outline truncate max-w-sm">
                              <span className="material-symbols-outlined text-[16px]">location_on</span>
                              {addressVal}
                            </span>
                          )}
                        </div>

                        {/* Capabilities & Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                          {hosp.hasEmergency === true && (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-lg border border-red-500/20">
                              <span className="material-symbols-outlined text-[14px]">e911_emergency</span>
                              24/7 Emergency
                            </span>
                          )}
                          {(hosp.hasEmergency === null || hosp.hasEmergency === undefined) && (
                            <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant/80 px-2.5 py-0.5 rounded-lg border border-outline-variant/30 font-normal">
                              <span className="material-symbols-outlined text-[14px] text-outline">help_outline</span>
                              Emergency availability not confirmed
                            </span>
                          )}
                          {hosp.hasIcu === true && (
                            <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded-lg border border-sky-500/20">
                              <span className="material-symbols-outlined text-[14px]">medical_services</span>
                              ICU
                            </span>
                          )}
                          {hosp.insuranceAccepted && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                              <span className="material-symbols-outlined text-[14px]">verified_user</span>
                              Cashless Insurance
                            </span>
                          )}
                          {hosp.bedCapacity && (
                            <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant px-2.5 py-0.5 rounded-lg border border-outline-variant/30">
                              <span className="material-symbols-outlined text-[13px]">hotel</span>
                              {hosp.bedCapacity} Beds
                            </span>
                          )}
                          {hosp.operatingHours && (
                            <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant px-2.5 py-0.5 rounded-lg border border-outline-variant/30">
                              <span className="material-symbols-outlined text-[13px]">schedule</span>
                              {hosp.operatingHours}
                            </span>
                          )}
                          {Array.isArray(hosp.doctors) && hosp.doctors.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant px-2.5 py-0.5 rounded-lg border border-outline-variant/30">
                              <span className="material-symbols-outlined text-[13px]">medical_information</span>
                              {hosp.doctors.length} Specialists
                            </span>
                          )}
                          {Array.isArray(hosp.accreditations) && hosp.accreditations.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant px-2.5 py-0.5 rounded-lg border border-outline-variant/30">
                              🏅 {hosp.accreditations[0]}
                            </span>
                          )}
                        </div>

                        {/* Top Specialties Badges */}
                        {(() => {
                          const specs = Array.isArray(hosp.specialties) 
                            ? hosp.specialties 
                            : typeof hosp.specialties === 'string' 
                              ? hosp.specialties.split(',').map(s => s.trim()).filter(Boolean)
                              : [];
                          if (specs.length === 0) return null;
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {specs.slice(0, 4).map((spec, sIdx) => (
                                <span key={sIdx} className="text-[11px] font-semibold bg-surface-container-low text-primary dark:text-primary-fixed px-2.5 py-0.5 rounded-md border border-outline-variant/20">
                                  {spec}
                                </span>
                              ))}
                              {specs.length > 4 && (
                                <span className="text-[10px] text-outline font-medium">+{specs.length - 4} more</span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Why MedPath Recommends with Read more/Show less toggle (B2) */}
                        {(() => {
                          const reasonText = (hosp.reason || hosp.explanation || hosp.summary || "").trim();
                          if (!reasonText) return null;
                          return <HospitalReasoningBox reasonText={reasonText} />;
                        })()}

                        {/* Pros & Cons Tags */}
                        {(cleanPros.length > 0 || cleanCons.length > 0) && (
                          <div className="space-y-1 pt-0.5">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              {cleanPros.map((pro, idx) => (
                                <span
                                  key={`pro-${idx}`}
                                  className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-emerald-600 dark:text-emerald-400">check</span>
                                  {pro}
                                </span>
                              ))}
                              {cleanCons.map((con, idx) => (
                                <span
                                  key={`con-${idx}`}
                                  className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-amber-600 dark:text-amber-400">info</span>
                                  {con}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-outline italic">
                              AI-generated summary. Verify with the hospital.
                            </p>
                          </div>
                        )}

                        {/* Estimated Cost Section (B3) */}
                        {estimatedCostFormatted && (
                          <div className="flex items-center justify-between bg-surface-container-low/60 px-3.5 py-2.5 rounded-xl border border-outline-variant/20 text-xs">
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

                        {/* Compare Checkbox Row (A1: subtle separate line) */}
                        <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleCompare(hosp)}
                            aria-pressed={isCompared}
                            className="inline-flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary py-1 px-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <span className={`material-symbols-outlined text-[18px] ${isCompared ? "text-secondary font-bold" : "text-outline"}`}>
                              {isCompared ? "check_box" : "check_box_outline_blank"}
                            </span>
                            <span className={isCompared ? "font-semibold text-secondary" : "font-normal"}>
                              {isCompared ? "Selected for comparison" : "Compare this facility"}
                            </span>
                          </button>
                        </div>

                        {/* Standardized Action Buttons (A1: Directions -> Call -> Website -> View Details, min 44px) */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          {/* 1. Directions (primary) */}
                          <a
                            href={getDirectionsUrl(hosp, selectedLocation)}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs min-h-[44px] px-4 py-2.5 rounded-full shadow-xs flex items-center justify-center gap-1.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            aria-label={`Get directions to ${hosp.hospitalName || hosp.name}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">directions</span>
                            Directions
                          </a>

                          {/* 2. Direct Call Button if available (secondary) */}
                          {phoneVal && (
                            <a
                              href={formatTelUrl(parsePhoneNumbers(phoneVal)[0] || phoneVal)}
                              className="bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 font-bold text-xs min-h-[44px] px-3.5 py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                              title={`Call ${hosp.hospitalName || hosp.name}`}
                            >
                              <span className="material-symbols-outlined text-[16px]">call</span>
                              Call
                            </a>
                          )}

                          {/* 3. Official Website Button if valid (secondary) */}
                          {hasValidWebsite && (
                            <a
                              href={websiteUrl.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-surface border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:bg-surface-container font-bold text-xs min-h-[44px] px-3.5 py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              title={`Visit ${hosp.hospitalName || hosp.name} website`}
                            >
                              <span className="material-symbols-outlined text-[16px]">language</span>
                              Website
                            </a>
                          )}

                          {/* 4. View Details (tertiary) */}
                          <Button
                            onClick={() => navigate(`/hospitals/${hosp.id || hosp.hospitalName || hosp.name}`, { state: { hospital: hosp } })}
                            variant="tertiary"
                            className="font-bold text-xs min-h-[44px] px-4 py-2.5 rounded-full border border-primary/20 hover:border-primary/40 text-primary dark:text-primary-fixed sm:ml-auto"
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

      {/* Floating Compare Dock (when 1 or more selected) */}
      {compareList.length > 0 && !isCompareModalOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-surface border border-outline-variant/30 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-4 animate-slide-up">
          <span className="text-xs font-bold text-primary dark:text-primary-fixed flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-[18px]">compare_arrows</span>
            {compareList.length} of 3 selected
          </span>
          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="bg-primary text-on-primary text-xs font-bold px-4 py-1.5 rounded-full hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
          >
            Compare Now
          </button>
          <button
            onClick={() => setCompareList([])}
            className="text-xs text-outline hover:text-on-surface cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Hospital Comparison Modal */}
      <HospitalCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        hospitals={compareList}
        selectedLocation={selectedLocation}
      />
    </div>
  );
}

export default RecommendationsPage;
