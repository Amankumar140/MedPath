import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import reviewService from "../services/review.service";
import { useTheme } from "../context/ThemeContext";
import { Card, Button, Badge, EmptyState } from "../components/ui";

export function ReviewsDashboardPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const [activeTab, setActiveTab] = useState("pending"); // pending, drafts, completed
  const [history, setHistory] = useState({ completed: [], drafts: [], pending: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch reviews history on load
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await reviewService.getReviewsHistory();
      if (res.success && res.data) {
        setHistory(res.data);
        
        // Auto switch tab if pending is empty but drafts or completed have items
        if (res.data.pending.length === 0) {
          if (res.data.drafts.length > 0) {
            setActiveTab("drafts");
          } else if (res.data.completed.length > 0) {
            setActiveTab("completed");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load reviews history:", err);
      setError("Failed to retrieve reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this review/draft? This action cannot be undone.")) {
      return;
    }
    
    setDeletingId(id);
    try {
      await reviewService.deleteReview(id);
      setSuccessMessage("Review deleted successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchReviews();
    } catch (err) {
      console.error("Failed to delete review:", err);
      alert("Failed to delete review. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="text-outline-variant font-body-sm italic">Not rated</span>;
    return (
      <div className="flex text-amber-500 gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full animate-slide-up" role="main" aria-label="Reviews and Hospital Intelligence Dashboard">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
        <div>
          <h2 className="text-headline-lg font-headline-lg font-bold premium-text-gradient">
            Hospital Feedback & Intelligence
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1.5 font-medium">
            Provide feedback about your hospital visits to help improve MedPath's recommendations.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-success-container/20 border border-success/15 text-on-success-container px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2 animate-fade-in" role="status">
          <span className="material-symbols-outlined text-[18px] text-success">check_circle</span>
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-error-container/20 border border-error/15 text-on-error-container px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2" role="alert">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="border-b border-outline-variant/15 flex gap-4 md:gap-8 mb-6 overflow-x-auto scrollbar-none" role="tablist">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3.5 text-label-lg font-bold border-b-3 transition-all relative shrink-0 cursor-pointer ${
            activeTab === "pending"
              ? "border-primary text-primary dark:border-primary-fixed dark:text-primary-fixed font-bold text-[15px]"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "pending"}
          aria-controls="pending-panel"
        >
          Pending Reviews
          {history.pending.length > 0 && (
            <span className="ml-2 bg-secondary text-on-secondary text-xs px-2 py-0.5 rounded-full font-bold">
              {history.pending.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("drafts")}
          className={`pb-3.5 text-label-lg font-bold border-b-3 transition-all relative shrink-0 cursor-pointer ${
            activeTab === "drafts"
              ? "border-primary text-primary dark:border-primary-fixed dark:text-primary-fixed font-bold text-[15px]"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "drafts"}
          aria-controls="drafts-panel"
        >
          Draft Reviews
          {history.drafts.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {history.drafts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-3.5 text-label-lg font-bold border-b-3 transition-all relative shrink-0 cursor-pointer ${
            activeTab === "completed"
              ? "border-primary text-primary dark:border-primary-fixed dark:text-primary-fixed font-bold text-[15px]"
              : "border-transparent text-outline hover:text-on-surface"
          }`}
          role="tab"
          aria-selected={activeTab === "completed"}
          aria-controls="completed-panel"
        >
          Completed Reviews
          {history.completed.length > 0 && (
            <span className="ml-2 bg-primary-container text-primary dark:bg-primary-container/30 dark:text-primary-fixed text-xs px-2 py-0.5 rounded-full font-bold">
              {history.completed.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-on-surface-variant font-bold mt-4 animate-pulse">Loading feedback records...</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* 1. Pending Reviews Tab */}
          {activeTab === "pending" && (
            <div id="pending-panel" role="tabpanel" className="animate-fade-in">
              {history.pending.length === 0 ? (
                <EmptyState
                  icon="clinical_notes"
                  title="All Reviews Complete"
                  description="You have reviewed all your recommended clinics. Complete new AI consultations to rate more services."
                  action={{
                    label: "Start New Consultation",
                    icon: "add",
                    onClick: () => navigate("/chat/new")
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {history.pending.map((item) => (
                    <Card
                      key={item.recommendationSnapshotId}
                      variant="glass"
                      hoverLift
                      className="p-5 border border-outline-variant/15 flex flex-col justify-between gap-4 shadow-sm"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-3">
                          <h4 className="text-body-lg font-bold text-primary dark:text-primary-fixed leading-tight">
                            {item.hospitalName}
                          </h4>
                          <Badge variant="secondary">
                            Pending Review
                          </Badge>
                        </div>
                        <p className="text-label-sm text-outline mt-2 flex items-center gap-1.5 font-semibold">
                          <span className="material-symbols-outlined text-[15px] text-secondary">chat_bubble</span>
                          <span>From: {item.conversationTitle}</span>
                        </p>
                        <p className="text-label-sm text-outline flex items-center gap-1.5 mt-0.5 font-semibold">
                          <span className="material-symbols-outlined text-[15px] text-primary">calendar_month</span>
                          <span>Recommended: {new Date(item.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-outline-variant/10">
                        <span className="text-[11px] text-outline uppercase tracking-wider font-bold">
                          Est. Cost: {item.estimatedCost || "N/A"}
                        </span>
                        
                        <Button
                          onClick={() => navigate("/reviews/wizard", { state: item })}
                          variant="primary"
                          icon="rate_review"
                        >
                          Start Review
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Draft Reviews Tab */}
          {activeTab === "drafts" && (
            <div id="drafts-panel" role="tabpanel" className="animate-fade-in">
              {history.drafts.length === 0 ? (
                <EmptyState
                  icon="draft"
                  title="No Saved Drafts"
                  description="Any progress you save during reviews will appear here, so you can resume them at any time."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {history.drafts.map((draft) => (
                    <Card
                      key={draft.id}
                      variant="glass"
                      hoverLift
                      className="p-5 border border-outline-variant/15 flex flex-col justify-between gap-4 shadow-sm"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-3">
                          <h4 className="text-body-lg font-bold text-primary dark:text-primary-fixed truncate leading-tight">
                            {draft.hospitalName}
                          </h4>
                          <div className="flex gap-2 items-center">
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-amber-300/10 shrink-0">
                              Draft
                            </span>
                            <button
                              disabled={deletingId === draft.id}
                              onClick={(e) => handleDelete(draft.id, e)}
                              className="text-outline hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error-container/20 shrink-0 cursor-pointer"
                              aria-label="Delete draft"
                            >
                              {deletingId === draft.id ? (
                                <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-label-sm text-outline mt-2 flex items-center gap-1.5 font-semibold">
                          <span className="material-symbols-outlined text-[15px] text-primary">edit</span>
                          <span>Last saved: {new Date(draft.updatedAt).toLocaleDateString()} {new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        
                        {/* Summary of draft progress */}
                        <div className="mt-3 bg-surface-container-low dark:bg-surface-container-high/20 rounded-xl p-3 border border-outline-variant/10 text-xs text-on-surface-variant space-y-1.5">
                          <p className="font-semibold">Visited: <span className="font-bold text-primary dark:text-primary-fixed">{draft.visited === true ? "Yes" : draft.visited === false ? "No" : "Not specified"}</span></p>
                          {draft.treatmentType && <p className="line-clamp-1 font-semibold">Treatment: <span className="font-bold text-primary dark:text-primary-fixed">{draft.treatmentType}</span></p>}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/10">
                        <Button
                          onClick={() => navigate("/reviews/wizard", { state: { ...draft, resumeDraft: true } })}
                          variant="primary"
                          icon="play_arrow"
                        >
                          Resume Review
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Completed Reviews Tab */}
          {activeTab === "completed" && (
            <div id="completed-panel" role="tabpanel" className="animate-fade-in">
              {history.completed.length === 0 ? (
                <EmptyState
                  icon="fact_check"
                  title="No Reviews Submitted"
                  description="Your submitted hospital feedback will be listed here. They help calibrate our hospital metrics."
                />
              ) : (
                <div className="space-y-5">
                  {history.completed.map((review) => (
                    <Card
                      key={review.id}
                      variant="glass"
                      hoverLift
                      className="p-6 md:p-8 border border-outline-variant/15 flex flex-col gap-5 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-4 flex-wrap pb-2 border-b border-outline-variant/10">
                        <div>
                          <h4 className="text-headline-md font-bold text-primary dark:text-primary-fixed leading-tight">
                            {review.hospitalName}
                          </h4>
                          <p className="text-label-sm text-outline mt-1.5 flex items-center gap-1.5 font-semibold">
                            <span className="material-symbols-outlined text-[15px] text-primary">event</span>
                            <span>Reviewed on: {new Date(review.createdAt).toLocaleDateString()}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-primary-container text-primary dark:bg-primary-container/30 dark:text-primary-fixed px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-primary-container/25">
                            Completed
                          </span>
                          <button
                            disabled={deletingId === review.id}
                            onClick={(e) => handleDelete(review.id, e)}
                            className="text-outline hover:text-error transition-all p-1.5 rounded-lg hover:bg-error-container/20 cursor-pointer"
                            aria-label="Delete review"
                          >
                            {deletingId === review.id ? (
                              <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Details of submission */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 p-5 bg-surface-container-low dark:bg-surface-container-high/15 rounded-2xl border border-outline-variant/10 text-sm">
                        <div>
                          <span className="text-outline text-xs uppercase tracking-wider block font-bold mb-0.5">Visited Hospital</span>
                          <span className="font-bold text-primary dark:text-primary-fixed">{review.visited ? "Yes" : "No"}</span>
                        </div>
                        
                        {review.visited && (
                          <>
                            <div>
                              <span className="text-outline text-xs uppercase tracking-wider block font-bold mb-0.5">Treatment/Consult</span>
                              <span className="font-bold text-primary dark:text-primary-fixed line-clamp-1">{review.treatmentType || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-outline text-xs uppercase tracking-wider block font-bold mb-0.5">Actual Cost Paid</span>
                              <span className="font-bold text-primary dark:text-primary-fixed">₹{(review.actualCost || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-outline text-xs uppercase tracking-wider block font-bold mb-0.5">Est. Accuracy</span>
                              <span className="font-bold text-primary dark:text-primary-fixed">{review.costAccuracy || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-outline text-xs uppercase tracking-wider block font-bold mb-0.5">Hidden Charges</span>
                              <span className="font-bold text-primary dark:text-primary-fixed">{review.hiddenCharges || "N/A"}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Ratings metrics */}
                      <div className="flex flex-wrap gap-x-6 gap-y-4 items-center text-sm pt-1 font-semibold">
                        {review.visited && (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-outline">Doctor Expertise:</span>
                              {renderStars(review.doctorQuality)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-outline">Diagnosis Explanation:</span>
                              {renderStars(review.diagnosisExplanation)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-outline">Waiting Time Rating:</span>
                              {renderStars(review.waitingTimeRating)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-outline">Facility Standards:</span>
                              {renderStars(review.facilityRating)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-outline">Staff Service Level:</span>
                              {renderStars(review.staffRating)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-outline">Billing Transparency:</span>
                              {renderStars(review.billingTransparency)}
                            </div>
                          </>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-outline">Specialty Match Accuracy:</span>
                          {renderStars(review.specialtyMatch)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-outline">MedPath AI Accuracy:</span>
                          {renderStars(review.medpathAccuracy)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-outline font-semibold">Recommend to others:</span>
                          <span className={`px-3 py-1 rounded-lg font-bold text-xs border ${
                            review.hospitalRecommendation === 'Definitely' || review.hospitalRecommendation === 'Probably'
                              ? 'bg-success/10 text-success border-success/20' 
                              : review.hospitalRecommendation === 'Maybe' 
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                              : 'bg-error/10 text-error border-error/20'
                          }`}>
                            {review.hospitalRecommendation || "N/A"}
                          </span>
                        </div>
                      </div>

                      {review.reviewText && (
                        <div className="pt-4.5 border-t border-outline-variant/10">
                          <span className="text-outline text-xs uppercase tracking-wider block mb-2 font-bold">Additional Comments</span>
                          <p className="text-body-md text-on-surface whitespace-pre-wrap leading-relaxed italic bg-surface-container-low dark:bg-surface-container-high/15 p-4 rounded-2xl border border-outline-variant/5">
                            "{review.reviewText}"
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewsDashboardPage;
