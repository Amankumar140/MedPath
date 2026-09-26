import React, { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../context/ConversationContext";
import { usePatientLocation } from "../context/LocationContext";
import { SkeletonCard } from "../components/SkeletonLoader";
import { Card, Button, Badge, EmptyState } from "../components/ui";
import EmergencyBanner from "../components/EmergencyBanner";
import LocationPermissionModal from "../components/location/LocationPermissionModal";

const SCENARIOS = {
  en: [
    { label: "Severe abdominal pain for 2 days", text: "I have had severe, sharp lower abdominal pain for the past 2 days with mild nausea." },
    { label: "High fever in 4-year-old child", text: "My 4-year-old child has had high fever (102°F) since yesterday with loss of appetite." },
    { label: "Need 24/7 Cardiac Emergency", text: "Looking for an accredited hospital nearby with 24/7 emergency care and cardiac ICU facilities." },
    { label: "Knee swelling & difficulty walking", text: "Elderly family member has severe knee swelling and difficulty walking following a minor slip." },
  ],
  hi: [
    { label: "2 दिन से पेट में तेज़ दर्द", text: "मुझे पिछले 2 दिनों से पेट के निचले हिस्से में तेज़ दर्द और उल्टी जैसा महसूस हो रहा है।" },
    { label: "बच्चे को कल से तेज़ बुखार", text: "मेरे 4 साल के बच्चे को कल रात से तेज़ बुखार है और वह कुछ खा नहीं पा रहा है।" },
    { label: "24 घंटे इमरजेंसी व हृदय रोग विभाग", text: "मुझे पास में ऐसा अस्पताल चाहिए जहां 24 घंटे इमरजेंसी और कार्डिएक आईसीयू उपलब्ध हो।" },
    { label: "घुटने में दर्द और चलने में परेशानी", text: "घर के बुजुर्ग के घुटने में काफी दर्द व सूजन है और चलने में अत्यधिक परेशानी हो रही है।" },
  ],
  hinglish: [
    { label: "2 din se sharp stomach pain", text: "Mere stomach me 2 din se sharp pain ho raha hai aur khana digest nahi ho raha." },
    { label: "Child ko high fever aur cough", text: "4 saal ke bachhe ko continuous high fever aur chest congestion hai." },
    { label: "24/7 Emergency & Cashless hospital", text: "Aisa hospital suggest karein jisme 24/7 emergency ho aur cashless insurance accept hota ho." },
    { label: "Knee me swelling aur pain", text: "Elderly person ke knee me sudden swelling aa gayi hai, walking me severe issue hai." },
  ]
};

export function DashboardPage({ tab }) {
  const { user } = useAuth();
  const { conversations, loadingConversations, deleteConversation, startNewConsultation } = useConversations();
  const { selectedLocation, requestGpsLocation, gpsStatus } = usePatientLocation();
  const navigate = useNavigate();

  const [inputQuery, setInputQuery] = useState("");
  const [activeLang, setActiveLang] = useState("en"); // en | hi | hinglish
  const [showOptionalPref, setShowOptionalPref] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Optional preferences state
  const [preferences, setPreferences] = useState({
    patientAge: "",
    budget: "",
    cashlessInsurance: false,
    emergencyNeeded: false,
  });

  const recognitionRef = useRef(null);

  // Voice Speech Recognition
  const toggleVoice = useCallback(() => {
    setVoiceError("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice search is not supported in this browser. Please type your requirement.");
      return;
    }

    if (isVoiceActive) {
      recognitionRef.current?.stop();
      setIsVoiceActive(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = activeLang === "hi" ? "hi-IN" : "en-IN";

        recognition.onstart = () => setIsVoiceActive(true);
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputQuery(prev => prev ? `${prev} ${transcript}` : transcript);
        };
        recognition.onerror = () => {
          setIsVoiceActive(false);
          setVoiceError("Could not capture audio. Please check microphone permissions or type.");
        };
        recognition.onend = () => setIsVoiceActive(false);

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error("Speech recognition error:", err);
        setIsVoiceActive(false);
      }
    }
  }, [isVoiceActive, activeLang]);

  // Primary Consultation Launch
  const handleStartConsultation = (e) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;

    let fullPrompt = inputQuery.trim();

    // Append optional preferences seamlessly if specified
    const addedContext = [];
    if (preferences.patientAge) addedContext.push(`Patient Age: ${preferences.patientAge}`);
    if (preferences.budget) addedContext.push(`Budget tier: ${preferences.budget}`);
    if (preferences.cashlessInsurance) addedContext.push("Cashless insurance required");
    if (preferences.emergencyNeeded) addedContext.push("Needs 24/7 Emergency care");

    if (addedContext.length > 0) {
      fullPrompt += ` (${addedContext.join(", ")})`;
    }

    startNewConsultation();
    navigate("/chat/new", { state: { initialMessage: fullPrompt } });
    setInputQuery("");
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteConversation(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const activeChats = conversations.filter(c => c.status === "ACTIVE" || c.status === "COMPLETED");
  const isHistoryTab = tab === "history";

  const locationLabel = selectedLocation?.city 
    ? `${selectedLocation.city}${selectedLocation.formattedAddress ? ` (${selectedLocation.formattedAddress.split(",")[0]})` : ""}`
    : selectedLocation?.formattedAddress
      ? selectedLocation.formattedAddress.split(",").slice(0, 2).join(",")
      : "Location not set";

  return (
    <div 
      className="flex-grow p-4 md:p-6 lg:p-8 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full space-y-6"
      role="main"
      aria-label={isHistoryTab ? "Consultation History" : "Healthcare Navigator"}
    >
      {/* 1. Universal Emergency Guidance Notice */}
      <EmergencyBanner />

      {/* 2. Location Transparency Bar */}
      <div className="bg-surface border border-outline-variant/30 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-secondary text-[20px] shrink-0" aria-hidden="true">
            near_me
          </span>
          <span className="text-xs text-on-surface-variant font-medium">
            Searching healthcare options near:
          </span>
          <span className="text-xs font-bold text-primary dark:text-primary-fixed truncate max-w-xs md:max-w-md">
            📍 {locationLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLocationModal(true)}
            className="text-xs font-semibold text-secondary hover:text-primary transition-colors underline cursor-pointer"
          >
            Change Location
          </button>
          {!selectedLocation && (
            <button
              onClick={requestGpsLocation}
              disabled={gpsStatus === "requesting"}
              className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">my_location</span>
              {gpsStatus === "requesting" ? "Detecting..." : "Use Current GPS"}
            </button>
          )}
        </div>
      </div>

      {isHistoryTab ? (
        // History Tab View
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-headline-lg font-bold text-primary dark:text-primary-fixed">
                {user?.displayName ? `${user.displayName}'s Consultation History` : "Consultation History"}
              </h2>
              <p className="text-body-md text-on-surface-variant mt-1 font-medium">
                Review your past healthcare inquiries and recommendations.
              </p>
            </div>
            <Button
              onClick={() => {
                startNewConsultation();
                navigate("/chat/new");
              }}
              variant="primary"
              icon="add"
            >
              New Search
            </Button>
          </div>

          {loadingConversations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : activeChats.length === 0 ? (
            <EmptyState
              icon="history"
              title="No Past Consultations"
              description="You have not conducted any healthcare searches yet. Describe what you need to discover suitable hospitals."
              action={{
                label: "Find Healthcare Options",
                icon: "search",
                onClick: () => {
                  startNewConsultation();
                  navigate("/chat/new");
                }
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeChats.map(chat => (
                <Card
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  hoverLift
                  variant="container"
                  className="p-5 relative group flex flex-col justify-between min-h-[160px] rounded-2xl border border-outline-variant/30 cursor-pointer"
                  aria-label={`Open consultation: ${chat.title || "Consultation"}`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-2.5">
                      <div className="w-9 h-9 bg-secondary-container text-on-secondary-container rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">local_hospital</span>
                      </div>

                      <button
                        disabled={deletingId === chat.id}
                        onClick={(e) => handleDelete(e, chat.id)}
                        className="text-outline hover:text-error transition-all p-1 rounded-full hover:bg-error-container/20 cursor-pointer"
                        aria-label={`Delete consultation: ${chat.title}`}
                      >
                        {deletingId === chat.id ? (
                          <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        )}
                      </button>
                    </div>

                    <h4 className="font-bold text-body-lg text-primary dark:text-primary-fixed mb-1 line-clamp-1">
                      {chat.title || "Healthcare Search"}
                    </h4>
                    <p className="text-body-sm text-on-surface-variant line-clamp-2">
                      {chat.lastMessage || "Search initiated."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/15 flex justify-between items-center text-xs text-outline font-medium">
                    <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                    <Badge variant={chat.status === "COMPLETED" ? "tertiary" : "secondary"}>
                      {chat.status === "COMPLETED" ? "Results Ready" : "In Progress"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Standard Home Healthcare Navigation View
        <div className="space-y-8">
          
          {/* 3. HERO & PRIMARY NATURAL-LANGUAGE INPUT */}
          <div className="text-center max-w-2xl mx-auto space-y-2.5 pt-1 pb-1">
            <h1 className="text-display-lg font-bold text-primary dark:text-primary-fixed tracking-tight">
              Find the right healthcare options for you.
            </h1>
            <p className="text-body-lg text-on-surface-variant leading-relaxed">
              Tell us what you need, and explore relevant hospitals based on your requirements, location, and available information.
            </p>
          </div>

          {/* Primary Input Card */}
          <Card 
            variant="container"
            className="p-5 md:p-7 border border-outline-variant/30 rounded-3xl shadow-sm max-w-3xl mx-auto space-y-4 bg-surface"
          >
            <form onSubmit={handleStartConsultation} className="space-y-3" aria-label="Healthcare search query">
              <div className="relative">
                <textarea
                  rows={3}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={
                    activeLang === "hi" 
                      ? "अपनी समस्या या लक्षण बताएं... (उदा. '2 दिन से सीने में दर्द' या 'हड्डी के विशेषज्ञ अस्पताल')"
                      : activeLang === "hinglish"
                        ? "Apni problem yahan batayein... (e.g. '2 din se stomach pain hai' ya 'Child specialist nearby chahiye')"
                        : "Tell us what you need... (e.g. 'Severe abdominal pain for 2 days' or 'Nearest hospital with pediatric ICU')"
                  }
                  className="w-full p-4 pr-14 text-body-lg rounded-2xl border border-outline-variant/40 bg-surface-container-low dark:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface resize-none placeholder:text-outline font-medium leading-relaxed"
                  aria-label="Healthcare need description"
                />

                {/* Integrated Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`absolute right-3.5 bottom-4 p-2.5 rounded-full transition-all cursor-pointer ${
                    isVoiceActive 
                      ? "bg-red-500 text-white animate-pulse shadow-md"
                      : "bg-surface-container hover:bg-secondary-container text-secondary hover:text-primary"
                  }`}
                  title={isVoiceActive ? "Recording... Click to stop" : "Speak your query (Voice Input)"}
                  aria-label={isVoiceActive ? "Stop voice recording" : "Start voice recording"}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {isVoiceActive ? "mic" : "mic_none"}
                  </span>
                </button>
              </div>

              {isVoiceActive && (
                <div className="flex items-center gap-2 text-xs font-semibold text-red-600 animate-pulse px-1">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  Listening in {activeLang === "hi" ? "Hindi" : "English/Hinglish"}... Speak clearly into your microphone.
                </div>
              )}

              {voiceError && (
                <p className="text-xs text-red-600 px-1 font-medium">{voiceError}</p>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Language Switcher for Samples */}
                <div className="flex items-center gap-1.5 self-start">
                  <span className="text-xs font-semibold text-outline mr-1">Language:</span>
                  <button
                    type="button"
                    onClick={() => setActiveLang("en")}
                    aria-pressed={activeLang === "en"}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeLang === "en" 
                        ? "bg-primary text-on-primary shadow-xs" 
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLang("hi")}
                    aria-pressed={activeLang === "hi"}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeLang === "hi" 
                        ? "bg-primary text-on-primary shadow-xs" 
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    हिन्दी
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLang("hinglish")}
                    aria-pressed={activeLang === "hinglish"}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeLang === "hinglish" 
                        ? "bg-primary text-on-primary shadow-xs" 
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    Hinglish
                  </button>
                </div>

                {/* Primary Action Button */}
                <Button
                  type="submit"
                  disabled={!inputQuery.trim()}
                  variant="primary"
                  className="font-bold px-7 py-3 rounded-full shadow-sm hover:shadow-md transition-all self-end sm:self-auto text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">search</span>
                  Search Suitable Hospitals
                </Button>
              </div>
            </form>

            {/* Quick Scenario Chips */}
            <div className="pt-2 border-t border-outline-variant/15 space-y-2">
              <span className="text-xs font-semibold text-outline uppercase tracking-wider block">
                Common healthcare queries:
              </span>
              <div className="flex flex-wrap gap-2">
                {SCENARIOS[activeLang].map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInputQuery(s.text)}
                    className="text-xs font-medium text-on-surface-variant bg-surface-container-low hover:bg-secondary-container hover:text-primary px-3.5 py-1.5 rounded-full border border-outline-variant/20 transition-all cursor-pointer text-left"
                  >
                    💡 {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. OPTIONAL INFORMATION ACCORDION (No interrogation) */}
            <div className="pt-2 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={() => setShowOptionalPref(!showOptionalPref)}
                className="w-full flex items-center justify-between text-xs font-bold text-secondary hover:text-primary transition-colors cursor-pointer py-1"
                aria-expanded={showOptionalPref}
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  Want to refine your recommendations? (Optional)
                </span>
                <span className={`material-symbols-outlined text-[18px] transition-transform ${showOptionalPref ? "rotate-180" : ""}`}>
                  expand_more
                </span>
              </button>

              {showOptionalPref && (
                <div className="mt-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in text-xs">
                  {/* Age Group */}
                  <div className="space-y-1">
                    <label className="font-semibold text-on-surface-variant block">Patient Age Group</label>
                    <select
                      value={preferences.patientAge}
                      onChange={(e) => setPreferences(p => ({ ...p, patientAge: e.target.value }))}
                      className="w-full p-2 bg-surface rounded-xl border border-outline-variant/30 text-on-surface font-medium focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Any Age</option>
                      <option value="Infant / Child (<12)">Infant / Child (&lt;12)</option>
                      <option value="Adult (18-59)">Adult (18-59)</option>
                      <option value="Elderly (60+)">Elderly (60+)</option>
                    </select>
                  </div>

                  {/* Budget */}
                  <div className="space-y-1">
                    <label className="font-semibold text-on-surface-variant block">Budget Preference</label>
                    <select
                      value={preferences.budget}
                      onChange={(e) => setPreferences(p => ({ ...p, budget: e.target.value }))}
                      className="w-full p-2 bg-surface rounded-xl border border-outline-variant/30 text-on-surface font-medium focus:ring-1 focus:ring-primary"
                    >
                      <option value="">No Preference</option>
                      <option value="Budget-friendly / Govt">Budget-friendly</option>
                      <option value="Standard Private">Standard Private</option>
                      <option value="Premium Tertiary">Premium Tertiary</option>
                    </select>
                  </div>

                  {/* Cashless Insurance */}
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="optCashless"
                      checked={preferences.cashlessInsurance}
                      onChange={(e) => setPreferences(p => ({ ...p, cashlessInsurance: e.target.checked }))}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <label htmlFor="optCashless" className="font-semibold text-on-surface cursor-pointer select-none">
                      Cashless Insurance
                    </label>
                  </div>

                  {/* 24/7 Emergency */}
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="optEmergency"
                      checked={preferences.emergencyNeeded}
                      onChange={(e) => setPreferences(p => ({ ...p, emergencyNeeded: e.target.checked }))}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <label htmlFor="optEmergency" className="font-semibold text-on-surface cursor-pointer select-none">
                      24/7 Emergency ICU
                    </label>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 5. Trust & Decision Support Reassurance */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-surface border border-outline-variant/20 p-4 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[24px] shrink-0 mt-0.5">
                verified
              </span>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                  Accredited Data
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Verified hospital registries, NABH/JCI status, ICU capacities, and clinical departments.
                </p>
              </div>
            </div>

            <div className="bg-surface border border-outline-variant/20 p-4 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[24px] shrink-0 mt-0.5">
                payments
              </span>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                  Cost Transparency
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Regional treatment estimates and insurance acceptance indications to avoid surprise billing.
                </p>
              </div>
            </div>

            <div className="bg-surface border border-outline-variant/20 p-4 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[24px] shrink-0 mt-0.5">
                health_and_safety
              </span>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                  Patient First
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Objective recommendations ranked by distance, specialty match, and community reviews.
                </p>
              </div>
            </div>
          </div>

          {/* 6. Recent Searches / Consultations */}
          {activeChats.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-body-lg font-bold text-primary dark:text-primary-fixed">
                  Recent Consultations
                </h3>
                <Link to="/history" className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1">
                  View All History
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeChats.slice(0, 4).map(chat => (
                  <Link
                    key={chat.id}
                    to={`/chat/${chat.id}`}
                    className="p-4 bg-surface hover:bg-surface-container-low border border-outline-variant/25 rounded-2xl transition-all flex items-center justify-between group shadow-xs hover:shadow-sm"
                  >
                    <div className="space-y-1 min-w-0 pr-3">
                      <h4 className="font-bold text-sm text-primary dark:text-primary-fixed group-hover:text-secondary transition-colors truncate">
                        {chat.title || "Healthcare Search"}
                      </h4>
                      <p className="text-xs text-outline flex items-center gap-1.5">
                        <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={chat.status === "COMPLETED" ? "text-tertiary font-semibold" : ""}>
                          {chat.status === "COMPLETED" ? "Hospitals Recommended" : "In Progress"}
                        </span>
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px] shrink-0">
                      chevron_right
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Non-Diagnostic Disclaimer footer */}
          <div className="max-w-3xl mx-auto text-center pt-4 pb-2">
            <p className="text-[11px] text-outline leading-relaxed">
              <strong>Medical Disclaimer:</strong> MedPath is an intelligent healthcare navigation and facility discovery service. MedPath does not diagnose diseases, interpret lab findings, or replace clinical consultation with a licensed physician. If you are experiencing a life-threatening medical emergency, call 112 or visit an emergency room immediately.
            </p>
          </div>

        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <LocationPermissionModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onConfirm={() => setShowLocationModal(false)}
        />
      )}
    </div>
  );
}

export default DashboardPage;
