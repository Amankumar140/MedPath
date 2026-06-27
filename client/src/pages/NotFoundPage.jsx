import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export function NotFoundPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-body-md text-on-surface ${theme === "light" ? "light" : "dark"}`}>
      <div className="glass-card rounded-[32px] p-10 max-w-[440px] w-full flex flex-col items-center justify-center shadow-lg">
        <span className="material-symbols-outlined text-[72px] text-error mb-4">error_outline</span>
        <h1 className="text-display-lg font-display-lg text-primary mb-2">404</h1>
        <h2 className="text-headline-md font-headline-md text-on-background mb-4">Page Not Found</h2>
        <p className="text-body-md text-on-surface-variant mb-6">
          The requested page is missing or has been relocated. Let's return to your dashboard.
        </p>
        <Link 
          to="/home" 
          className="w-full bg-primary text-on-primary hover:bg-primary/95 py-3.5 rounded-lg font-label-md text-label-md shadow-sm transition-colors text-center cursor-pointer"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
