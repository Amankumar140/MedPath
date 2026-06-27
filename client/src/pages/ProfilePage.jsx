import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { SkeletonPulse, SkeletonCircle } from "../components/SkeletonLoader";
import LocationSettings from "../components/location/LocationSettings";
import { Card, Button, Input, Select } from "../components/ui";

export function ProfilePage() {
  const { user, loading, updateProfile, logout, authError, dismissError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [language, setLanguage] = useState(user?.preferredLanguage || "en");
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await updateProfile({
        fullName: displayName,
        displayName,
        preferredLanguage: language,
      });
      setSuccessMsg("Settings updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading && !user) {
    return (
      <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full" role="main">
        <div className="mb-6">
          <SkeletonPulse className="h-8 w-48 mb-2" />
          <SkeletonPulse className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card variant="glass" className="p-6 flex flex-col items-center space-y-4">
            <SkeletonCircle size="w-24 h-24" />
            <SkeletonPulse className="h-6 w-32" />
            <SkeletonPulse className="h-4 w-40" />
          </Card>
          <Card variant="glass" className="lg:col-span-2 p-6 space-y-6">
            <SkeletonPulse className="h-6 w-36" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonPulse className="h-12 w-full rounded-lg" />
              <SkeletonPulse className="h-12 w-full rounded-lg" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full animate-slide-up" role="main" aria-label="Profile Settings">
      <div className="mb-6">
        <h2 className="text-headline-lg font-headline-lg font-bold premium-text-gradient">Profile Settings</h2>
        <p className="text-body-md text-on-surface-variant mt-1.5 font-medium">Manage your account profile, preferences, and theme.</p>
      </div>

      {/* Auth error warning */}
      {authError && (
        <div className="mb-4 p-3.5 bg-error-container/20 text-on-error-container rounded-xl text-sm border border-error/15 flex items-center justify-between gap-2 animate-fade-in" role="alert">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">warning</span>
            <span className="font-semibold">{authError}</span>
          </div>
          <button onClick={dismissError} className="text-outline hover:text-on-surface p-1 cursor-pointer" aria-label="Dismiss warning">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Profile Card Summary */}
        <Card variant="glass" hoverLift className="p-6 flex flex-col items-center text-center space-y-5 shadow-md">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-container shadow-sm relative group">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="User Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-container text-primary flex items-center justify-center font-bold text-2xl uppercase" aria-label={user?.displayName || "User"}>
                {user?.displayName ? user.displayName.substring(0, 2) : "US"}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed">
              {user?.displayName || "MedPath User"}
            </h3>
            <p className="text-body-md text-on-surface-variant font-medium mt-1">{user?.email}</p>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            icon="logout"
            className="w-full bg-surface-container-low hover:bg-error-container/10 text-error border border-outline-variant/30 py-3.5 rounded-xl font-bold text-label-md"
            ariaLabel="Sign out of MedPath"
          >
            Sign Out
          </Button>
        </Card>

        {/* Edit Settings form */}
        <Card variant="glass" className="lg:col-span-2 p-6 md:p-8 space-y-6 shadow-md">
          <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed">Edit Information</h3>

          {successMsg && (
            <div className="p-3.5 bg-tertiary-container/20 text-on-tertiary-container rounded-xl text-sm border border-tertiary/10 flex items-center gap-2 animate-fade-in" role="status">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">check_circle</span>
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-error-container/20 text-on-error-container rounded-xl text-sm border border-error/10 flex items-center gap-2 animate-fade-in" role="alert">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Display Name"
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />

              <Select
                label="Preferred Language"
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={[
                  { value: "en", label: "English" },
                  { value: "es", label: "Español (Spanish)" },
                  { value: "hi", label: "हिन्दी (Hindi)" }
                ]}
              />
            </div>

            <div className="border-t border-outline-variant/15 pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-12 h-6 rounded-full bg-outline-variant/40 relative transition-all duration-300 cursor-pointer"
                  role="switch"
                  aria-checked={theme === "dark"}
                  aria-label="Toggle dark mode"
                >
                  <span className={`absolute w-5 h-5 bg-primary rounded-full top-0.5 transition-all duration-300 ${
                    theme === "dark" ? "left-[26px]" : "left-0.5"
                  }`}></span>
                </button>
                <span className="font-bold text-on-surface">Toggle {theme === "dark" ? "Light" : "Dark"} Mode</span>
              </div>

              <Button
                type="submit"
                disabled={updating}
                loading={updating}
                variant="primary"
                className="min-w-[130px]"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Saved Locations Section */}
        <Card variant="glass" className="p-6 md:p-8 border border-outline-variant/15 shadow-md">
          <LocationSettings />
        </Card>

      </div>
    </div>
  );
}

export default ProfilePage;
