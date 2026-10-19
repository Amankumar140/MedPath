import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useParams, useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { useConversations } from "../context/ConversationContext";
import { useAuth } from "../context/AuthContext";
import { usePatientLocation } from "../context/LocationContext";
import { useToast } from "../components/Toast";
import { SkeletonChatBubble } from "../components/SkeletonLoader";
import LocationPermissionModal from "../components/location/LocationPermissionModal";
import TypingBubble from "../components/chat/TypingBubble";
import StreamingMessage from "../components/chat/StreamingMessage";
import AIThinkingMessage from "../components/chat/AIThinkingMessage";
import DiscoveryProgressCard from "../components/chat/DiscoveryProgressCard";
import EmergencyBanner from "../components/EmergencyBanner";

// Memoized message component
const ChatMessage = memo(function ChatMessage({ msg, isLast, onChipClick, recommendations }) {
  const isUser = msg.sender === "USER";
  const isSystem = msg.sender === "SYSTEM";

  if (isSystem) {
    return (
      <div className="flex justify-center max-w-xl mx-auto my-2">
        <div className="bg-error-container text-on-error-container p-3 rounded-2xl border border-error-container/30 text-xs font-medium" role="alert">
          {msg.message}
        </div>
      </div>
    );
  }

  if (!isUser) {
    return (
      <TypingBubble
        text={msg.message}
        isStreaming={false}
        isLast={isLast}
        messageType={msg.messageType}
        recommendations={recommendations}
        onChipClick={onChipClick}
        conversationId={msg.conversationId}
      />
    );
  }

  return (
    <div className="flex gap-3 md:gap-4 w-full msg-bubble-user animate-fade-in" style={{ marginLeft: 'auto', justifyContent: 'flex-end' }}>
      <div className="rounded-2xl rounded-tr-xs p-3.5 md:p-4 shadow-xs border border-primary/20 transition-all bg-primary text-on-primary max-w-lg">
        <p className="text-body-md font-body-md whitespace-pre-wrap leading-relaxed break-words">{msg.message}</p>
      </div>
    </div>
  );
});

