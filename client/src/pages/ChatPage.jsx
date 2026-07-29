import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useParams, useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { useConversations } from "../context/ConversationContext";
import { useAuth } from "../context/AuthContext";
import { usePatientLocation } from "../context/LocationContext";
import { SkeletonChatBubble } from "../components/SkeletonLoader";
import LocationPermissionModal from "../components/location/LocationPermissionModal";
import { Card, Button, Badge } from "../components/ui";
import TypingBubble from "../components/chat/TypingBubble";
import StreamingMessage from "../components/chat/StreamingMessage";
import AIThinkingMessage from "../components/chat/AIThinkingMessage";
import DiscoveryProgressCard from "../components/chat/DiscoveryProgressCard";

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(function ChatMessage({ msg, isLast, isStreaming, onChipClick, recommendations }) {
  const isUser = msg.sender === "USER";
  const isSystem = msg.sender === "SYSTEM";

  if (isSystem) {
    return (
      <div className="flex justify-center max-w-xl mx-auto my-2">
        <div className="bg-error-container/30 text-on-error-container p-3 rounded-xl border border-error/10 text-sm" role="alert">
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
      <div className="rounded-2xl p-3 md:p-4 shadow-sm border transition-all premium-gradient-primary text-on-primary rounded-tr-sm shadow-md">
        <p className="text-body-md font-body-md whitespace-pre-wrap leading-relaxed break-words">{msg.message}</p>
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
  const [sheetClosing, setSheetClosing] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
  }, [conversationId, activeId, activeConversation, isStreaming, startNewConsultation, selectConversation]);

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
    const newId = await sendUserMessage(msg);
    if (newId && conversationId === "new") {
      navigate(`/chat/${newId}`, { replace: true });
    }
  }, [input, isStreaming, sendUserMessage, conversationId, activeId, selectedLocation, navigate]);

  const handleChipClick = useCallback((text) => {
    setInput(text);
  }, []);

  // Context bottom sheet handlers
  const closeContextSheet = useCallback(() => {
    setSheetClosing(true);
    setTimeout(() => {
      setContextSheetOpen(false);
      setSheetClosing(false);
    }, 250);
  }, []);

  // ESC key closes context sheet
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && contextSheetOpen) {
        closeContextSheet();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [contextSheetOpen, closeContextSheet]);

  const isNewRoute = conversationId === "new";

  // Helper to parse symptoms list
  const symptomsList = (!isNewRoute && activeConversation?.patientContext?.symptoms)
    ? activeConversation.patientContext.symptoms.split(",").map(s => s.trim()).filter(Boolean)
    : (isNewRoute && activeConversation?.patientContext?.symptoms ? activeConversation.patientContext.symptoms.split(",").map(s => s.trim()).filter(Boolean) : []);

  const welcomeMessages = [
    {
      id: "welcome-1",
      sender: "AI",
      message: `Hello, ${user?.displayName || "there"}. I am your MedPath AI Assistant. I can analyze your symptoms and search local clinical departments. What symptoms are you experiencing today?`,
      messageType: "TEXT",
      createdAt: new Date().toISOString(),
    },
  ];

  const messages = isNewRoute
    ? (activeConversation?.messages?.length ? activeConversation.messages : welcomeMessages)
    : (activeConversation?.messages || []);

  const context = activeConversation?.patientContext || { symptoms: "", age: null, location: "", isContextComplete: false };
  const recommendations = activeConversation?.recommendationSnapshots || [];

