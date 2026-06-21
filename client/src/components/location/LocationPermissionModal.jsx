import React, { useState } from "react";
import { usePatientLocation } from "../../context/LocationContext";
import ManualAddressForm from "./ManualAddressForm";
import SavedAddressList from "./SavedAddressList";

/**
 * Modal displayed before consultation starts.
 * Allows user to select location via GPS, manual entry, or saved addresses.
 */
export function LocationPermissionModal({ isOpen, onConfirm, onClose }) {
  const {
    savedLocations,
    selectedLocation,
    gpsStatus,
    error,
    requestGPSLocation,
    selectLocation,
    addLocation,
    dismissError,
  } = usePatientLocation();

  const [view, setView] = useState("main"); // main | manual | confirmed

  if (!isOpen) return null;

  const handleGPS = async () => {
    dismissError();
    const loc = await requestGPSLocation();
    if (loc) {
      setView("confirmed");
    }
  };

  const handleSavedSelect = (loc) => {
    selectLocation(loc);
    setView("confirmed");
  };

  const handleManualSubmit = async (data) => {
    const locationObj = {
      formattedAddress: data.formattedAddress,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
      label: data.label || "Manual Entry",
      latitude: null,
      longitude: null,
    };

    // Save if requested
    if (data.saveAddress) {
      try {
        await addLocation(locationObj);
      } catch {
        // Continue even if save fails
      }
    }

    selectLocation(locationObj);
    setView("confirmed");
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onConfirm(selectedLocation);
    }
  };

  const handleChangeLocation = () => {
    setView("main");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Select your location">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-surface dark:bg-surface-container rounded-t-3xl sm:rounded-3xl shadow-2xl animate-location-slide-up z-10">
        {/* Header */}
        <div className="sticky top-0 bg-surface dark:bg-surface-container z-10 px-6 pt-6 pb-4 border-b border-outline-variant/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              </div>
              <div>
                <h2 className="text-headline-md font-headline-md font-bold text-primary dark:text-primary-fixed">
                  {view === "manual" ? "Enter Address" : view === "confirmed" ? "Location Set" : "Your Location"}
                </h2>
                <p className="text-label-sm text-on-surface-variant">
                  {view === "manual" ? "Fill in your address details" : view === "confirmed" ? "Ready to start consultation" : "Help us find nearby healthcare"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-outline-variant hover:text-on-surface hover:bg-surface-container-low transition-all"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* ===== CONFIRMED VIEW ===== */}
          {view === "confirmed" && selectedLocation && (
            <div className="space-y-5">
              <div className="bg-tertiary-fixed/10 dark:bg-tertiary/10 border border-tertiary/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-label-sm font-semibold text-tertiary uppercase tracking-wider mb-1">
                      {selectedLocation.label || "Selected Location"}
                    </p>
                    <p className="text-body-md text-on-surface leading-relaxed">
                      {selectedLocation.formattedAddress}
                    </p>
                    {selectedLocation.city && (
                      <p className="text-label-sm text-on-surface-variant mt-1">
                        {[selectedLocation.city, selectedLocation.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleChangeLocation}
                className="w-full py-2.5 text-label-md text-secondary hover:text-primary font-medium transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                Change Location
              </button>

              <button
                onClick={handleConfirm}
                className="w-full py-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/95 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                Start Consultation
              </button>
            </div>
          )}

          {/* ===== MANUAL ENTRY VIEW ===== */}
          {view === "manual" && (
            <ManualAddressForm
              onSubmit={handleManualSubmit}
              onCancel={() => setView("main")}
            />
          )}

          {/* ===== MAIN VIEW ===== */}
          {view === "main" && (
            <div className="space-y-5">
              {/* Error Banner */}
              {error && (
                <div className="bg-error-container/20 border border-error/10 rounded-xl p-3 flex items-start gap-2" role="alert">
                  <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0">warning</span>
                  <div className="flex-1">
                    <p className="text-label-sm text-on-error-container">{error}</p>
                  </div>
                  <button onClick={dismissError} className="text-outline-variant hover:text-on-surface p-0.5" aria-label="Dismiss">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}

              {/* GPS Button */}
              <button
                onClick={handleGPS}
                disabled={gpsStatus === "requesting"}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-secondary/40 hover:border-secondary hover:bg-secondary/5 transition-all flex items-center gap-4 group disabled:opacity-60"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform relative">
                  {gpsStatus === "requesting" ? (
                    <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
                      <div className="absolute inset-0 rounded-full bg-secondary/20 animate-location-pulse"></div>
                    </>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-body-md font-semibold text-primary dark:text-primary-fixed">
                    {gpsStatus === "requesting" ? "Detecting location..." : "Use Current Location"}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    Automatically detect via GPS
                  </p>
                </div>
                <span className="material-symbols-outlined text-outline-variant ml-auto group-hover:text-secondary transition-colors">
                  arrow_forward
                </span>
              </button>

              {/* Manual Entry Button */}
              <button
                onClick={() => setView("manual")}
                className="w-full p-4 rounded-2xl border border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">edit_location_alt</span>
                </div>
                <div className="text-left">
                  <p className="text-body-md font-semibold text-primary dark:text-primary-fixed">
                    Enter Address Manually
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    Type your full address
                  </p>
                </div>
                <span className="material-symbols-outlined text-outline-variant ml-auto group-hover:text-primary transition-colors">
                  arrow_forward
                </span>
              </button>

              {/* Saved Locations */}
              {savedLocations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[16px] text-outline-variant">bookmark</span>
                    <h3 className="text-label-md font-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                      Saved Addresses
                    </h3>
                  </div>
                  <SavedAddressList
                    locations={savedLocations}
                    onSelect={handleSavedSelect}
                    selectable={true}
                  />
                </div>
              )}

              {/* Privacy note */}
              <div className="flex items-start gap-2 py-2">
                <span className="material-symbols-outlined text-[14px] text-outline-variant mt-0.5">lock</span>
                <p className="text-[11px] text-outline-variant leading-relaxed">
                  Your location is only used to find nearby healthcare facilities. We never track your location continuously.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LocationPermissionModal;
