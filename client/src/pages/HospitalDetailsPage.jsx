import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, Button, Badge, EmptyState } from "../components/ui";
import { formatEstimatedCost } from "../components/chat/TypingBubble";
import { usePatientLocation } from "../context/LocationContext";
import { useConversations } from "../context/ConversationContext";
import conversationService from "../services/conversation.service";
import {
  getDirectionsUrl,
  formatTelUrl,
  parsePhoneNumbers,
  parseHospitalRating,
  isValidWebUrl,
  cleanProsCons,
} from "../utils/location.helpers";
import EmergencyBanner from "../components/EmergencyBanner";

export function HospitalDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const hospitalParamId = params.hospitalId || params.id;
  const { selectedLocation } = usePatientLocation();
  const { activeConversation } = useConversations();

  const [hospital, setHospital] = useState(location.state?.hospital || null);
  const [loading, setLoading] = useState(!location.state?.hospital);
  const [activeTab, setActiveTab] = useState("overview"); // overview | clinical | cost | location | reviews

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (location.state?.hospital) {
      setHospital(location.state.hospital);
      setLoading(false);
      return;
    }

    if (hospitalParamId) {
      const found = activeConversation?.recommendationSnapshots?.find(
        (h) =>
          h.id === hospitalParamId ||
          (h.hospitalName && encodeURIComponent(h.hospitalName) === encodeURIComponent(hospitalParamId)) ||
          h.hospitalName === hospitalParamId
      );
      if (found) {
        setHospital(found);
        setLoading(false);
        return;
      }

      setLoading(true);
      conversationService
        .getRecommendationSnapshot(hospitalParamId)
        .then((res) => {
          if (res?.success && res.data) {
            setHospital(res.data);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch hospital snapshot:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [hospitalParamId, activeConversation, location.state]);

  // Formatted estimated cost range
  const estimatedCostFormatted = useMemo(() => {
    if (!hospital) return null;
    const costVal = hospital.estimatedCostRange || hospital.estimatedCost || hospital.estimated_cost_range;
    return formatEstimatedCost(costVal);
  }, [hospital]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 bg-surface-bright dark:bg-background" role="status" aria-label="Loading hospital clinical profile">
        <div className="flex flex-col items-center gap-3 text-outline">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-body-md font-semibold text-on-surface">Loading hospital clinical profile...</p>
        </div>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full" role="main">
        <EmptyState
          icon="local_hospital"
          title="Hospital Profile Not Found"
          description="We couldn't retrieve clinical details for this healthcare facility. Please return to the recommendations list."
          action={{
            label: "Back to Recommendations",
            icon: "arrow_back",
            onClick: () => navigate("/hospitals"),
          }}
        />
      </div>
    );
  }

  // Normalize all available fields safely
  const hospitalDisplayName = hospital.hospitalName || hospital.name || "Healthcare Facility";
  const rawRating = hospital.trustScore ?? hospital.overallRating ?? hospital.rating ?? null;
  const ratingVal = parseHospitalRating(rawRating);
  const rawPhone = hospital.phone || hospital.contact_number || hospital.phone_number || hospital.contact;
  const phoneNumbers = parsePhoneNumbers(rawPhone);
  const emergencyPhone = hospital.emergencyContact || hospital.emergency_contact;
  const emailVal = hospital.email || hospital.contact_email;
  const addressVal = hospital.address || hospital.formatted_address || hospital.formattedAddress || hospital.location;
  const landmarkVal = hospital.landmark;
  const websiteVal = hospital.website || hospital.websiteUrl || hospital.website_url;
  const hasValidWebsite = isValidWebUrl(websiteVal);
  const lat = hospital.latitude ?? hospital.lat;
  const lng = hospital.longitude ?? hospital.lng;
  const rawDist = hospital.distance || hospital.distance_km;
  const validDistance = rawDist && rawDist !== "Unknown" && rawDist !== "Nearby" ? rawDist : null;
  const travelTimeVal = hospital.travelTime || hospital.travel_time;
  const bedCapacityVal = hospital.bedCapacity || hospital.bed_capacity || hospital.beds;
  const operatingHoursVal = hospital.operatingHours || hospital.operating_hours || (hospital.hasEmergency ? "24 Hours Emergency" : null);

  const specialtiesList = Array.isArray(hospital.specialties)
    ? hospital.specialties
    : typeof hospital.specialties === "string"
      ? hospital.specialties.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const departmentsList = Array.isArray(hospital.departments)
    ? hospital.departments
    : typeof hospital.departments === "string"
      ? hospital.departments.split(",").map((d) => d.trim()).filter(Boolean)
      : [];

  const facilitiesList = Array.isArray(hospital.facilities)
    ? hospital.facilities
    : typeof hospital.facilities === "string"
      ? hospital.facilities.split(",").map((f) => f.trim()).filter(Boolean)
      : [];

  const servicesList = Array.isArray(hospital.services)
    ? hospital.services
    : typeof hospital.services === "string"
      ? hospital.services.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const doctorsList = Array.isArray(hospital.doctors) ? hospital.doctors : [];
  const accreditationsList = Array.isArray(hospital.accreditations)
    ? hospital.accreditations
    : typeof hospital.accreditations === "string"
      ? hospital.accreditations.split(",").map((a) => a.trim()).filter(Boolean)
      : [];

  const languagesList = Array.isArray(hospital.languages)
    ? hospital.languages
    : typeof hospital.languages === "string"
      ? hospital.languages.split(",").map((l) => l.trim()).filter(Boolean)
      : [];

  const cleanPros = cleanProsCons(hospital.pros, 5);
  const cleanCons = cleanProsCons(hospital.cons, 5);
  const directionsUrl = getDirectionsUrl(hospital, selectedLocation);

  return (
    <div
      className="flex-grow p-4 md:p-6 lg:p-8 bg-surface-bright dark:bg-background overflow-y-auto max-w-5xl mx-auto w-full space-y-6 animate-fade-in pb-24 md:pb-8"
      role="main"
      aria-label={`Hospital Clinical Details: ${hospitalDisplayName}`}
    >
      {/* 1. Breadcrumb Navigation & Provenance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary dark:text-primary-fixed hover:underline cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Recommendations
        </button>
        <div className="flex items-center gap-2 text-xs text-outline font-medium">
          <span className="inline-flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-full text-[11px] font-semibold text-secondary">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            {hospital.source || "Swasthya AI Verified"}
          </span>
          {accreditationsList.length > 0 && (
            <span className="hidden sm:inline">• {accreditationsList.join(", ")} Accredited</span>
          )}
        </div>
      </div>

      {/* Emergency Notice if urgent care facility */}
      {hospital.hasEmergency === true && (
        <EmergencyBanner compact />
      )}

      {/* 2. Primary Clinical Hero Header */}
      <Card variant="container" className="p-6 md:p-8 border border-outline-variant/25 rounded-3xl shadow-xs bg-surface space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Rank, Match Suitability & Hospital Type Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {hospital.rankingPosition && (
                <span className="bg-secondary-container text-on-secondary-container font-bold text-xs px-2.5 py-0.5 rounded-full">
                  Rank #{hospital.rankingPosition}
                </span>
              )}
              {hospital.suitability && (
                <Badge variant="tertiary" className="text-xs font-bold">
                  {hospital.suitability}
                </Badge>
              )}
              {hospital.hospitalType && (
                <Badge variant="neutral" className="text-xs font-semibold">
                  {hospital.hospitalType}
                </Badge>
              )}
              {hospital.insuranceAccepted && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="material-symbols-outlined text-[13px]">verified_user</span>
                  Cashless Insurance
                </span>
              )}
            </div>

            {/* Hospital Display Name */}
            <h1 className="text-display-lg md:text-headline-lg font-bold text-primary dark:text-primary-fixed leading-tight">
              {hospitalDisplayName}
            </h1>

            {/* Address & Landmark */}
            {addressVal && (
              <p className="text-body-sm text-outline flex items-start gap-1.5 leading-relaxed">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5">location_on</span>
                <span>
                  {addressVal}
                  {landmarkVal && <span className="italic font-normal"> (Near {landmarkVal})</span>}
                </span>
              </p>
            )}

            {/* Primary Vitals: Rating, Distance, Travel Time, Bed Capacity, Hours */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold pt-1">
              {ratingVal ? (
                <span className="inline-flex items-center gap-1 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-xl">
                  <span className="material-symbols-outlined text-[16px]">star</span>
                  {ratingVal}
                  {hospital.reviewCount > 0 && (
                    <span className="text-outline font-medium text-[11px]">({hospital.reviewCount} reviews)</span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-xl font-medium">
                  Rating pending
                </span>
              )}

              {validDistance && (
                <span className="inline-flex items-center gap-1.5 text-on-surface bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-xl">
                  <span className="material-symbols-outlined text-[16px] text-secondary">near_me</span>
                  {validDistance}
                </span>
              )}

              {travelTimeVal && (
                <span className="inline-flex items-center gap-1.5 text-on-surface bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-xl">
                  <span className="material-symbols-outlined text-[16px] text-secondary">directions_car</span>
                  {travelTimeVal}
                </span>
              )}

              {operatingHoursVal && (
                <span className="inline-flex items-center gap-1.5 text-on-surface bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-xl">
                  <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                  {operatingHoursVal}
                </span>
              )}

              {bedCapacityVal && (
                <span className="inline-flex items-center gap-1.5 text-on-surface bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-xl">
                  <span className="material-symbols-outlined text-[16px] text-secondary">hotel</span>
                  {bedCapacityVal} Inpatient Beds
                </span>
              )}
            </div>
          </div>

          {/* Desktop Direct Actions Column */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 w-full md:w-56">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs min-h-[44px] px-5 py-3 rounded-full shadow-xs transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="material-symbols-outlined text-[18px]">directions</span>
              Get Directions
            </a>

            {phoneNumbers[0] && (
              <a
                href={formatTelUrl(phoneNumbers[0])}
                className="inline-flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 font-bold text-xs min-h-[44px] px-5 py-3 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                Call Desk
              </a>
            )}

            {hasValidWebsite && (
              <a
                href={websiteVal.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-surface border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:bg-surface-container font-bold text-xs min-h-[44px] px-5 py-3 rounded-full transition-all"
                title="Visit official website"
              >
                <span className="material-symbols-outlined text-[18px]">language</span>
                Official Website
              </a>
            )}

            <Button
              onClick={() =>
                navigate("/reviews/wizard", {
                  state: {
                    conversationId: hospital.conversationId,
                    recommendationSnapshotId: hospital.id,
                    hospitalName: hospitalDisplayName,
                    estimatedCost: hospital.estimatedCost,
                  },
                })
              }
              variant="outline"
              className="text-xs font-bold min-h-[44px]"
            >
              Write Patient Review
            </Button>
          </div>
        </div>

        {/* Emergency Hotline Alert Banner */}
        {emergencyPhone && (
          <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-red-600 text-[22px] shrink-0">e911_emergency</span>
              <span className="font-bold text-red-800 dark:text-red-300">
                24/7 Hospital Emergency Hotline: {emergencyPhone}
              </span>
            </div>
            <a
              href={formatTelUrl(emergencyPhone)}
              className="inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              Call Hotline Now
            </a>
          </div>
        )}
      </Card>

      {/* 3. Progressive Disclosure Tabs */}
      <div className="border-b border-outline-variant/20 flex gap-2 md:gap-4 overflow-x-auto no-scrollbar shrink-0" role="tablist">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-2 ${
            activeTab === "overview"
              ? "border-primary text-primary dark:text-primary-fixed"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "overview"}
        >
          <span className="material-symbols-outlined text-[18px]">clinical_notes</span>
          Clinical Overview
        </button>

        <button
          onClick={() => setActiveTab("clinical")}
          className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-2 ${
            activeTab === "clinical"
              ? "border-primary text-primary dark:text-primary-fixed"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "clinical"}
        >
          <span className="material-symbols-outlined text-[18px]">medical_services</span>
          Capabilities & Doctors ({specialtiesList.length + doctorsList.length})
        </button>

        <button
          onClick={() => setActiveTab("cost")}
          className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-2 ${
            activeTab === "cost"
              ? "border-primary text-primary dark:text-primary-fixed"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "cost"}
        >
          <span className="material-symbols-outlined text-[18px]">payments</span>
          Cost & Insurance
        </button>

        <button
          onClick={() => setActiveTab("location")}
          className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-2 ${
            activeTab === "location"
              ? "border-primary text-primary dark:text-primary-fixed"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "location"}
        >
          <span className="material-symbols-outlined text-[18px]">explore</span>
          Location & Contacts
        </button>

        <button
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-2 ${
            activeTab === "reviews"
              ? "border-primary text-primary dark:text-primary-fixed"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "reviews"}
        >
          <span className="material-symbols-outlined text-[18px]">rate_review</span>
          Patient Reviews
        </button>
      </div>

      {/* 4. Tab 1: Clinical Overview & Rationale */}
      {activeTab === "overview" && (
        <div className="space-y-5 animate-fade-in">
          {/* Why MedPath Recommends This Facility */}
          <Card variant="container" className="p-6 md:p-7 border border-outline-variant/25 rounded-3xl bg-surface space-y-4">
            <h2 className="text-body-lg font-bold text-primary dark:text-primary-fixed flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[22px]">verified</span>
              Why MedPath Recommends This Facility
            </h2>
            <p className="text-body-md text-on-surface leading-relaxed">
              {hospital.reason || hospital.explanation || hospital.summary || "This healthcare facility was matched based on department capabilities, accreditation, and geographic proximity to your search location."}
            </p>

            {/* Pros / Strengths & Cons / Considerations */}
            {(cleanPros.length > 0 || cleanCons.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {cleanPros.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                      Key Clinical Strengths
                    </span>
                    <ul className="text-xs text-on-surface space-y-1.5 pl-4 list-disc">
                      {cleanPros.map((p, idx) => (
                        <li key={idx} className="leading-relaxed">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {cleanCons.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Important Considerations
                    </span>
                    <ul className="text-xs text-on-surface space-y-1.5 pl-4 list-disc">
                      {cleanCons.map((c, idx) => (
                        <li key={idx} className="leading-relaxed">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[11px] text-outline italic col-span-full">
                  AI-generated summary based on available clinical registry and patient reporting. Please verify directly with the hospital.
                </p>
              </div>
            )}
          </Card>

          {/* Operational Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-outline-variant/20 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">Bed Capacity</span>
              <p className="text-sm font-bold text-primary dark:text-primary-fixed">
                {bedCapacityVal ? `${bedCapacityVal} Inpatient Beds` : "Not specified"}
              </p>
            </div>

            <div className="bg-surface border border-outline-variant/20 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">Operating Hours</span>
              <p className="text-sm font-bold text-primary dark:text-primary-fixed">
                {operatingHoursVal || "Contact hospital desk"}
              </p>
            </div>

            <div className="bg-surface border border-outline-variant/20 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">Parking & Transit</span>
              <p className="text-sm font-bold text-primary dark:text-primary-fixed">
                {hospital.parking === true ? "Dedicated Parking Available" : hospital.parking === false ? "Limited street parking" : "Available on premises"}
              </p>
            </div>

            <div className="bg-surface border border-outline-variant/20 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">Languages Spoken</span>
              <p className="text-sm font-bold text-primary dark:text-primary-fixed">
                {languagesList.length > 0 ? languagesList.join(", ") : "English, Hindi"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Capabilities & Attending Doctors */}
      {activeTab === "clinical" && (
        <div className="space-y-5 animate-fade-in">
          <Card variant="container" className="p-6 md:p-7 border border-outline-variant/25 rounded-3xl bg-surface space-y-5">
            <h2 className="text-body-lg font-bold text-primary dark:text-primary-fixed flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">medical_services</span>
              Clinical Capabilities & Care Units
            </h2>

            {/* Critical Unit Status Badges */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {hospital.hasEmergency === true && (
                <span className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  24/7 Emergency Care
                </span>
              )}
              {hospital.hasIcu === true && (
                <span className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  ICU / Critical Care Units
                </span>
              )}
              {hospital.insuranceAccepted && (
                <span className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  Cashless TPA Desk
                </span>
              )}
            </div>

            {/* Specialties & Clinical Departments */}
            {specialtiesList.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">Specialties & Medical Fields</span>
                <div className="flex flex-wrap gap-2">
                  {specialtiesList.map((spec, i) => (
                    <span key={i} className="text-xs font-semibold bg-surface-container-low text-primary dark:text-primary-fixed px-3 py-1.5 rounded-xl border border-outline-variant/25">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {departmentsList.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">Clinical Departments</span>
                <div className="flex flex-wrap gap-2">
                  {departmentsList.map((dept, i) => (
                    <span key={i} className="text-xs font-medium bg-surface-container text-on-surface px-3 py-1 rounded-lg border border-outline-variant/20">
                      {dept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnostic Facilities & Surgical Equipment */}
            {facilitiesList.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">Diagnostic & Surgical Equipment</span>
                <div className="flex flex-wrap gap-2">
                  {facilitiesList.map((fac, i) => (
                    <span key={i} className="text-xs font-medium bg-surface-container text-on-surface px-2.5 py-1 rounded-lg border border-outline-variant/20 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-tertiary">check</span>
                      {fac}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Services */}
            {servicesList.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">Patient Support Services</span>
                <div className="flex flex-wrap gap-2">
                  {servicesList.map((srv, i) => (
                    <span key={i} className="text-xs font-medium bg-surface-container text-on-surface px-2.5 py-1 rounded-lg border border-outline-variant/20">
                      • {srv}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Doctors & Attending Specialists */}
            {doctorsList.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-outline-variant/15">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">Attending Specialists & Doctors</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {doctorsList.map((doc, i) => {
                    const isObj = typeof doc === "object" && doc !== null;
                    const docName = isObj ? doc.name : doc;
                    const docSpec = isObj ? doc.specialty || doc.department : null;
                    const docExp = isObj ? doc.experience : null;

                    return (
                      <div key={i} className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
                          Dr
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-primary dark:text-primary-fixed truncate">{docName}</p>
                          {docSpec && <p className="text-[11px] text-outline truncate">{docSpec}</p>}
                          {docExp && <p className="text-[10px] text-outline">{docExp} exp</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 6. Tab 3: Estimated Cost & Insurance */}
      {activeTab === "cost" && (
        <div className="space-y-5 animate-fade-in">
          <Card variant="container" className="p-6 md:p-7 border border-outline-variant/25 rounded-3xl bg-surface space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/15 pb-4">
              <div>
                <h2 className="text-body-lg font-bold text-primary dark:text-primary-fixed flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">payments</span>
                  Estimated Treatment Cost
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Regional benchmark based on public clinical data, typical admissions, and reported procedures.
                </p>
              </div>

              {estimatedCostFormatted ? (
                <div className="text-left sm:text-right bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/20">
                  <span className="text-headline-md font-bold text-primary dark:text-primary-fixed block">
                    {estimatedCostFormatted}
                  </span>
                  <span className="text-[11px] font-semibold text-secondary">
                    Estimated, not a quote
                  </span>
                </div>
              ) : (
                <span className="text-xs text-outline italic">Cost estimation unavailable</span>
              )}
            </div>

            {/* Insurance Acceptance Status */}
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 space-y-2">
              <span className="text-xs font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary text-[18px]">verified_user</span>
                Insurance & Cashless Coverage
              </span>
              <p className="text-xs text-on-surface leading-relaxed">
                {hospital.insuranceAccepted === true
                  ? "This hospital maintains an active Cashless Insurance TPA desk and accepts major public and private health insurance policies."
                  : hospital.insuranceAccepted === false
                    ? "Cashless insurance is not directly listed. Patients can submit bills for post-hospitalization reimbursement."
                    : "Insurance policies may be accepted on a reimbursement basis. Please check with your TPA or insurance provider."}
              </p>
            </div>

            {/* Estimation Methodology & Strict Non-Quote Disclaimer */}
            <div className="bg-surface-container-low/60 p-4 rounded-2xl border border-outline-variant/15 text-xs text-outline leading-relaxed space-y-1.5">
              <p className="font-bold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
                Estimated, not a quote:
              </p>
              <p>
                MedPath does not issue binding financial quotes or clinical guarantees. Actual hospital billing varies based on diagnostic workup, surgical implants, room category (General, Semi-Private, Deluxe), ICU length of stay, and treating doctor fees. Please contact the hospital billing desk for an itemized estimate.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* 7. Tab 4: Location, Route Map & Contacts */}
      {activeTab === "location" && (
        <div className="space-y-5 animate-fade-in">
          <Card variant="container" className="p-6 md:p-7 border border-outline-variant/25 rounded-3xl bg-surface space-y-5">
            <h2 className="text-body-lg font-bold text-primary dark:text-primary-fixed flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">explore</span>
              Hospital Location & Navigation
            </h2>

            {/* Embedded Route Map */}
            <div className="w-full h-80 bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/20 relative shadow-inner">
              {(lat && lng) || addressVal ? (
                <iframe
                  title="Hospital Map View"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${
                    lat && lng ? `${lat},${lng}` : encodeURIComponent(`${hospitalDisplayName}, ${addressVal || ""}`)
                  }&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-outline">
                  <span className="material-symbols-outlined text-[40px] mb-1">location_off</span>
                  <p className="text-xs">Exact map pin coordinates unavailable</p>
                </div>
              )}
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">Full Address</span>
                <p className="text-xs text-on-surface font-medium leading-relaxed">
                  {addressVal || "Address details unavailable"}
                  {landmarkVal && <span className="block text-outline font-normal">Landmark: {landmarkVal}</span>}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">Telephone Contacts</span>
                {phoneNumbers.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {phoneNumbers.map((p, i) => (
                      <a
                        key={i}
                        href={formatTelUrl(p)}
                        className="inline-flex items-center gap-1.5 bg-secondary-container/40 hover:bg-secondary-container text-secondary text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        {p}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-outline italic">No phone numbers listed</p>
                )}
                {emailVal && (
                  <p className="text-xs text-outline pt-1">
                    Email: <a href={`mailto:${emailVal}`} className="text-secondary hover:underline">{emailVal}</a>
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/15">
              <div className="text-xs text-outline">
                {validDistance ? `Distance: ${validDistance} from your location` : "Coordinates verified"}
              </div>
              <div className="flex items-center gap-2">
                {hasValidWebsite && (
                  <a
                    href={websiteVal.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1 px-3 py-2 rounded-full hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[16px]">language</span>
                    Official Website
                  </a>
                )}
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-primary text-on-primary font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-xs hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">directions</span>
                  Open Navigation in Maps
                </a>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 8. Tab 5: Community Reviews */}
      {activeTab === "reviews" && (
        <div className="space-y-5 animate-fade-in">
          <Card variant="container" className="p-6 md:p-7 border border-outline-variant/25 rounded-3xl bg-surface space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-4">
              <div>
                <h2 className="text-body-lg font-bold text-primary dark:text-primary-fixed flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">rate_review</span>
                  Patient Reviews & Experience
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Authentic patient feedback verified through the MedPath community network.
                </p>
              </div>

              <Button
                onClick={() =>
                  navigate("/reviews/wizard", {
                    state: {
                      conversationId: hospital.conversationId,
                      recommendationSnapshotId: hospital.id,
                      hospitalName: hospitalDisplayName,
                      estimatedCost: hospital.estimatedCost,
                    },
                  })
                }
                variant="primary"
                className="text-xs font-bold"
              >
                Write Review
              </Button>
            </div>

            {/* Rating Summary */}
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="text-center sm:text-left sm:border-r border-outline-variant/20 sm:pr-6 shrink-0">
                <span className="text-4xl font-bold text-primary dark:text-primary-fixed block">
                  {ratingVal ? ratingVal : "N/A"}
                </span>
                <div className="flex items-center justify-center sm:justify-start gap-1 text-amber-500 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`material-symbols-outlined text-[18px] ${
                        ratingVal && star <= Math.round(ratingVal) ? "fill-1" : "opacity-30"
                      }`}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="text-[11px] text-outline font-medium">
                  {hospital.reviewCount > 0 ? `${hospital.reviewCount} verified reviews` : "No public reviews yet"}
                </span>
              </div>

              <div className="space-y-1.5 flex-1 text-xs text-on-surface-variant">
                <p className="font-semibold text-primary dark:text-primary-fixed">Clinical Rating Insights:</p>
                <p className="leading-relaxed">
                  Ratings reflect overall patient admission experience, nursing responsiveness, billing transparency, and treatment outcome clarity.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 9. Non-Diagnostic Healthcare Disclaimer */}
      <div className="text-center pt-2 pb-6">
        <p className="text-[11px] text-outline leading-relaxed max-w-2xl mx-auto">
          MedPath is an independent healthcare navigation platform providing facility discovery and cost benchmarks. MedPath does not guarantee clinical outcomes or hospital charges.
        </p>
      </div>

      {/* 10. Sticky Mobile Action Bar (Visible only on mobile devices) */}
      <div className="fixed bottom-16 left-0 w-full z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/20 p-3 flex md:hidden items-center justify-around gap-2 shadow-lg">
        {phoneNumbers[0] && (
          <a
            href={formatTelUrl(phoneNumbers[0])}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-secondary-container text-on-secondary-container font-bold text-xs min-h-[44px] py-2.5 rounded-full"
          >
            <span className="material-symbols-outlined text-[18px]">call</span>
            Call Desk
          </a>
        )}
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary font-bold text-xs min-h-[44px] py-2.5 rounded-full shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">directions</span>
          Directions
        </a>
      </div>
    </div>
  );
}

export default HospitalDetailsPage;