// Memoized Consultation Context Panel component (extracted to prevent re-renders on keystroke)
const ConsultationContextPanel = memo(function ConsultationContextPanel({
  symptomsList,
  context,
  selectedLocation,
  recommendations,
  onNavigateRecommendations,
}) {
  return (
    <div className="space-y-6">
      {/* Symptoms identified */}
      <div>
        <h4 className="text-label-sm font-semibold text-on-surface-variant mb-2.5 flex justify-between items-center">
          Identified Symptoms
          <span className="material-symbols-outlined text-[16px] text-outline" aria-hidden="true">info</span>
        </h4>
        {symptomsList.length === 0 ? (
          <p className="text-sm text-outline italic">No symptoms parsed yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
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
        <div>
          <h4 className="text-label-sm font-bold text-on-surface-variant mb-2.5">Suggested Next Steps</h4>
          <div className="space-y-2">
            <Card
              onClick={onNavigateRecommendations}
              hoverLift
              variant="glass"
              className="p-3.5 border-secondary bg-secondary/5 hover:bg-secondary/15 hover:border-secondary flex items-center gap-3.5 group cursor-pointer"
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
  );
});

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
          <div className="bg-secondary-container/10 border-b border-outline-variant/10 px-4 md:px-5 py-2.5 flex items-center gap-2 text-label-sm text-secondary animate-pulse shrink-0" aria-live="polite">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" aria-hidden="true"></span>
            <span className="font-semibold">{streamStatus}</span>
          </div>
        )}

        {/* Error banner with retry */}
        {error && (
          <div className="bg-error-container/20 border-b border-error/15 px-4 md:px-5 py-3 flex items-center justify-between gap-3 shrink-0 animate-fade-in" role="alert">
            <div className="flex items-center gap-2 text-on-error-container text-sm font-semibold min-w-0">
              <span className="material-symbols-outlined text-[18px] shrink-0">warning</span>
              <span className="truncate">{error}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={retryLastMessage}
                className="text-label-sm font-bold text-primary hover:text-secondary transition-all px-3 py-1.5 rounded-lg bg-surface shadow-sm touch-target"
              >
                Retry
              </button>
              <button
                onClick={dismissError}
                className="text-outline hover:text-on-surface transition-colors p-1 touch-target"
                aria-label="Dismiss error"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable messages container */}
        <div className="flex-grow overflow-y-auto p-3 md:p-6 space-y-5 md:space-y-6" id="chat-messages" role="log" aria-label="Conversation messages">

          <div className="flex justify-center my-1">
            <span className="text-[10px] md:text-[11px] font-bold text-outline px-3 md:px-3.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/10 uppercase tracking-wider">
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

          {(!loadingActive || messages.length > 0) && messages.map((msg, index) => (
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
            <StreamingMessage
              text={streamText}
              conversationId={activeId}
            />
          )}

          {/* Typing / Thinking Animation Block */}
          {isStreaming && !streamText && (
            <AIThinkingMessage statusText={streamStatus} />
          )}

          {/* Discovery Polling Progress Card */}
          {isPolling && (
            <DiscoveryProgressCard progress={discoveryProgress} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Panel */}
        <div className="p-3 md:p-6 bg-surface border-t border-outline-variant/15 z-10 shrink-0 shadow-[0_-8px_32px_rgba(0,30,64,0.02)] pb-safe">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-end gap-2 md:gap-3" role="form" aria-label="Message input">
            {/* Attachment Button */}
            <button
              type="button"
              className="p-2 md:p-3 text-outline hover:text-primary transition-all flex-shrink-0 mb-1 rounded-xl hover:bg-surface-container-low touch-target"
              aria-label="Attach file"
            >
              <span className="material-symbols-outlined">attach_file</span>
            </button>

            {/* Input area wrapper */}
            <div className="flex-1 relative premium-glass-card rounded-xl overflow-hidden focus-within:ring-2 ring-secondary/50 border border-outline-variant/40 transition-all shadow-inner">
              <textarea
                className="w-full bg-transparent border-none resize-none py-3 md:py-4 pl-3 md:pl-4 pr-12 text-body-md font-body-md text-on-surface focus:ring-0 placeholder:text-outline/70 min-h-[44px] max-h-32"
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
                    className={`transition-colors cursor-pointer touch-target flex items-center justify-center ${isVoiceActive ? "text-error" : "text-outline hover:text-error"}`}
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
              className="w-11 h-11 md:w-12 md:h-14 premium-gradient-primary text-on-primary rounded-xl flex items-center justify-center hover:opacity-95 transition-all flex-shrink-0 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover-lift touch-target"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                send
              </span>
            </button>
          </form>
          <div className="text-center mt-2 md:mt-2.5">
            <span className="text-[10px] md:text-[11px] font-medium text-outline">
              MedPath AI can make mistakes. Verify critical clinical pathways with certified medical staff.
            </span>
          </div>
        </div>

      </div>

      {/* Right Sidebar: Context Summary (Desktop Only — lg+) */}
      <aside className="hidden lg:block w-80 bg-surface/85 dark:bg-surface-container-low/80 backdrop-blur-xl border-l border-outline-variant/15 overflow-y-auto h-full p-6 shrink-0" aria-label="Consultation context">
        <div className="sticky top-0 bg-transparent pb-4 mb-4 border-b border-outline-variant/15 z-10">
          <h3 className="text-label-md font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>
            Consultation Context
          </h3>
        </div>
        <ConsultationContextPanel
          symptomsList={symptomsList}
          context={context}
          selectedLocation={selectedLocation}
          recommendations={recommendations}
          onNavigateRecommendations={() => { navigate("/hospitals", { state: { recommendations } }); closeContextSheet(); }}
        />
      </aside>

      {/* Mobile/Tablet: Context FAB Button (below lg) */}
      <button
        onClick={() => setContextSheetOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 md:bottom-24 md:right-6 z-30 w-12 h-12 rounded-full premium-gradient-primary text-on-primary shadow-lg flex items-center justify-center hover-lift transition-all touch-target"
        aria-label="Open consultation context"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <span className="material-symbols-outlined text-[22px]">tune</span>
      </button>

      {/* Mobile/Tablet: Context Bottom Sheet */}
      {contextSheetOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Consultation context">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${sheetClosing ? "animate-overlay-out" : "animate-overlay-in"}`}
            onClick={closeContextSheet}
            aria-hidden="true"
          />
          {/* Bottom Sheet */}
          <div
            className={`absolute bottom-0 left-0 right-0 max-h-[80vh] bg-surface dark:bg-surface-container rounded-t-3xl shadow-2xl overflow-hidden flex flex-col ${
              sheetClosing ? "animate-sheet-down" : "animate-sheet-up"
            }`}
          >
            {/* Drag Handle + Header */}
            <div className="pt-3 pb-2 px-5 border-b border-outline-variant/15 shrink-0">
              <div className="sheet-handle mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="text-label-md font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>
                  Consultation Context
                </h3>
                <button
                  onClick={closeContextSheet}
                  className="touch-target flex items-center justify-center p-2 rounded-lg hover:bg-surface-container-low text-outline hover:text-primary transition-all"
                  aria-label="Close context panel"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            {/* Sheet Body */}
            <div className="flex-1 overflow-y-auto p-5 pb-safe">
              <ConsultationContextPanel
                symptomsList={symptomsList}
                context={context}
                selectedLocation={selectedLocation}
                recommendations={recommendations}
                onNavigateRecommendations={() => { navigate("/hospitals", { state: { recommendations } }); closeContextSheet(); }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ChatPage;
