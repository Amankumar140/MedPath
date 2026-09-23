import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import conversationService from "../services/conversation.service";
import { useAuth } from "./AuthContext";
import { usePatientLocation } from "./LocationContext";
import { auth } from "../firebase/config";

const ConversationContext = createContext();

export function ConversationProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation } = usePatientLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [error, setError] = useState(null);

  // Active state refs for stable callbacks
  const activeIdRef = useRef(activeId);
  const activeConversationRef = useRef(activeConversation);
  useEffect(() => {
    activeIdRef.current = activeId;
    activeConversationRef.current = activeConversation;
  }, [activeId, activeConversation]);

  // Polling States
  const [isPolling, setIsPolling] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState(null);
  const pollIntervalRef = useRef(null);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearPollInterval();
    setIsPolling(false);
    setDiscoveryProgress(null);
  }, [clearPollInterval]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    setError(null);
    try {
      const response = await conversationService.listConversations();
      if (response && response.success) {
        setConversations(response.data);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
      setError(e.isNetworkError
        ? "Unable to load conversations. Check your connection."
        : "Failed to load conversations. Please try again."
      );
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

   const startDiscoveryPolling = useCallback((convoId) => {
    stopPolling();
    setIsPolling(true);
    setDiscoveryProgress({
      progress: 0,
      status: "running",
      current_stage: "Planning",
      percentage: 0
    });

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await conversationService.getDiscoveryProgress(convoId);
        if (res && res.success && res.data) {
          const data = res.data;
          setDiscoveryProgress(data);
          
          if (data.status === "completed" || data.progress === 100) {
            clearPollInterval();
            // Show "Completed" briefly so the user sees the final stage
            setDiscoveryProgress({ progress: 100, status: "completed", current_stage: "Completed", percentage: 100 });

            // Fetch conversation details with retry — DB transaction may still be committing
            let refreshed = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              refreshed = await conversationService.getConversationDetails(convoId);
              if (refreshed?.success && refreshed.data?.recommendationSnapshots?.length > 0) {
                break; // Got recommendations, no need to retry
              }
              // Wait 1.5s before retrying
              await new Promise(resolve => setTimeout(resolve, 1500));
            }

            if (refreshed && refreshed.success) {
              setActiveConversation(refreshed.data);
            }
            // Small delay before hiding progress card so user sees "Completed" state
            setTimeout(() => {
              setIsPolling(false);
              setDiscoveryProgress(null);
            }, 800);
            await loadConversations();
          } else if (data.status === "failed") {
            stopPolling();
            setError("Hospital discovery failed. Please try again.");
          }
        }
      } catch (err) {
        console.error("Error polling discovery progress:", err);
      }
    }, 2000);
  }, [stopPolling, clearPollInterval, loadConversations]);

  const selectConversation = useCallback(async (id) => {
    stopPolling();
    if (!id) {
      setActiveConversation(null);
      setActiveId(null);
      setLoadingActive(false);
      setStreamText("");
      setStreamStatus("");
      setIsStreaming(false);
      setError(null);
      return;
    }

    // If conversation is already loaded in memory and matches activeId, avoid blank screen reload
    if (activeIdRef.current === id && activeConversationRef.current?.conversation?.id === id && activeConversationRef.current?.messages?.length > 0) {
      return;
    }

    // Don't show full loading skeleton if we already have the conversation active
    if (activeIdRef.current !== id) {
      setLoadingActive(true);
    }
    setActiveId(id);
    setError(null);
    try {
      const response = await conversationService.getConversationDetails(id);
      if (response && response.success) {
        setActiveConversation(response.data);
        const taskId = response.data.conversation?.taskId || response.data.patientContext?.taskId;
        const hasRecs = (response.data.recommendationSnapshots?.length || 0) > 0;
        if (taskId && (!hasRecs || response.data.conversation?.status === "ACTIVE")) {
          startDiscoveryPolling(id);
        }
      }
    } catch (e) {
      console.error("Failed to select conversation:", e);
      setError("Failed to load conversation details.");
    } finally {
      setLoadingActive(false);
    }
  }, [startDiscoveryPolling, stopPolling]);

  const startNewConsultation = useCallback(() => {
    stopPolling();
    setActiveConversation(null);
    setActiveId(null);
    setLoadingActive(false);
    setStreamText("");
    setStreamStatus("");
    setIsStreaming(false);
    setError(null);
  }, [stopPolling]);

  const deleteConversation = async (id) => {
    try {
      await conversationService.softDeleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeIdRef.current === id) {
        startNewConsultation();
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
      setError("Failed to delete conversation.");
    }
  };

  const sendUserMessage = async (messageText) => {
    if (!messageText.trim()) return;

    let currentId = activeIdRef.current;

    const welcomeMsg = {
      id: "welcome-1",
      sender: "AI",
      message: `Hello! I am your MedPath AI Assistant. I can analyze your symptoms and search local clinical departments. What symptoms are you experiencing today?`,
      messageType: "TEXT",
      createdAt: new Date().toISOString(),
    };

    const userMsg = {
      id: `msg-usr-${Date.now()}`,
      sender: "USER",
      message: messageText,
      messageType: "TEXT",
      createdAt: new Date().toISOString(),
    };

    // 1. Create a new conversation on backend if not selected yet
    if (!currentId) {
      setLoadingActive(true);
      setError(null);
      try {
        if (auth.currentUser) {
          try {
            const freshToken = await auth.currentUser.getIdToken();
            localStorage.setItem("medpath_token", freshToken);
          } catch (tErr) {
            console.warn("Could not refresh token before conversation creation:", tErr);
          }
        }

        let response;
        try {
          response = await conversationService.createConversation(
            messageText.length > 30 ? messageText.substring(0, 30) + "..." : messageText,
            selectedLocation
          );
        } catch (firstErr) {
          if (auth.currentUser) {
            const freshToken = await auth.currentUser.getIdToken(true);
            localStorage.setItem("medpath_token", freshToken);
            response = await conversationService.createConversation(
              messageText.length > 30 ? messageText.substring(0, 30) + "..." : messageText,
              selectedLocation
            );
          } else {
            throw firstErr;
          }
        }
        if (response && response.success) {
          currentId = response.data.id;
          setActiveId(currentId);

          setActiveConversation({
            conversation: response.data,
            messages: [welcomeMsg, userMsg],
            patientContext: {
              symptoms: messageText,
              age: null,
              durationDays: null,
              location: selectedLocation?.city || selectedLocation?.formattedAddress || "",
              latitude: selectedLocation?.latitude || null,
              longitude: selectedLocation?.longitude || null,
              formattedAddress: selectedLocation?.formattedAddress || "",
              city: selectedLocation?.city || "",
              careIntent: "",
              budget: "",
              isContextComplete: false,
            },
            recommendationSnapshots: [],
          });
          loadConversations();
        }
      } catch (e) {
        console.error("Failed to create consultation:", e);
        setError("Failed to start a new consultation. Please try again.");
        setLoadingActive(false);
        return;
      } finally {
        setLoadingActive(false);
      }
    } else {
      // Append user message directly in UI state
      setActiveConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [
            ...prev.messages,
            userMsg,
          ],
        };
      });
    }

    // 2. Start streaming AI responses
    setIsStreaming(true);
    setStreamText("");
    setStreamStatus("Analyzing symptoms...");
    setError(null);

    conversationService.sendMessageStream(
      currentId,
      messageText,
      selectedLocation,
      (chunk) => {
        if (chunk.type === "status") {
          setStreamStatus(chunk.message);
        } else if (chunk.type === "final") {
          setStreamText(chunk.message);
        }
      },
      async () => {
        // Seamless handoff: fetch DB state before ending isStreaming
        try {
          const refreshed = await conversationService.getConversationDetails(currentId);
          if (refreshed && refreshed.success) {
            setActiveConversation(refreshed.data);
            const taskId = refreshed.data.conversation?.taskId || refreshed.data.patientContext?.taskId;
            const hasRecs = (refreshed.data.recommendationSnapshots?.length || 0) > 0;
            if (taskId && (!hasRecs || refreshed.data.conversation?.status === "ACTIVE")) {
              startDiscoveryPolling(currentId);
            } else {
              loadConversations();
            }
          }
        } catch (refreshErr) {
          console.error("Error refreshing conversation:", refreshErr);
        } finally {
          setIsStreaming(false);
          setStreamText("");
          setStreamStatus("");
        }
      },
      (streamError) => {
        console.error("SSE Streaming Error:", streamError);
        setIsStreaming(false);
        setStreamStatus("");
        setStreamText("");
        setError(
          streamError.message?.includes("timeout") || streamError.message?.includes("timed out")
            ? "The AI service is taking too long. Please try again."
            : streamError.isNetworkError
              ? "Network connection lost during streaming. Please try again."
              : "The AI service is currently unavailable. Please try again later."
        );
        setActiveConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: `msg-err-${Date.now()}`,
                sender: "SYSTEM",
                message: `⚠️ AI Navigator is temporarily unavailable. Please try again shortly.`,
                messageType: "TEXT",
                createdAt: new Date().toISOString(),
              },
            ],
          };
        });
      }
    );
    return currentId;
  };

  const retryLastMessage = async () => {
    if (!activeConversation?.messages?.length) return;

    const lastUserMsg = [...activeConversation.messages]
      .reverse()
      .find(m => m.sender === "USER");

    if (lastUserMsg) {
      setActiveConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.filter(m => m.sender !== "SYSTEM"),
        };
      });
      setError(null);

      setIsStreaming(true);
      setStreamText("");
      setStreamStatus("Retrying...");

      await conversationService.sendMessageStream(
        activeIdRef.current,
        lastUserMsg.message,
        selectedLocation,
        (chunk) => {
          if (chunk.type === "status") {
            setStreamStatus(chunk.message);
          } else if (chunk.type === "final") {
            setStreamText(chunk.message);
          }
        },
        async () => {
          try {
            const refreshed = await conversationService.getConversationDetails(activeIdRef.current);
            if (refreshed && refreshed.success) {
              setActiveConversation(refreshed.data);
              const taskId = refreshed.data.conversation?.taskId || refreshed.data.patientContext?.taskId;
              const hasRecs = (refreshed.data.recommendationSnapshots?.length || 0) > 0;
              if (taskId && (!hasRecs || refreshed.data.conversation?.status === "ACTIVE")) {
                startDiscoveryPolling(activeIdRef.current);
              } else {
                loadConversations();
              }
            }
          } catch (refreshErr) {
            console.error("Error refreshing conversation on retry:", refreshErr);
          } finally {
            setIsStreaming(false);
            setStreamText("");
            setStreamStatus("");
          }
        },
        (streamError) => {
          console.error("Retry SSE Streaming Error:", streamError);
          setIsStreaming(false);
          setStreamStatus("");
          setStreamText("");
          setError("Retry failed. The AI service is still unavailable.");
        }
      );
    }
  };

  const dismissError = () => setError(null);

  // Sync conversations when user is logged in
  useEffect(() => {
    if (authLoading) return; // Prevent wiping state on initial page reload
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setActiveId(null);
    }
  }, [user, authLoading, loadConversations]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <ConversationContext.Provider value={{
      conversations,
      activeConversation,
      activeId,
      loadingConversations,
      loadingActive,
      isStreaming,
      streamText,
      streamStatus,
      error,
      isPolling,
      discoveryProgress,
      loadConversations,
      selectConversation,
      startNewConsultation,
      sendUserMessage,
      deleteConversation,
      retryLastMessage,
      dismissError,
    }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversations must be used within a ConversationProvider");
  }
  return context;
}