// Contextual Quick Replies Helper
function getContextualQuickReplies(lastAiMessageText = "") {
  const lower = lastAiMessageText.toLowerCase();

  if (lower.includes("severe") || lower.includes("pain") || lower.includes("intensity") || lower.includes("manageable")) {
    return [
      { label: "🔴 Severe / Unbearable", value: "The pain is severe and unbearable." },
      { label: "🟡 Moderate", value: "The pain is moderate and persistent." },
      { label: "🟢 Mild / Manageable", value: "The pain is mild and manageable." },
      { label: "Comes and goes", value: "The pain comes and goes in waves." },
    ];
  }

  if (lower.includes("how long") || lower.includes("when did") || lower.includes("duration") || lower.includes("days") || lower.includes("since")) {
    return [
      { label: "Just started today", value: "It just started today." },
      { label: "2 to 3 days", value: "I have had this for about 2 to 3 days." },
      { label: "More than a week", value: "This has been going on for over a week." },
      { label: "Chronic / recurring", value: "It has been recurring over several weeks." },
    ];
  }

  if (lower.includes("where") || lower.includes("location") || lower.includes("city") || lower.includes("area")) {
    return [
      { label: "📍 Use my current location", value: "Please search near my current location." },
      { label: "Greater Noida", value: "Greater Noida" },
      { label: "Delhi NCR", value: "Delhi NCR" },
    ];
  }

  if (lower.includes("age") || lower.includes("who is") || lower.includes("child") || lower.includes("yourself")) {
    return [
      { label: "For myself (Adult)", value: "This is for myself, an adult." },
      { label: "For a child", value: "This is for a child." },
      { label: "For an elderly person", value: "This is for an elderly family member (60+)." },
    ];
  }

  return [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
    { label: "Find nearby hospitals", value: "Please find the most suitable hospitals near me." },
    { label: "Need 24/7 Emergency", value: "I need a hospital with 24/7 emergency and ICU." },
  ];
}

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useRouterLocation();
  const { showToast } = useToast();
  const { selectedLocation } = usePatientLocation();
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
    isPolling,
    discoveryProgress,
    selectConversation,
    startNewConsultation,
    sendUserMessage,
    retryLastMessage,
    dismissError,
  } = useConversations();

  const [input, setInput] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [contextSheetOpen, setContextSheetOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const contextSheetTriggerRef = useRef(null);
  const contextSheetCloseRef = useRef(null);
  const contextSheetDrawerRef = useRef(null);

  // Mobile Context Sheet accessibility: ESC to close, autofocus close button, focus trap, return focus (C2, C3)
  useEffect(() => {
    if (!contextSheetOpen) return;

    const triggerEl = contextSheetTriggerRef.current;
    const timer = setTimeout(() => {
      contextSheetCloseRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setContextSheetOpen(false);
        return;
      }

      if (e.key === "Tab" && contextSheetDrawerRef.current) {
        const focusableElements = contextSheetDrawerRef.current.querySelectorAll(
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
      triggerEl?.focus();
    };
  }, [contextSheetOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Visual Viewport API for Mobile Keyboard
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleViewportChange = () => {
      setViewportHeight(window.visualViewport.height);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);

    return () => {
      window.visualViewport.removeEventListener("resize", handleViewportChange);
      window.visualViewport.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  // Sync route param with conversation state
  useEffect(() => {
    if (conversationId === "new") {
      if (activeId && !isStreaming && activeId !== activeConversation?.conversation?.id) {
        startNewConsultation();
      }
    } else if (conversationId && conversationId !== "new") {
      if (activeId !== conversationId) {
        selectConversation(conversationId);
      }
    }
  }, [conversationId, activeId, isStreaming, startNewConsultation, selectConversation, activeConversation?.conversation?.id]);

  // Handle initial message from dashboard
  useEffect(() => {
    const state = location.state;
    if (conversationId === "new" && state?.initialMessage && !loadingActive && !activeId) {
      navigate(location.pathname, { replace: true, state: {} });
      sendUserMessage(state.initialMessage);
    }
  }, [conversationId, location.state, location.pathname, loadingActive, activeId, navigate, sendUserMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamText, isStreaming, scrollToBottom]);

  // Voice Dictation
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice recognition is not supported in this browser.", "warning", "Voice Input");
      return;
    }

    if (isVoiceActive) {
      recognitionRef.current?.stop();
      setIsVoiceActive(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

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
  }, [isVoiceActive, showToast]);

  const handleSend = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const msg = input.trim();
    setInput("");
    const newId = await sendUserMessage(msg);
    if (newId && conversationId === "new") {
      navigate(`/chat/${newId}`, { replace: true });
    }
  }, [input, isStreaming, sendUserMessage, conversationId, navigate]);

  const handleQuickReply = useCallback(async (val) => {
    if (isStreaming) return;
    setInput("");
    const newId = await sendUserMessage(val);
    if (newId && conversationId === "new") {
      navigate(`/chat/${newId}`, { replace: true });
    }
  }, [isStreaming, sendUserMessage, conversationId, navigate]);

  const isNewRoute = conversationId === "new";

  const defaultWelcomeMessage = {
    id: "welcome-1",
    sender: "AI",
    message: `Hello, ${user?.displayName || "there"}. I am your MedPath Healthcare Navigator. Tell me what symptoms or healthcare assistance you need, and I will help you identify the right medical care and hospitals near you.`,
    messageType: "TEXT",
    createdAt: new Date().toISOString(),
  };

  const rawMessages = activeConversation?.messages || [];
  const messages = isNewRoute
    ? (rawMessages.length > 0 ? rawMessages : [defaultWelcomeMessage])
    : (rawMessages.length > 0
        ? (rawMessages[0].sender === "USER" ? [defaultWelcomeMessage, ...rawMessages] : rawMessages)
        : (loadingActive ? [] : [defaultWelcomeMessage]));

  const context = activeConversation?.patientContext || { symptoms: "", age: null, location: "", isContextComplete: false };
  const recommendations = activeConversation?.recommendationSnapshots || [];

  // Get last AI message for contextual quick replies
  const lastAiMessage = [...messages].reverse().find(m => m.sender === "AI" || m.sender === "assistant");
  const quickReplies = getContextualQuickReplies(lastAiMessage?.message || "");

  const isCompleted = activeConversation?.conversation?.status === "COMPLETED";
  const hasRecommendations = recommendations.length > 0;
  const lastMessageText = (lastAiMessage?.message || "").trim();
  const hasPendingQuestion = lastMessageText.endsWith("?") || lastMessageText.includes("?");
  const shouldShowQuickReplies = !isStreaming && !isCompleted && !(hasRecommendations && !hasPendingQuestion) && quickReplies.length > 0;
  const showPostConsultationActions = !isStreaming && (isCompleted || hasRecommendations) && !hasPendingQuestion;

  const symptomsList = context?.symptoms
    ? context.symptoms.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="flex-1 flex flex-col lg:flex-row h-[calc(100dvh-8rem)] md:h-screen lg:h-full min-h-0 overflow-hidden bg-surface-bright dark:bg-background relative"
      style={viewportHeight ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px` } : undefined}
      role="main"
      aria-label="Healthcare Navigator Consultation"
    >
      {/* Location Modal */}
      {showLocationModal && (
        <LocationPermissionModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onConfirm={() => setShowLocationModal(false)}
        />
      )}

      {/* Main Conversation Column */}
      <div className="flex-grow flex flex-col h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-outline-variant/20">

        {/* 1. Header Bar: Location, Emergency, Status */}
        <div className="bg-surface border-b border-outline-variant/20 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/home")}
              className="text-on-surface-variant hover:text-primary p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              title="Return to Home"
              aria-label="Return to Home"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-primary dark:text-primary-fixed truncate">
                {activeConversation?.conversation?.title || "Healthcare Guidance Session"}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-outline truncate">
                <span className="material-symbols-outlined text-[14px] text-secondary">location_on</span>
                <span className="truncate">
                  {selectedLocation?.city || selectedLocation?.formattedAddress?.split(",")[0] || "Location not set"}
                </span>
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="text-secondary hover:underline cursor-pointer font-semibold ml-0.5"
                >
                  Change
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {recommendations.length > 0 && (
              <button
                onClick={() => navigate("/hospitals", { state: { recommendations } })}
                className="bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">local_hospital</span>
                <span>{recommendations.length} Hospitals</span>
              </button>
            )}
            <button
              ref={contextSheetTriggerRef}
              onClick={() => setContextSheetOpen(!contextSheetOpen)}
              className="lg:hidden p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              title="View Requirements & Context"
              aria-label="View Requirements & Context"
              aria-expanded={contextSheetOpen}
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>
        </div>

        {/* Stream Status info */}
        {isStreaming && streamStatus && (
          <div className="bg-secondary-container/20 border-b border-outline-variant/15 px-4 py-2 flex items-center gap-2 text-xs text-secondary animate-pulse shrink-0" aria-live="polite">
            <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true"></span>
            <span className="font-semibold">{streamStatus}</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-error-container/30 border-b border-error/20 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 animate-fade-in" role="alert">
            <div className="flex items-center gap-2 text-on-error-container text-xs font-semibold min-w-0">
              <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
              <span className="truncate">{error}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={retryLastMessage}
                className="text-xs font-bold text-primary hover:text-secondary px-2.5 py-1 rounded bg-surface shadow-xs touch-target"
              >
                Retry
              </button>
              <button
                onClick={dismissError}
                className="text-outline hover:text-on-surface p-1 touch-target"
                aria-label="Dismiss error"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-grow overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-5 min-h-0" id="chat-messages" role="log" aria-label="Conversation messages">
          <div className="flex justify-center my-1">
            <span className="text-[11px] font-semibold text-outline px-3 py-1 bg-surface rounded-full border border-outline-variant/20">
              Decision Support & Healthcare Navigation • Not Diagnostic
            </span>
          </div>

          {loadingActive && !activeConversation && (
            <div className="space-y-4">
              <SkeletonChatBubble />
              <SkeletonChatBubble isUser />
              <SkeletonChatBubble />
            </div>
          )}

          {(!loadingActive || messages.length > 0) && messages.map((msg, index) => (
            <ChatMessage
              key={msg.id || index}
              msg={msg}
              isLast={index === messages.length - 1}
              onChipClick={(txt) => setInput(txt)}
              recommendations={((msg.messageType === "FINAL") || (index === messages.length - 1 && !isStreaming)) ? recommendations : []}
            />
          ))}

          {isStreaming && streamText && (
            <StreamingMessage
              text={streamText}
              conversationId={activeId}
            />
          )}

          {isStreaming && !streamText && (
            <AIThinkingMessage statusText={streamStatus} />
          )}

          {isPolling && (
            <DiscoveryProgressCard progress={discoveryProgress} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 2. Contextual Quick Replies Row or Post-Consultation Refinement (Section 8, A4) */}
        {shouldShowQuickReplies ? (
          <div className="px-3 md:px-6 pt-2 pb-1 bg-surface border-t border-outline-variant/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider shrink-0 mr-1">
              Quick Reply:
            </span>
            {quickReplies.map((qr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickReply(qr.value)}
                className="text-xs font-semibold text-primary dark:text-primary-fixed bg-surface-container hover:bg-secondary-container hover:text-on-secondary-container px-3 py-1.5 rounded-full border border-outline-variant/25 transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                {qr.label}
              </button>
            ))}
          </div>
        ) : showPostConsultationActions ? (
          <div className="px-3 md:px-6 pt-2 pb-1 bg-surface border-t border-outline-variant/15 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => navigate("/hospitals")}
              className="text-xs font-semibold text-primary dark:text-primary-fixed bg-surface-container hover:bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant/25 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">local_hospital</span>
              View All Recommendations
            </button>
            <button
              type="button"
              onClick={() => {
                setInput("Refine search: ");
                const textarea = document.querySelector('textarea[aria-label="Type your message"]');
                textarea?.focus();
              }}
              className="text-xs font-semibold text-on-surface-variant hover:text-primary bg-surface-container hover:bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant/25 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">tune</span>
              Refine Search
            </button>
            <button
              type="button"
              onClick={() => {
                startNewConsultation();
                navigate("/chat/new");
              }}
              className="text-xs font-semibold text-secondary hover:text-primary bg-secondary-container/40 hover:bg-secondary-container px-3 py-1.5 rounded-full border border-outline-variant/25 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              Start New Consultation
            </button>
          </div>
        ) : null}

        {/* 3. Input Form Panel (C8: Verified 360px clearance) */}
        <div className="p-2.5 sm:p-3 md:p-4 bg-surface border-t border-outline-variant/15 z-10 shrink-0 shadow-xs">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-end gap-2" role="form" aria-label="Message input">
            <div className="flex-1 relative bg-surface-container-low dark:bg-surface-container rounded-2xl border border-outline-variant/30 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <textarea
                className="w-full bg-transparent border-none resize-none py-3 pl-3.5 pr-11 text-body-md font-body-md text-on-surface focus:ring-0 placeholder:text-outline min-h-[44px] max-h-32 outline-none focus:outline-none focus-visible:outline-none font-medium"
                placeholder="Type your reply, answer questions, or update symptoms..."
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

              {/* Voice mic button */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    isVoiceActive ? "bg-red-500 text-white animate-pulse" : "text-outline hover:text-primary hover:bg-surface-container"
                  }`}
                  title={isVoiceActive ? "Recording... Click to stop" : "Voice dictation"}
                  aria-label="Voice input"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="w-11 h-11 bg-primary text-on-primary rounded-2xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all flex-shrink-0 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>

          <p className="text-[11px] text-center text-outline mt-1.5">
            MedPath provides facility guidance. For medical emergencies, call 112 immediately.
          </p>
        </div>

      </div>

      {/* Right Sidebar: Context Summary & Action Next Steps (Desktop) */}
      <aside className="hidden lg:block w-72 bg-surface-container-low border-l border-outline-variant/20 overflow-y-auto h-full p-4 shrink-0 space-y-4" aria-label="Consultation context">
        <h3 className="text-xs font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">tune</span>
          Your Care Context
        </h3>

        {/* Reported symptoms */}
        <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/20 space-y-2">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
            Reported Requirement
          </span>
          {symptomsList.length === 0 ? (
            <p className="text-xs text-outline italic">Analyzing conversation...</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {symptomsList.map((sym, i) => (
                <span
                  key={i}
                  className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-xs font-semibold"
                >
                  {sym}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Location & Status */}
        <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/20 space-y-2.5 text-xs">
          <div className="flex justify-between items-center border-b border-outline-variant/15 pb-2">
            <span className="text-outline font-medium">Search Location</span>
            <span className="font-bold text-primary dark:text-primary-fixed truncate max-w-[130px]">
              {selectedLocation?.city || selectedLocation?.formattedAddress?.split(",")[0] || "Pending"}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-outline-variant/15 pb-2">
            <span className="text-outline font-medium">Consultation Status</span>
            <span className={`font-bold ${recommendations.length > 0 ? "text-tertiary" : "text-secondary"}`}>
              {recommendations.length > 0 ? "Hospitals Found" : "Collecting Context"}
            </span>
          </div>
          {context.age && (
            <div className="flex justify-between items-center pb-1">
              <span className="text-outline font-medium">Patient Age</span>
              <span className="font-bold text-primary dark:text-primary-fixed">{context.age}</span>
            </div>
          )}
        </div>

        {/* Shortcut to recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-gradient-to-br from-primary/5 to-secondary/10 p-3.5 rounded-2xl border border-secondary/20 space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">local_hospital</span>
              <div>
                <h4 className="text-xs font-bold text-primary dark:text-primary-fixed">
                  {recommendations.length} Hospitals Ready
                </h4>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Ranked by proximity and specialties
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/hospitals", { state: { recommendations } })}
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>View Full Results</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Compact Emergency Reminder in Sidebar */}
        <EmergencyBanner compact />
      </aside>

      {/* Mobile Context Bottom Drawer (C2, C3) */}
      {contextSheetOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end" 
          onClick={() => setContextSheetOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Your Care Context"
        >
          <div 
            ref={contextSheetDrawerRef}
            className="bg-surface rounded-t-3xl p-5 space-y-4 max-h-[75vh] overflow-y-auto border-t border-outline-variant/20 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/15">
              <h3 className="text-sm font-bold text-primary">Your Care Context</h3>
              <button 
                ref={contextSheetCloseRef}
                onClick={() => setContextSheetOpen(false)}
                className="p-1 rounded-full text-outline hover:text-on-surface cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
                aria-label="Close care context"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-outline uppercase tracking-wider block">Symptoms Identified</span>
              <div className="flex flex-wrap gap-1.5">
                {symptomsList.length > 0 ? symptomsList.map((s, idx) => (
                  <span key={idx} className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {s}
                  </span>
                )) : (
                  <span className="text-xs text-outline italic">No symptoms parsed yet</span>
                )}
              </div>
            </div>

            {recommendations.length > 0 && (
              <button
                onClick={() => {
                  setContextSheetOpen(false);
                  navigate("/hospitals", { state: { recommendations } });
                }}
                className="w-full bg-primary text-on-primary font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View {recommendations.length} Hospital Matches</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
