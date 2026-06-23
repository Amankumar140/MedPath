import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import reviewService from "../services/review.service";
import { useTheme } from "../context/ThemeContext";

export function ReviewWizardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Inputs passed from route state (or fallback if empty)
  const routeState = location.state || {};
  const isResumedDraft = !!routeState.resumeDraft;

  // Review Form States
  const [reviewId, setReviewId] = useState(routeState.id || null);
  const [conversationId, setConversationId] = useState(routeState.conversationId || "");
  const [recommendationSnapshotId, setRecommendationSnapshotId] = useState(routeState.recommendationSnapshotId || "");
  const [hospitalName, setHospitalName] = useState(routeState.hospitalName || "Selected Hospital");
  const [estimatedCost, setEstimatedCost] = useState(routeState.estimatedCost || "N/A");

  // Questionnaire Field States
  const [visited, setVisited] = useState(
    routeState.visited !== undefined ? routeState.visited : null
  );
  const [treatmentType, setTreatmentType] = useState(routeState.treatmentType || "");
  const [actualCost, setActualCost] = useState(
    routeState.actualCost !== undefined && routeState.actualCost !== null ? routeState.actualCost : ""
  );
  const [costAccuracy, setCostAccuracy] = useState(routeState.costAccuracy || "");
  const [doctorQuality, setDoctorQuality] = useState(routeState.doctorQuality || 0);
  const [diagnosisExplanation, setDiagnosisExplanation] = useState(routeState.diagnosisExplanation || 0);
  const [waitingTimeRating, setWaitingTimeRating] = useState(routeState.waitingTimeRating || 0);
  const [facilityRating, setFacilityRating] = useState(routeState.facilityRating || 0);
  const [staffRating, setStaffRating] = useState(routeState.staffRating || 0);
  const [billingTransparency, setBillingTransparency] = useState(routeState.billingTransparency || 0);
  const [hiddenCharges, setHiddenCharges] = useState(routeState.hiddenCharges || "");
  const [specialtyMatch, setSpecialtyMatch] = useState(routeState.specialtyMatch || 0);
  const [medpathAccuracy, setMedpathAccuracy] = useState(routeState.medpathAccuracy || 0);
  const [hospitalRecommendation, setHospitalRecommendation] = useState(routeState.hospitalRecommendation || "");
  const [reviewText, setReviewText] = useState(routeState.reviewText || "");

  // Wizard Navigation & UX States
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Redirect if missing critical snapshot link (safety guard)
  useEffect(() => {
    if (!recommendationSnapshotId || !conversationId) {
      console.warn("Review Wizard launched without snapshot context. Redirecting to reviews history.");
      navigate("/hospitals", { state: { activeTab: "feedback" } });
    }
  }, [recommendationSnapshotId, conversationId, navigate]);

  // Questions configuration
  const allQuestions = useMemo(() => [
    {
      id: 1,
      key: "visited",
      label: "Did you actually visit this hospital?",
      type: "boolean",
      description: "Answer yes to review your clinical experience, or no if you chose a different path."
    },
    {
      id: 2,
      key: "treatmentType",
      label: "What treatment or consultation did you receive?",
      type: "text",
      placeholder: "e.g. General health checkup, dental cleaning, cardiology consultation",
      description: "Briefly describe the clinical specialty or service received."
    },
    {
      id: 3,
      key: "actualCost",
      label: "What was the total amount you paid?",
      type: "currency",
      placeholder: "0.00",
      description: "Total out-of-pocket billing (consultation, pharmacy, diagnostics, surgery)."
    },
    {
      id: 4,
      key: "costAccuracy",
      label: "How close was MedPath's estimated cost?",
      type: "options",
      choices: ["Very Accurate", "Accurate", "Slightly Different", "Very Different"],
      description: `MedPath estimated: ${estimatedCost}. Help us assess its accuracy.`
    },
    {
      id: 5,
      key: "doctorQuality",
      label: "Rate the doctor's expertise and treatment.",
      type: "stars",
      description: "Expertise, diagnosis accuracy, treatment efficacy, and clinical advice."
    },
    {
      id: 6,
      key: "diagnosisExplanation",
      label: "Were the diagnosis and treatment clearly explained?",
      type: "stars",
      description: "Communication of medical condition, treatment steps, risks, and next steps."
    },
    {
      id: 7,
      key: "waitingTimeRating",
      label: "Rate the waiting time before receiving medical attention.",
      type: "stars",
      description: "Timeliness of admission, triaging, and doctor consultation."
    },
    {
      id: 8,
      key: "facilityRating",
      label: "Rate the hospital facilities and cleanliness.",
      type: "stars",
      description: "Cleanliness of wards, equipment quality, waiting areas, and hygiene."
    },
    {
      id: 9,
      key: "staffRating",
      label: "Rate the hospital staff and support services.",
      type: "stars",
      description: "Politeness, helpfulness, scheduling ease, and support from nursing/admin staff."
    },
    {
      id: 10,
      key: "billingTransparency",
      label: "How transparent was the billing process?",
      type: "stars",
      description: "Clear breakdown of charges, easy explanation, and lack of confusion."
    },
    {
      id: 11,
      key: "hiddenCharges",
      label: "Were there any unexpected or hidden charges?",
      type: "options",
      choices: ["None", "Minor", "Moderate", "Significant"],
      description: "Any surprise costs, administrative fees, or unquoted service charges."
    },
    {
      id: 12,
      key: "specialtyMatch",
      label: "Was this hospital appropriate for your medical condition?",
      type: "stars",
      description: "Did the hospital have the necessary specialists and care departments for your need?"
    },
    {
      id: 13,
      key: "medpathAccuracy",
      label: "How accurate was MedPath's recommendation?",
      type: "stars",
      description: "Did MedPath guide you to the right type of facility matching your symptoms?"
    },
    {
      id: 14,
      key: "hospitalRecommendation",
      label: "Would you recommend this hospital to others?",
      type: "options",
      choices: ["Definitely", "Probably", "Maybe", "Probably Not", "Never"],
      description: "Based on your overall experience, would you suggest this clinic to other patients?"
    },
    {
      id: 15,
      key: "reviewText",
      label: "Additional comments",
      type: "textarea",
      placeholder: "Share any experience that could help future patients.",
      description: "Provide any additional details that could be useful to clinical operations (optional)."
    }
  ], [estimatedCost]);

  // Dynamically compute step indexing based on visited status
  const activeQuestions = useMemo(() => {
    if (visited === false) {
      // Skip Q2-Q11 if did not visit
      return allQuestions.filter(q => [1, 12, 13, 14, 15].includes(q.id));
    }
    // Visited: Yes or Null (not selected yet) -> show all
    return allQuestions;
  }, [visited, allQuestions]);

  const currentQuestion = activeQuestions[currentStepIndex];

  // Helper: compile current form payload
  const getPayload = (statusType = "DRAFT") => {
    return {
      conversationId,
      recommendationSnapshotId,
      hospitalName,
      estimatedCost,
      visited,
      treatmentType: visited ? treatmentType : null,
      actualCost: visited && actualCost !== "" ? parseFloat(actualCost) : null,
      costAccuracy: visited ? costAccuracy : null,
      doctorQuality: visited ? doctorQuality : null,
      diagnosisExplanation: visited ? diagnosisExplanation : null,
      waitingTimeRating: visited ? waitingTimeRating : null,
      facilityRating: visited ? facilityRating : null,
      staffRating: visited ? staffRating : null,
      billingTransparency: visited ? billingTransparency : null,
      hiddenCharges: visited ? hiddenCharges : null,
      specialtyMatch,
      medpathAccuracy,
      hospitalRecommendation,
      reviewText: reviewText || null,
      status: statusType,
    };
  };

  // Save draft logic (POST if new, PATCH if exists)
  const saveDraft = async (quiet = false) => {
    try {
      setIsSaving(true);
      const payload = getPayload("DRAFT");
      
      let res;
      if (reviewId) {
        res = await reviewService.updateReview(reviewId, payload);
      } else {
        res = await reviewService.createReview(payload);
        if (res.success && res.data?.id) {
          setReviewId(res.data.id);
        }
      }
      
      if (!quiet) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
      return true;
    } catch (err) {
      console.error("Failed to save draft review:", err);
      if (!quiet) {
        alert("Failed to auto-save draft. Please check your network.");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Exit and save draft logic
  const handleResumeLater = async () => {
    const success = await saveDraft(true);
    if (success) {
      navigate("/hospitals", { state: { activeTab: "feedback" } });
    }
  };

  // Client-side validator for the current question step
  const validateCurrentStep = () => {
    const errors = {};
    if (!currentQuestion) return true;

    const valueKey = currentQuestion.key;
    
    // Validate Step 1
    if (valueKey === "visited" && visited === null) {
      errors.visited = "Please select Yes or No to proceed.";
    }
    
    // Visited specific validations
    if (visited === true) {
      if (valueKey === "treatmentType" && !treatmentType.trim()) {
        errors.treatmentType = "Please enter the treatment or consultation name.";
      }
      if (valueKey === "actualCost") {
        if (actualCost === "") {
          errors.actualCost = "Please enter the actual total cost.";
        } else if (isNaN(actualCost) || parseFloat(actualCost) < 0) {
          errors.actualCost = "Please enter a valid, positive cost amount.";
        }
      }
      if (valueKey === "costAccuracy" && !costAccuracy) {
        errors.costAccuracy = "Please select one of the cost accuracy options.";
      }
      if (valueKey === "doctorQuality" && doctorQuality === 0) {
        errors.doctorQuality = "Please rate the doctor's expertise and treatment.";
      }
      if (valueKey === "diagnosisExplanation" && diagnosisExplanation === 0) {
        errors.diagnosisExplanation = "Please rate diagnosis and treatment explanation.";
      }
      if (valueKey === "waitingTimeRating" && waitingTimeRating === 0) {
        errors.waitingTimeRating = "Please rate the waiting time.";
      }
      if (valueKey === "facilityRating" && facilityRating === 0) {
        errors.facilityRating = "Please rate the hospital facilities.";
      }
      if (valueKey === "staffRating" && staffRating === 0) {
        errors.staffRating = "Please rate the medical doctors and staff.";
      }
      if (valueKey === "billingTransparency" && billingTransparency === 0) {
        errors.billingTransparency = "Please rate billing transparency.";
      }
      if (valueKey === "hiddenCharges" && !hiddenCharges) {
        errors.hiddenCharges = "Please select one of the hidden charges choices.";
      }
    }
    
    // Common validations
    if (valueKey === "specialtyMatch" && specialtyMatch === 0) {
      errors.specialtyMatch = "Please rate if the hospital was appropriate for your condition.";
    }
    if (valueKey === "medpathAccuracy" && medpathAccuracy === 0) {
      errors.medpathAccuracy = "Please rate the accuracy of MedPath's recommendation.";
    }
    if (valueKey === "hospitalRecommendation" && !hospitalRecommendation) {
      errors.hospitalRecommendation = "Please select whether you recommend this hospital.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Next step handler
  const handleNext = async () => {
    if (!validateCurrentStep()) return;
    
    // Auto-save draft on moving forward
    await saveDraft(true);

    if (currentStepIndex < activeQuestions.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  // Previous step handler
  const handlePrev = () => {
    setValidationErrors({});
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Submit complete review
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      const payload = getPayload("COMPLETED");
      let res;
      if (reviewId) {
        res = await reviewService.updateReview(reviewId, payload);
      } else {
        res = await reviewService.createReview(payload);
      }

      if (res.success) {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      // Retrieve error details from backend response
      const serverDetails = err.response?.data?.error?.details;
      if (serverDetails && Array.isArray(serverDetails)) {
        const errors = {};
        serverDetails.forEach(d => {
          errors[d.field] = d.message;
        });
        setValidationErrors(errors);
        
        // Find index of the first field that has an error
        const firstErrField = serverDetails[0].field;
        const targetQIndex = activeQuestions.findIndex(q => q.key === firstErrField);
        if (targetQIndex !== -1) {
          setCurrentStepIndex(targetQIndex);
        }
      } else {
        alert("Submission failed. Ensure all fields are filled correctly.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thank You Screen Component
  if (isSubmitted) {
    return (
      <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full flex flex-col items-center justify-center min-h-[80vh]">
        <div className="glass-card rounded-[32px] p-8 md:p-12 text-center max-w-2xl mx-auto shadow-xl border border-outline-variant/15 space-y-6 flex flex-col items-center animate-scale-up">
          
          {/* Animated Success Badge */}
          <div className="w-20 h-20 rounded-full bg-success/15 dark:bg-success-container/30 text-success flex items-center justify-center mb-2 animate-bounce">
            <span className="material-symbols-outlined text-[48px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-headline-lg font-bold text-primary dark:text-primary-fixed">
              Thank You for Your Feedback!
            </h3>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              Your outcomes and experience reports have been logged in MedPath's intelligence system. 
              This helps the research team calibrate recommendation accuracy for the community.
            </p>
          </div>

          {/* Review Summary Snapshot card */}
          <div className="w-full bg-surface-container-low dark:bg-surface-container-high/20 border border-outline-variant/10 rounded-2xl p-5 text-left space-y-3">
            <h4 className="text-label-sm font-semibold text-outline uppercase tracking-wider">
              Feedback Summary
            </h4>
            <div className="space-y-1.5 text-sm">
              <p className="flex justify-between">
                <span className="text-outline">Hospital:</span>
                <span className="font-semibold text-primary">{hospitalName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-outline">Visited:</span>
                <span className="font-semibold text-primary">{visited ? "Yes" : "No"}</span>
              </p>
              {visited && treatmentType && (
                <p className="flex justify-between">
                  <span className="text-outline">Treatment:</span>
                  <span className="font-semibold text-primary">{treatmentType}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span className="text-outline">MedPath AI Rating:</span>
                <span className="font-semibold text-primary flex items-center gap-1">
                  {medpathAccuracy} / 5
                  <span className="material-symbols-outlined text-[15px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
            <button
              onClick={() => navigate("/hospitals", { state: { activeTab: "feedback" } })}
              className="flex-1 bg-primary text-on-primary hover:opacity-95 transition-all py-3.5 rounded-xl font-label-md shadow-md cursor-pointer"
            >
              Go to Feedback Panel
            </button>
            <button
              onClick={() => navigate("/home")}
              className="flex-1 bg-surface-container-high hover:bg-surface-container hover:text-primary transition-all py-3.5 rounded-xl font-label-md border border-outline-variant/20 cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wizard Screen Layout
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === activeQuestions.length - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / activeQuestions.length) * 100);

  return (
    <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full flex flex-col items-center justify-center min-h-[85vh] animate-slide-up">
      
      {/* Wizard Card Container */}
      <div className="w-full max-w-2xl premium-glass-card rounded-[28px] border border-outline-variant/15 flex flex-col overflow-hidden relative min-h-[480px]">
        
        {/* Top Progress bar and Indicator */}
        <div className="bg-surface-container-low dark:bg-surface-container-high/30 p-5 border-b border-outline-variant/10">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-[10px] text-outline uppercase tracking-wider font-bold block">
                {hospitalName}
              </span>
              <h3 className="text-label-lg font-bold text-primary dark:text-primary-fixed">
                Question {currentStepIndex + 1} of {activeQuestions.length}
              </h3>
            </div>
            
            {/* Auto-saved draft toast pill inside header */}
            <div className="flex items-center gap-1.5 font-bold">
              {saveSuccess ? (
                <span className="bg-success-container/30 text-success text-xs px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                  Draft Saved
                </span>
              ) : isSaving ? (
                <span className="text-outline text-xs px-2.5 py-1 flex items-center gap-1">
                  <div className="w-2.5 h-2.5 border border-outline border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                <span className="text-outline-variant dark:text-outline text-xs italic">
                  Progress saved automatically
                </span>
              )}
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300 rounded-full" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Content Question Panel */}
        <div className="flex-grow p-6 md:p-8 flex flex-col justify-center gap-4">
          
          <div className="space-y-1">
            <label className="text-headline-md font-bold text-primary dark:text-primary-fixed block leading-tight">
              {currentQuestion?.label}
            </label>
            {currentQuestion?.description && (
              <span className="text-body-sm text-outline block font-medium">
                {currentQuestion.description}
              </span>
            )}
          </div>

          {/* Question Inputs Branches */}
          <div className="pt-4 flex-grow flex items-center justify-center w-full">
            
            {/* 1. Boolean Input (Q1: Visited) */}
            {currentQuestion?.type === "boolean" && (
              <div className="flex gap-4 w-full justify-center max-w-md">
                <button
                  onClick={() => {
                    setVisited(true);
                    setValidationErrors({});
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer hover-lift ${
                    visited === true
                      ? "border-primary bg-primary/5 text-primary dark:border-primary-fixed dark:text-primary-fixed"
                      : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-[40px] mb-2" style={{ fontVariationSettings: visited === true ? "'FILL' 1" : "'FILL' 0" }}>check_circle</span>
                  <span className="font-bold text-base">Yes, I visited</span>
                </button>
                <button
                  onClick={() => {
                    setVisited(false);
                    setValidationErrors({});
                    // Reset visited-only inputs
                    setTreatmentType("");
                    setActualCost("");
                    setCostAccuracy("");
                    setDoctorQuality(0);
                    setDiagnosisExplanation(0);
                    setWaitingTimeRating(0);
                    setFacilityRating(0);
                    setStaffRating(0);
                    setBillingTransparency(0);
                    setHiddenCharges("");
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer hover-lift ${
                    visited === false
                      ? "border-primary bg-primary/5 text-primary dark:border-primary-fixed dark:text-primary-fixed"
                      : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-[40px] mb-2" style={{ fontVariationSettings: visited === false ? "'FILL' 1" : "'FILL' 0" }}>cancel</span>
                  <span className="font-bold text-base">No, I did not</span>
                </button>
              </div>
            )}

            {/* 2. Text Input (Q2: Treatment Type) */}
            {currentQuestion?.type === "text" && (
              <div className="w-full">
                <input
                  type="text"
                  value={treatmentType}
                  onChange={(e) => {
                    setTreatmentType(e.target.value);
                    setValidationErrors({});
                  }}
                  placeholder={currentQuestion.placeholder}
                  className="w-full bg-surface-container-lowest border border-outline rounded-xl p-4 text-on-surface font-body-md focus:ring-2 focus:ring-secondary/50 focus:outline-none transition-all shadow-inner"
                  aria-label={currentQuestion.label}
                  autoFocus
                />
              </div>
            )}

            {/* 3. Currency Input (Q3: Actual Cost) */}
            {currentQuestion?.type === "currency" && (
              <div className="w-full relative flex items-center">
                <span className="absolute left-4 text-on-surface-variant font-bold text-lg">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCost}
                  onChange={(e) => {
                    setActualCost(e.target.value);
                    setValidationErrors({});
                  }}
                  placeholder={currentQuestion.placeholder}
                  className="w-full bg-surface-container-lowest border border-outline rounded-xl py-4 pl-8 pr-4 text-on-surface font-body-md focus:ring-2 focus:ring-secondary/50 focus:outline-none transition-all shadow-inner text-lg"
                  aria-label={currentQuestion.label}
                  autoFocus
                />
              </div>
            )}

            {/* 4. Options Input */}
            {currentQuestion?.type === "options" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-lg">
                {currentQuestion.choices.map((choice) => {
                  let isSelected = false;
                  if (currentQuestion.key === "costAccuracy") {
                    isSelected = costAccuracy === choice;
                  } else if (currentQuestion.key === "hiddenCharges") {
                    isSelected = hiddenCharges === choice;
                  } else if (currentQuestion.key === "hospitalRecommendation") {
                    isSelected = hospitalRecommendation === choice;
                  }

                  const handleClick = () => {
                    if (currentQuestion.key === "costAccuracy") {
                       setCostAccuracy(choice);
                    } else if (currentQuestion.key === "hiddenCharges") {
                       setHiddenCharges(choice);
                    } else if (currentQuestion.key === "hospitalRecommendation") {
                       setHospitalRecommendation(choice);
                    }
                    setValidationErrors({});
                  };

                  return (
                    <button
                      key={choice}
                      onClick={handleClick}
                      className={`p-4 rounded-xl border transition-all text-left font-bold text-label-md cursor-pointer flex items-center gap-3 hover-lift ${
                        isSelected
                          ? "border-secondary text-secondary bg-secondary/10 dark:border-secondary-fixed dark:text-secondary-fixed shadow-sm"
                          : "border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}>
                        {isSelected ? "radio_button_checked" : "radio_button_unchecked"}
                      </span>
                      {choice}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 5. Stars Input */}
            {currentQuestion?.type === "stars" && (
              <div className="flex flex-col items-center gap-3.5">
                <div className="flex gap-1.5" role="radiogroup" aria-label={currentQuestion.label}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    let ratingValue = 0;
                    if (currentQuestion.key === "doctorQuality") ratingValue = doctorQuality;
                    else if (currentQuestion.key === "diagnosisExplanation") ratingValue = diagnosisExplanation;
                    else if (currentQuestion.key === "waitingTimeRating") ratingValue = waitingTimeRating;
                    else if (currentQuestion.key === "facilityRating") ratingValue = facilityRating;
                    else if (currentQuestion.key === "staffRating") ratingValue = staffRating;
                    else if (currentQuestion.key === "billingTransparency") ratingValue = billingTransparency;
                    else if (currentQuestion.key === "specialtyMatch") ratingValue = specialtyMatch;
                    else if (currentQuestion.key === "medpathAccuracy") ratingValue = medpathAccuracy;

                    const setRating = (val) => {
                      if (currentQuestion.key === "doctorQuality") setDoctorQuality(val);
                      else if (currentQuestion.key === "diagnosisExplanation") setDiagnosisExplanation(val);
                      else if (currentQuestion.key === "waitingTimeRating") setWaitingTimeRating(val);
                      else if (currentQuestion.key === "facilityRating") setFacilityRating(val);
                      else if (currentQuestion.key === "staffRating") setStaffRating(val);
                      else if (currentQuestion.key === "billingTransparency") setBillingTransparency(val);
                      else if (currentQuestion.key === "specialtyMatch") setSpecialtyMatch(val);
                      else if (currentQuestion.key === "medpathAccuracy") setMedpathAccuracy(val);
                      setValidationErrors({});
                    };

                    const isHighlighted = star <= ratingValue;

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-outline hover:text-amber-500 hover:scale-110 transition-all cursor-pointer p-1.5`}
                        role="radio"
                        aria-checked={star === ratingValue}
                      >
                        <span 
                          className="material-symbols-outlined text-[46px]"
                          style={{ fontVariationSettings: isHighlighted ? "'FILL' 1" : "'FILL' 0", color: isHighlighted ? '#f59e0b' : 'inherit' }}
                        >
                          star
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Star Description label helper */}
                <div className="text-label-md font-bold text-secondary min-h-[22px] bg-secondary/5 px-4.5 py-1 rounded-full border border-secondary/15">
                  {(() => {
                    let ratingVal = 0;
                    if (currentQuestion.key === "doctorQuality") ratingVal = doctorQuality;
                    else if (currentQuestion.key === "diagnosisExplanation") ratingVal = diagnosisExplanation;
                    else if (currentQuestion.key === "waitingTimeRating") ratingVal = waitingTimeRating;
                    else if (currentQuestion.key === "facilityRating") ratingVal = facilityRating;
                    else if (currentQuestion.key === "staffRating") ratingVal = staffRating;
                    else if (currentQuestion.key === "billingTransparency") ratingVal = billingTransparency;
                    else if (currentQuestion.key === "specialtyMatch") ratingVal = specialtyMatch;
                    else if (currentQuestion.key === "medpathAccuracy") ratingVal = medpathAccuracy;
                    
                    if (ratingVal === 5) return "Excellent";
                    if (ratingVal === 4) return "Very Good";
                    if (ratingVal === 3) return "Good";
                    if (ratingVal === 2) return "Fair";
                    if (ratingVal === 1) return "Poor";
                    return "Select a rating";
                  })()}
                </div>
              </div>
            )}

            {/* 6. Textarea Input */}
            {currentQuestion?.type === "textarea" && (
              <div className="w-full">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  className="w-full bg-surface-container-lowest border border-outline rounded-xl p-4 text-on-surface font-body-md focus:ring-2 focus:ring-secondary/50 focus:outline-none transition-all shadow-inner min-h-[140px] max-h-[220px]"
                  aria-label={currentQuestion.label}
                  rows="4"
                  autoFocus
                />
              </div>
            )}

          </div>

          {/* Validation error block */}
          {validationErrors[currentQuestion?.key] && (
            <div className="text-error text-label-sm font-bold flex items-center gap-1.5 justify-center py-2.5 bg-error-container/10 border border-error/15 rounded-xl animate-bounce" role="alert">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              {validationErrors[currentQuestion?.key]}
            </div>
          )}

        </div>

        {/* Bottom Control Buttons Navigation */}
        <div className="bg-surface-container-low dark:bg-surface-container-high/30 p-5 border-t border-outline-variant/10 flex justify-between items-center gap-3">
          
          {/* Left Buttons: Resume Later / Previous */}
          <div className="flex gap-2">
            <button
              onClick={handleResumeLater}
              className="px-4 py-2.5 rounded-lg border border-outline-variant/40 hover:bg-surface text-label-md font-label-md transition-all cursor-pointer text-sm"
              aria-label="Save and resume later"
              disabled={isSaving || isSubmitting}
            >
              Resume Later
            </button>
            
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-lg hover:bg-surface text-label-md font-label-md transition-all cursor-pointer text-sm flex items-center gap-1 text-on-surface"
                aria-label="Go to previous question"
                disabled={isSaving || isSubmitting}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Previous
              </button>
            )}
          </div>

          {/* Right Buttons: Save Draft / Next or Submit */}
          <div className="flex gap-2">
            {/* Manual Save Draft Button */}
            <button
              onClick={() => saveDraft(false)}
              className="px-4 py-2.5 rounded-lg text-secondary hover:bg-secondary/5 transition-all text-sm font-semibold cursor-pointer flex items-center gap-1"
              aria-label="Save current draft"
              disabled={isSaving || isSubmitting}
            >
              {isSaving ? "Saving..." : "Save Draft"}
            </button>

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                className="bg-primary text-on-primary hover:opacity-95 transition-all px-5 py-2.5 rounded-lg font-label-md cursor-pointer flex items-center gap-1.5 shadow-sm text-sm"
                aria-label="Submit finished review"
                disabled={isSubmitting || isSaving}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    Submit Review
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-primary text-on-primary hover:opacity-95 transition-all px-5 py-2.5 rounded-lg font-label-md cursor-pointer flex items-center gap-1 text-sm shadow-sm"
                aria-label="Go to next question"
                disabled={isSaving || isSubmitting}
              >
                Next
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default ReviewWizardPage;
