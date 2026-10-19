import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export function NotFoundPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-body-md text-on-surface ${theme === "light" ? "light" : "dark"}`}>
      <div className="bg-surface-container rounded-[28px] border border-outline-variant/15 p-10 max-w-[440px] w-full flex flex-col items-center justify-center shadow-sm">
        <span className="material-symbols-outlined text-[72px] text-error mb-4">error_outline</span>
        <h1 className="text-display-lg font-display-lg text-primary mb-2 font-bold">404</h1>
        <h2 className="text-headline-md font-headline-md text-on-background mb-4 font-bold">Page Not Found</h2>
        <p className="text-body-md text-on-surface-variant mb-6">
          The requested page is missing or has been relocated. Let's return to your dashboard.
        </p>
        <Link 
          to="/home" 
          className="w-full bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80 py-3.5 rounded-full font-medium text-label-md shadow-sm transition-all text-center cursor-pointer active:scale-95"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
