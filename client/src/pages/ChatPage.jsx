import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useParams, useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { useConversations } from "../context/ConversationContext";
import { useAuth } from "../context/AuthContext";
import { usePatientLocation } from "../context/LocationContext";
import { SkeletonChatBubble } from "../components/SkeletonLoader";
import LocationPermissionModal from "../components/location/LocationPermissionModal";
import { Card, Button, Badge } from "../components/ui";

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(function ChatMessage({ msg, isLast, isStreaming, onChipClick, recommendations }) {
  const isUser = msg.sender === "USER";
  const isSystem = msg.sender === "SYSTEM";
  const navigate = useNavigate();

  if (isSystem) {
    return (
      <div className="flex justify-center max-w-xl mx-auto my-2">
        <div className="bg-error-container/30 text-on-error-container p-3 rounded-xl border border-error/10 text-sm" role="alert">
          {msg.message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 w-full max-w-[85%] animate-fade-in" style={{ marginLeft: isUser ? 'auto' : '0', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex-shrink-0 flex items-center justify-center shadow-md relative" aria-hidden="true">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            robot_2
          </span>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border border-surface"></div>
        </div>
      )}

      <div
        className={`rounded-2xl p-4 shadow-sm border transition-all ${
          isUser
            ? "premium-gradient-primary text-on-primary rounded-tr-sm shadow-md"
            : `premium-glass-card text-on-surface rounded-tl-sm space-y-3 border-outline-variant/15 ${
                recommendations && recommendations.length > 0
                  ? "w-full md:w-[480px] lg:w-[520px] max-w-full shadow-md"
                  : "w-fit max-w-full"
              }`
        }`}
      >
        <p className="text-body-md font-body-md whitespace-pre-wrap leading-relaxed">{msg.message}</p>

        {/* Inline Follow-up Chips for Symptom triage */}
        {!isUser && msg.messageType === "FOLLOW_UP" && isLast && !isStreaming && (
          <div className="flex flex-wrap gap-2 pt-2.5" role="group" aria-label="Quick response options">
            <Button
              onClick={() => onChipClick("Fever or chills")}
              variant="outline"
              size="sm"
              className="!rounded-full hover-lift"
            >
              Fever or chills
            </Button>
            <Button
              onClick={() => onChipClick("Shortness of breath")}
              variant="outline"
              size="sm"
              className="!rounded-full hover-lift"
            >
              Shortness of breath
            </Button>
            <Button
              onClick={() => onChipClick("Fatigue")}
              variant="outline"
              size="sm"
              className="!rounded-full hover-lift"
            >
              Fatigue
            </Button>
            <Button
              onClick={() => onChipClick("None of these")}
              variant="outline"
              size="sm"
              className="!rounded-full border-outline text-on-surface-variant hover-lift"
            >
              None of these
            </Button>
          </div>
        )}

        {/* Inline recommendations if present */}
        {!isUser && recommendations && recommendations.length > 0 && (
          <div className="mt-4 space-y-3 w-full max-w-full animate-fade-in" role="region" aria-label="Hospital recommendations">
            <div className="flex items-center gap-1.5 border-b border-outline-variant/15 pb-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-secondary">local_hospital</span>
              <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Recommended Healthcare Facilities</p>
            </div>
            {recommendations.map((hosp, i) => (
              <Card
                key={hosp.id || i}
                variant="lowest"
                hoverLift
                className="p-4 border border-outline-variant/20 flex flex-col gap-2.5 hover:border-outline-variant/35"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-fixed w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
                      {hosp.rankingPosition}
                    </span>
                    <h5 className="font-bold text-sm text-primary dark:text-primary-fixed leading-tight truncate">
                      {hosp.hospitalName}
                    </h5>
                  </div>
                  <Badge variant="secondary">
                    {Math.round((hosp.confidenceScore > 1 ? hosp.confidenceScore / 100 : hosp.confidenceScore) * 100)}% Match
                  </Badge>
                </div>
                <p className="text-xs text-on-surface-variant/90 line-clamp-2 leading-relaxed font-medium">
                  {hosp.reason}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-outline-variant/10">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/10">
                      <span className="material-symbols-outlined text-[13px] text-secondary">route</span>
                      {hosp.distance}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container-low dark:bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/10">
                      <span className="material-symbols-outlined text-[13px] text-primary">payments</span>
                      {hosp.estimatedCost}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => navigate('/reviews/wizard', {
                        state: {
                          conversationId: msg.conversationId,
                          recommendationSnapshotId: hosp.id,
                          hospitalName: hosp.hospitalName,
                          estimatedCost: hosp.estimatedCost
                        }
                      })}
                      className="text-primary hover:text-secondary font-bold transition-colors cursor-pointer hover:underline text-xs flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">rate_review</span>
                      Review
                    </button>
                    <button
                      onClick={() => navigate(`/hospitals/${hosp.id || hosp.hospitalName}`, { state: { hospital: hosp } })}
                      className="text-secondary hover:text-primary font-bold transition-colors cursor-pointer hover:underline text-xs flex items-center gap-0.5"
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useRouterLocation();
  const { selectedLocation, clearSelectedLocation } = usePatientLocation();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const { user } = useAuth();

  const {
    activeConversation,
    activeId,
    loadingActive,
    isStreaming,
    streamText,
    streamStatus,
    error,
    selectConversation,
    sendUserMessage,
    retryLastMessage,
    dismissError,
  } = useConversations();

  const [input, setInput] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Sync route param with conversation state
  useEffect(() => {
    if (conversationId && conversationId !== "new") {
      selectConversation(conversationId);
    } else {
      selectConversation(null);
    }
  }, [conversationId, selectConversation]);

  // Show location modal for new consultations
  useEffect(() => {
    if (conversationId === "new" && !activeId && !selectedLocation) {
      setShowLocationModal(true);
    }
  }, [conversationId, activeId, selectedLocation]);

  // Handle initial message from dashboard quick triage
  useEffect(() => {
    const state = location.state;
    if (conversationId === "new" && state?.initialMessage && !loadingActive && !activeId && selectedLocation) {
      navigate(location.pathname, { replace: true, state: {} });
      sendUserMessage(state.initialMessage);
    }
  }, [conversationId, location.state, location.pathname, loadingActive, activeId, selectedLocation, navigate, sendUserMessage]);

  const handleLocationConfirm = (loc) => {
    setShowLocationModal(false);
    // If there was an initial message waiting, it will be sent via the effect above
    // since selectedLocation is now set
  };

  const handleLocationModalClose = () => {
    setShowLocationModal(false);
    // If no location selected, go back
    if (!selectedLocation) {
      navigate("/home");
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamText, isStreaming, scrollToBottom]);

  // Web Speech API Voice Dictation
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isVoiceActive) {
      recognitionRef.current?.stop();
      setIsVoiceActive(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsVoiceActive(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      };
      recognition.onerror = () => setIsVoiceActive(false);
      recognition.onend = () => setIsVoiceActive(false);

      recognitionRef.current = recognition;
      recognition.start();
    }
  }, [isVoiceActive]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    // If no location selected for a new chat, show modal
    if (conversationId === "new" && !activeId && !selectedLocation) {
      setShowLocationModal(true);
      return;
    }
    const msg = input;
    setInput("");
    await sendUserMessage(msg);
  }, [input, isStreaming, sendUserMessage, conversationId, activeId, selectedLocation]);

  const handleChipClick = useCallback((text) => {
    setInput(text);
  }, []);

  // If a new conversation gets created in background, update URL route
  useEffect(() => {
    if (conversationId === "new" && activeId) {
      navigate(`/chat/${activeId}`, { replace: true });
    }
  }, [activeId, conversationId, navigate]);

  // Helper to parse symptoms list
  const symptomsList = activeConversation?.patientContext?.symptoms
    ? activeConversation.patientContext.symptoms.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const welcomeMessages = [
    {
      id: "welcome-1",
      sender: "AI",
      message: `Hello, ${user?.displayName || "there"}. I am your MedPath AI Assistant. I can analyze your symptoms and search local clinical departments. What symptoms are you experiencing today?`,
      messageType: "TEXT",
      createdAt: new Date().toISOString(),
    },
  ];

  const messages = activeConversation?.messages || (conversationId === "new" ? welcomeMessages : []);
  const context = activeConversation?.patientContext || { symptoms: "", age: null, location: "", isContextComplete: false };
  const recommendations = activeConversation?.recommendationSnapshots || [];

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-surface-bright dark:bg-background relative animate-slide-up" role="main" aria-label="AI Consultation Chat">

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onConfirm={handleLocationConfirm}
        onClose={handleLocationModalClose}
      />

      {/* Conversation Thread Panel */}
      <div className="flex-grow flex flex-col h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-outline-variant/15">

        {/* Stream Status Info header */}
        {isStreaming && streamStatus && (
          <div className="bg-secondary-container/10 border-b border-outline-variant/10 px-5 py-2.5 flex items-center gap-2 text-label-sm text-secondary animate-pulse shrink-0" aria-live="polite">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" aria-hidden="true"></span>
            <span className="font-semibold">{streamStatus}</span>
          </div>
        )}

        {/* Error banner with retry */}
        {error && (
          <div className="bg-error-container/20 border-b border-error/15 px-5 py-3 flex items-center justify-between gap-3 shrink-0 animate-fade-in" role="alert">
            <div className="flex items-center gap-2 text-on-error-container text-sm font-semibold">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>{error}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={retryLastMessage}
                className="text-label-sm font-bold text-primary hover:text-secondary transition-all px-3 py-1.5 rounded-lg bg-surface shadow-sm"
              >
                Retry
              </button>
              <button
                onClick={dismissError}
                className="text-outline hover:text-on-surface transition-colors p-1"
                aria-label="Dismiss error"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable messages container */}
        <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6" id="chat-messages" role="log" aria-label="Conversation messages">

          <div className="flex justify-center my-1">
            <span className="text-[11px] font-bold text-outline px-3.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/10 uppercase tracking-wider">
               HIPAA Secure Consultation
            </span>
          </div>

          {/* Loading skeleton */}
          {loadingActive && !activeConversation && (
            <div className="space-y-6">
              <SkeletonChatBubble />
              <SkeletonChatBubble isUser />
              <SkeletonChatBubble />
            </div>
          )}

          {!loadingActive && messages.map((msg, index) => (
            <ChatMessage
              key={msg.id || index}
              msg={msg}
              isLast={index === messages.length - 1}
              isStreaming={isStreaming}
              onChipClick={handleChipClick}
              recommendations={((msg.messageType === "FINAL") || (index === messages.length - 1 && !isStreaming)) ? recommendations : []}
            />
          ))}

          {/* Streaming Bubble */}
          {isStreaming && streamText && (
            <div className="flex gap-4 max-w-[85%] animate-fade-in">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex-shrink-0 flex items-center justify-center shadow-md relative" aria-hidden="true">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  robot_2
                </span>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-secondary rounded-full border border-surface animate-pulse"></div>
              </div>
              <div className="premium-glass-card rounded-2xl rounded-tl-sm p-4 text-on-surface shadow-md border border-outline-variant/15">
                <p className="text-body-md font-body-md whitespace-pre-wrap leading-relaxed">{streamText}</p>
              </div>
            </div>
          )}

          {/* Typing animation block */}
          {isStreaming && !streamText && (
            <div className="flex gap-4 max-w-[85%] animate-fade-in" aria-live="polite">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex-shrink-0 flex items-center justify-center shadow-md relative" aria-hidden="true">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  robot_2
                </span>
              </div>
              <div className="premium-glass-card rounded-2xl rounded-tl-sm p-4 text-on-surface shadow-md border border-outline-variant/15">
                <p className="text-body-md font-bold text-on-surface-variant flex items-center gap-1.5">
                  Analyzing symptoms
                  <span className="flex gap-1 items-end ml-1 h-4" aria-hidden="true">
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full typing-dot"></span>
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full typing-dot"></span>
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full typing-dot"></span>
                  </span>
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Panel */}
        <div className="p-4 md:p-6 bg-surface border-t border-outline-variant/15 z-10 shrink-0 shadow-[0_-8px_32px_rgba(0,30,64,0.02)]">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-end gap-3" role="form" aria-label="Message input">
            {/* Attachment Button */}
            <button
              type="button"
              className="p-3 text-outline hover:text-primary transition-all flex-shrink-0 mb-1 rounded-xl hover:bg-surface-container-low"
              aria-label="Attach file"
            >
              <span className="material-symbols-outlined">attach_file</span>
            </button>

            {/* Input area wrapper */}
            <div className="flex-1 relative premium-glass-card rounded-xl overflow-hidden focus-within:ring-2 ring-secondary/50 border border-outline-variant/40 transition-all shadow-inner">
              <textarea
                className="w-full bg-transparent border-none resize-none py-4 pl-4 pr-12 text-body-md font-body-md text-on-surface focus:ring-0 placeholder:text-outline/70 min-h-[56px] max-h-32"
                placeholder="Describe symptoms or answer follow-ups..."
                rows="1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                aria-label="Type your message"
                disabled={isStreaming}
              />

              {/* Voice dictation mic button */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className={`absolute inset-0 bg-error/20 rounded-full pulse-ring ${isVoiceActive ? "" : "hidden"}`}></div>
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`transition-colors cursor-pointer ${isVoiceActive ? "text-error" : "text-outline hover:text-error"}`}
                    aria-label={isVoiceActive ? "Stop voice dictation" : "Start voice dictation"}
                    aria-pressed={isVoiceActive}
                  >
                    <span className="material-symbols-outlined">mic</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Send submit button */}
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="w-12 h-14 premium-gradient-primary text-on-primary rounded-xl flex items-center justify-center hover:opacity-95 transition-all flex-shrink-0 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover-lift"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                send
              </span>
            </button>
          </form>
          <div className="text-center mt-2.5">
            <span className="text-[11px] font-medium text-outline">
              MedPath AI can make mistakes. Verify critical clinical pathways with certified medical staff.
            </span>
          </div>
        </div>

      </div>

      {/* Right Sidebar: Context Summary (Desktop Only) */}
      <aside className="hidden lg:block w-80 bg-surface/85 dark:bg-surface-container-low/80 backdrop-blur-xl border-l border-outline-variant/15 overflow-y-auto h-full p-6 shrink-0" aria-label="Consultation context">
        <div className="sticky top-0 bg-transparent pb-4 mb-4 border-b border-outline-variant/15 z-10">
          <h3 className="text-label-md font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>
            Consultation Context
          </h3>
        </div>

        <div className="space-y-6 animate-fade-in">
          {/* Symptoms identified */}
          <div>
            <h4 className="text-label-sm font-semibold text-on-surface-variant mb-2.5 flex justify-between items-center">
              Identified Symptoms
              <span className="material-symbols-outlined text-[16px] text-outline" aria-hidden="true">info</span>
            </h4>
            {symptomsList.length === 0 ? (
              <p className="text-sm text-outline italic">No symptoms parsed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 animate-fade-in">
                {symptomsList.map((sym, i) => (
                  <div
                    key={i}
                    className="bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary-fixed-dim px-3.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 border border-secondary/10"
                  >
                    {sym}
                    <span className="material-symbols-outlined text-[11px]" aria-hidden="true">check_circle</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile snapshot */}
          <Card variant="glass" className="p-4.5 border border-outline-variant/10 shadow-sm">
            <h4 className="text-label-sm font-bold text-on-surface-variant mb-3">Profile Snapshot</h4>
            <ul className="space-y-2.5 text-label-sm text-on-surface">
              <li className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span className="text-outline font-semibold">Age</span>
                <span className="font-bold text-primary dark:text-primary-fixed">{context.age || "Pending"}</span>
              </li>
              <li className="flex justify-between border-b border-outline-variant/10 pb-2 gap-3">
                <span className="text-outline font-semibold shrink-0">Location</span>
                <span className="font-bold text-primary dark:text-primary-fixed truncate capitalize text-right">{context.formattedAddress || context.location || selectedLocation?.formattedAddress || "Pending"}</span>
              </li>
              {(context.city || selectedLocation?.city) && (
                <li className="flex justify-between border-b border-outline-variant/10 pb-2">
                  <span className="text-outline font-semibold">City</span>
                  <span className="font-bold text-primary dark:text-primary-fixed capitalize">{context.city || selectedLocation?.city}</span>
                </li>
              )}
              <li className="flex justify-between pb-0.5">
                <span className="text-outline font-semibold">Status</span>
                <span className={`font-bold ${context.isContextComplete ? "text-tertiary" : "text-secondary"}`}>
                  {context.isContextComplete ? "Context Complete" : "Triage Active"}
                </span>
              </li>
            </ul>
          </Card>

          {/* Hospital recommendations link shortcut */}
          {recommendations.length > 0 && (
            <div className="animate-fade-in">
              <h4 className="text-label-sm font-bold text-on-surface-variant mb-2.5">Suggested Next Steps</h4>
              <div className="space-y-2">
                <Card
                  onClick={() => navigate("/hospitals", { state: { recommendations } })}
                  hoverLift
                  variant="glass"
                  className="p-3.5 border-secondary bg-secondary/5 hover:bg-secondary/15 hover:border-secondary flex items-center gap-3.5 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
                    <span className="material-symbols-outlined text-[18px]">local_hospital</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-label-sm font-bold text-primary dark:text-primary-fixed group-hover:text-secondary transition-colors">View Recommendations</p>
                    <p className="text-[10px] text-outline font-medium mt-0.5 truncate">{recommendations.length} Clinics match symptoms</p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </aside>

    </div>
  );
}

export default ChatPage;
