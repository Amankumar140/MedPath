import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onIdTokenChanged,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import authService from "../services/auth.service";
import userService from "../services/user.service";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Clear all auth state
  const clearAuthState = useCallback(() => {
    setUser(null);
    setFirebaseUser(null);
    setToken(null);
    setAuthError(null);
    localStorage.removeItem("medpath_token");
  }, []);

  // Sync Firebase user with backend database
  const syncWithBackend = useCallback(async (fbUser) => {
    try {
      const idToken = await fbUser.getIdToken(true);
      setToken(idToken);
      localStorage.setItem("medpath_token", idToken);

      const backendResponse = await authService.loginWithToken(idToken);
      if (backendResponse && backendResponse.success) {
        setUser(backendResponse.data);
        setAuthError(null);
      } else {
        throw new Error("Invalid response from MedPath backend");
      }
    } catch (error) {
      console.error("Backend sync failed:", error);
      // Set user from Firebase data as minimal profile if backend is down
      // but mark the error so UI can show a warning
      setUser({
        id: fbUser.uid,
        firebaseUid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || fbUser.email?.split("@")[0],
        fullName: fbUser.displayName || fbUser.email?.split("@")[0],
        photoUrl: fbUser.photoURL || null,
        phoneNumber: fbUser.phoneNumber || null,
        preferredLanguage: "en",
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        isActive: true,
      });
      setAuthError("Backend connection failed. Some features may be limited.");
    }
  }, []);

  // Listen for Firebase auth state and token changes
  // onIdTokenChanged fires on sign-in, sign-out, AND token refresh
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        await syncWithBackend(fbUser);
      } else {
        clearAuthState();
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase auth subscription error:", error);
      clearAuthState();
      setLoading(false);
    });

    return unsubscribe;
  }, [syncWithBackend, clearAuthState]);

  // Listen for auth-expired events from axios interceptor
  useEffect(() => {
    const handleAuthExpired = async (event) => {
      console.warn("Auth expired event received:", event.detail.message);
      setAuthError(event.detail.message);
      try {
        await signOut(auth);
      } catch {
        // Silent — clearing state below
      }
      clearAuthState();
    };

    window.addEventListener("medpath:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("medpath:auth-expired", handleAuthExpired);
  }, [clearAuthState]);

  // Proactive token refresh — Firebase auto-refreshes tokens ~5 min before expiry,
  // but we set an interval as a safety net to keep localStorage in sync
  useEffect(() => {
    if (!firebaseUser) return;

    const refreshInterval = setInterval(async () => {
      try {
        const freshToken = await firebaseUser.getIdToken(false);
        setToken(freshToken);
        localStorage.setItem("medpath_token", freshToken);
      } catch (error) {
        console.error("Token refresh failed:", error);
        setAuthError("Session expired. Please sign in again.");
        clearAuthState();
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(refreshInterval);
  }, [firebaseUser, clearAuthState]);

  const loginWithEmail = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseUser(credential.user);
      await syncWithBackend(credential.user);
      return credential.user;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (email, password, fullName) => {
    setLoading(true);
    setAuthError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateFirebaseProfile(credential.user, { displayName: fullName });
      setFirebaseUser(credential.user);
      await syncWithBackend(credential.user);
      return credential.user;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      setFirebaseUser(credential.user);
      await syncWithBackend(credential.user);
      return credential.user;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      try {
        await authService.logout();
      } catch {
        // Backend logout is best-effort
      }
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      clearAuthState();
      setLoading(false);
    }
  };

  const updateProfile = async (updatedFields) => {
    try {
      if (updatedFields.displayName && firebaseUser) {
        await updateFirebaseProfile(firebaseUser, { displayName: updatedFields.displayName });
      }

      const backendPayload = {};
      if (updatedFields.fullName !== undefined) {
        backendPayload.fullName = updatedFields.fullName;
      }
      if (updatedFields.preferredLanguage !== undefined) {
        backendPayload.preferredLanguage = updatedFields.preferredLanguage;
      }
      if (updatedFields.phoneNumber !== undefined) {
        backendPayload.phoneNumber = updatedFields.phoneNumber;
      }

      const response = await userService.updateProfile(backendPayload);
      if (response && response.success) {
        setUser(response.data);
      }
      return response;
    } catch (error) {
      console.error("Failed to update user profile:", error);
      throw error;
    }
  };

  const dismissError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      token,
      authError,
      loginWithEmail,
      signupWithEmail,
      loginWithGoogle,
      logout,
      updateProfile,
      dismissError,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Maps Firebase auth error codes to user-friendly messages
 */
function getAuthErrorMessage(error) {
  const code = error.code;
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed. Please try again.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked by your browser. Please allow popups.";
    default:
      return error.message || "Authentication failed. Please try again.";
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
