import React, { useState } from "react";
import { usePatientLocation } from "../../context/LocationContext";
import ManualAddressForm from "./ManualAddressForm";
import SavedAddressList from "./SavedAddressList";

/**
 * Full location settings panel for the Profile page.
 * Allows managing saved addresses: add, edit, delete, set default.
 */
export function LocationSettings() {
  const {
    savedLocations,
    loadingLocations,
    addLocation,
    updateSavedLocation,
    removeLocation,
    requestGPSLocation,
    gpsStatus,
    error,
    dismissError,
  } = usePatientLocation();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [addMode, setAddMode] = useState(null); // null | 'manual' | 'gps'

  const handleAddManual = async (data) => {
    await addLocation({
      label: data.label,
      formattedAddress: data.formattedAddress,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
      isDefault: savedLocations.length === 0,
    });
    setShowAddForm(false);
    setAddMode(null);
  };

  const handleAddGPS = async () => {
    setAddMode("gps");
    const loc = await requestGPSLocation();
    if (loc) {
      await addLocation({
        label: "Current Location",
        formattedAddress: loc.formattedAddress,
        latitude: loc.latitude,
        longitude: loc.longitude,
        city: loc.city || null,
        state: loc.state || null,
        country: loc.country || null,
        postalCode: loc.postalCode || null,
        isDefault: savedLocations.length === 0,
      });
    }
    setAddMode(null);
  };

  const handleEdit = (loc) => {
    setEditingLocation(loc);
  };

  const handleEditSubmit = async (data) => {
    if (!editingLocation) return;
    await updateSavedLocation(editingLocation.id, {
      label: data.label || editingLocation.label,
      formattedAddress: data.formattedAddress,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
    });
    setEditingLocation(null);
  };

  const handleSetDefault = async (id) => {
    await updateSavedLocation(id, { isDefault: true });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
          </div>
          <div>
            <h3 className="text-body-lg font-semibold text-primary dark:text-primary-fixed">Saved Locations</h3>
            <p className="text-label-sm text-on-surface-variant">{savedLocations.length} address{savedLocations.length !== 1 ? "es" : ""} saved</p>
          </div>
        </div>
        {!showAddForm && !editingLocation && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors text-label-md font-label-md flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-container/20 border border-error/10 rounded-xl p-3 flex items-center gap-2" role="alert">
          <span className="material-symbols-outlined text-error text-[18px]">warning</span>
          <p className="text-label-sm text-on-error-container flex-1">{error}</p>
          <button onClick={dismissError} className="text-outline-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* Add New Location Form */}
      {showAddForm && !editingLocation && (
        <div className="glass-card rounded-2xl p-5 border border-secondary/20">
          {!addMode && (
            <div className="space-y-3">
              <h4 className="text-label-md font-label-md font-semibold text-primary">Add New Address</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAddMode("manual")}
                  className="p-4 rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
                >
                  <span className="material-symbols-outlined text-primary text-[28px] mb-1 block">edit_location_alt</span>
                  <p className="text-label-sm font-semibold text-primary">Enter Manually</p>
                </button>
                <button
                  onClick={handleAddGPS}
                  disabled={gpsStatus === "requesting"}
                  className="p-4 rounded-xl border border-outline-variant/30 hover:border-secondary/40 hover:bg-secondary/5 transition-all text-center disabled:opacity-60"
                >
                  {gpsStatus === "requesting" ? (
                    <div className="w-7 h-7 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                  ) : (
                    <span className="material-symbols-outlined text-secondary text-[28px] mb-1 block">my_location</span>
                  )}
                  <p className="text-label-sm font-semibold text-secondary">Use GPS</p>
                </button>
              </div>
              <button
                onClick={() => { setShowAddForm(false); setAddMode(null); }}
                className="w-full py-2 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {addMode === "manual" && (
            <div>
              <h4 className="text-label-md font-label-md font-semibold text-primary mb-4">Enter Address</h4>
              <ManualAddressForm
                onSubmit={handleAddManual}
                onCancel={() => { setAddMode(null); setShowAddForm(false); }}
                showSaveOption={false}
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Location Form */}
      {editingLocation && (
        <div className="glass-card rounded-2xl p-5 border border-primary/20">
          <h4 className="text-label-md font-label-md font-semibold text-primary mb-4">
            Edit: {editingLocation.label}
          </h4>
          <ManualAddressForm
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingLocation(null)}
            initialData={{
              label: editingLocation.label,
              city: editingLocation.city || "",
              state: editingLocation.state || "",
              pincode: editingLocation.postalCode || "",
              country: editingLocation.country || "India",
            }}
            showSaveOption={false}
          />
        </div>
      )}

      {/* Saved Locations List */}
      {!showAddForm && !editingLocation && (
        <SavedAddressList
          locations={savedLocations}
          loading={loadingLocations}
          selectable={false}
          onEdit={handleEdit}
          onDelete={removeLocation}
          onSetDefault={handleSetDefault}
        />
      )}
    </div>
  );
}

export default LocationSettings;
