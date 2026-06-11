import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ConversationProvider } from "./context/ConversationContext";
import { LocationProvider } from "./context/LocationContext";
import { ToastProvider } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import AppRoutes from "./routes/AppRoutes";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <LocationProvider>
                <ConversationProvider>
                  <AppRoutes />
                </ConversationProvider>
              </LocationProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

