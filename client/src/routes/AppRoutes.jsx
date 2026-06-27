import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Lazy-loaded pages for code splitting
const SplashPage = lazy(() => import("../pages/SplashPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const SignupPage = lazy(() => import("../pages/SignupPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const ChatPage = lazy(() => import("../pages/ChatPage"));
const RecommendationsPage = lazy(() => import("../pages/RecommendationsPage"));
const HospitalDetailsPage = lazy(() => import("../pages/HospitalDetailsPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const ReviewWizardPage = lazy(() => import("../pages/ReviewWizardPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

// Eagerly loaded layout (always visible for authenticated users)
import MainLayout from "../layouts/MainLayout";

// Loading Skeleton Spinner
function LoadingScreen() {
  const { theme } = useTheme();
  return (
    <div
      className={`min-h-screen bg-background flex flex-col items-center justify-center ${theme === "light" ? "light" : "dark"}`}
      role="status"
      aria-label="Loading"
    >
      <div className="relative w-16 h-16 flex items-center justify-center mb-4">
        <div className="absolute inset-0 bg-primary-fixed-dim/20 rounded-full animate-ping"></div>
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-on-surface-variant font-label-md animate-pulse">Loading MedPath...</p>
    </div>
  );
}

// Protected Route Guard
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route Guard (prevents logged in users from returning to login/signup)
export function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<SplashPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />

        {/* Protected Main App Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<DashboardPage />} />
          <Route path="chat/:conversationId" element={<ChatPage />} />
          <Route path="history" element={<DashboardPage tab="history" />} />
          <Route path="hospitals" element={<RecommendationsPage />} />
          <Route path="hospitals/:hospitalId" element={<HospitalDetailsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="reviews/wizard" element={<ReviewWizardPage />} />
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
