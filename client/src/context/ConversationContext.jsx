import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import conversationService from "../services/conversation.service";
import { useAuth } from "./AuthContext";
import { usePatientLocation } from "./LocationContext";

const ConversationContext = createContext();

export function ConversationProvider({ children }) {
  const { user } = useAuth();
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

  const selectConversation = useCallback(async (id) => {
    if (!id) {
      setActiveConversation(null);
      setActiveId(null);
      return;
    }
    setLoadingActive(true);
    setActiveId(id);
    setError(null);
    try {
      const response = await conversationService.getConversationDetails(id);
      if (response && response.success) {
        setActiveConversation(response.data);
      }
    } catch (e) {
      console.error("Failed to select conversation:", e);
      setError("Failed to load conversation details.");
    } finally {
      setLoadingActive(false);
    }
  }, []);

  const startNewConsultation = () => {
    setActiveConversation(null);
    setActiveId(null);
    setStreamText("");
    setStreamStatus("");
    setIsStreaming(false);
    setError(null);
  };

  const deleteConversation = async (id) => {
    try {
      await conversationService.softDeleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) {
        startNewConsultation();
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
      setError("Failed to delete conversation.");
    }
  };

  const sendUserMessage = async (messageText) => {
    if (!messageText.trim()) return;

    let currentId = activeId;

    // 1. Create a new conversation on backend if not selected yet
    if (!currentId) {
      setLoadingActive(true);
      setError(null);
      try {
        const response = await conversationService.createConversation(
          messageText.length > 30 ? messageText.substring(0, 30) + "..." : messageText
        );
        if (response && response.success) {
          currentId = response.data.id;
          setActiveId(currentId);
          // Pre-populate active conversation with the user message and selected location
          setActiveConversation({
            conversation: response.data,
            messages: [{
              id: "temp-user-msg",
              sender: "USER",
              message: messageText,
              messageType: "TEXT",
              createdAt: new Date().toISOString(),
            }],
            patientContext: {
              symptoms: "",
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
          await loadConversations();
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
            {
              id: `msg-usr-${Date.now()}`,
              sender: "USER",
              message: messageText,
              messageType: "TEXT",
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
    }

    // 2. Start streaming AI responses
    setIsStreaming(true);
    setStreamText("");
    setStreamStatus("Initializing triage checks...");
    setError(null);

    await conversationService.sendMessageStream(
      currentId,
      messageText,
      (chunk) => {
        // Callback on each SSE chunk
        if (chunk.type === "status") {
          setStreamStatus(chunk.message);
        } else if (chunk.type === "final") {
          setStreamText(chunk.message);
        }
      },
      async () => {
        // Callback on stream finish — reload active conversation state from database
        setIsStreaming(false);
        setStreamText("");
        setStreamStatus("");
        await selectConversation(currentId);
        await loadConversations();
      },
      (streamError) => {
        // Callback on error
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
        // Inject error message in active chat log for user transparency
        setActiveConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: `msg-err-${Date.now()}`,
                sender: "SYSTEM",
                message: `⚠️ AI Navigator is temporarily unavailable. This could mean the Python microservice is not running. Please try again shortly.`,
                messageType: "TEXT",
                createdAt: new Date().toISOString(),
              },
            ],
          };
        });
      }
    );
  };

  const retryLastMessage = async () => {
    if (!activeConversation?.messages?.length) return;

    // Find the last user message
    const lastUserMsg = [...activeConversation.messages]
      .reverse()
      .find(m => m.sender === "USER");

    if (lastUserMsg) {
      // Remove any SYSTEM error messages first
      setActiveConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.filter(m => m.sender !== "SYSTEM"),
        };
      });
      setError(null);

      // Re-send the message via streaming
      setIsStreaming(true);
      setStreamText("");
      setStreamStatus("Retrying...");

      await conversationService.sendMessageStream(
        activeId,
        lastUserMsg.message,
        (chunk) => {
          if (chunk.type === "status") {
            setStreamStatus(chunk.message);
          } else if (chunk.type === "final") {
            setStreamText(chunk.message);
          }
        },
        async () => {
          setIsStreaming(false);
          setStreamText("");
          setStreamStatus("");
          await selectConversation(activeId);
          await loadConversations();
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

  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setActiveId(null);
    }
  }, [user, loadConversations]);

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
