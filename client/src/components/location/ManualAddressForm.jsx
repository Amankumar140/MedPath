import React, { useState } from "react";

/**
 * Manual address entry form for locations with OpenStreetMap Nominatim Autocomplete.
 * Composes a formatted address and coordinates.
 */
export function ManualAddressForm({ onSubmit, onCancel, initialData = {}, showSaveOption = true }) {
  const [form, setForm] = useState({
    house: initialData.house || "",
    street: initialData.street || "",
    area: initialData.area || "",
    city: initialData.city || "",
    state: initialData.state || "",
    pincode: initialData.pincode || initialData.postalCode || "",
    country: initialData.country || "India",
  });
  const [coords, setCoords] = useState({
    latitude: initialData.latitude || null,
    longitude: initialData.longitude || null,
    accuracy: initialData.accuracy || null,
    timestamp: initialData.timestamp || null,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [label, setLabel] = useState(initialData.label || "");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSearchChange = async (val) => {
    setSearchQuery(val);
    if (val.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            'User-Agent': 'MedPath-Healthcare-App/1.0',
            'Accept-Language': 'en',
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (e) {
      console.error("Nominatim search failed:", e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    const addr = item.address || {};
    setForm({
      house: addr.house_number || addr.building || "",
      street: addr.road || addr.suburb || addr.neighbourhood || "",
      area: addr.suburb || addr.neighbourhood || addr.city_district || "",
      city: addr.city || addr.town || addr.village || addr.county || "",
      state: addr.state || "",
      pincode: addr.postcode || "",
      country: addr.country || "India",
    });
    setCoords({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      accuracy: null,
      timestamp: Date.now(),
    });
    setSearchQuery(item.display_name);
    setSuggestions([]);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.street.trim()) newErrors.street = "Street is required";
    if (!form.area.trim()) newErrors.area = "Area / Locality is required";
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.state.trim()) newErrors.state = "State is required";
    if (!form.pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{4,10}$/.test(form.pincode.trim())) newErrors.pincode = "Invalid pincode";
    if (!form.country.trim()) newErrors.country = "Country is required";
    if (saveAddress && !label.trim()) newErrors.label = "Label is required when saving";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const composeAddress = () => {
    const parts = [form.house, form.street, form.area, form.city, form.state, form.pincode, form.country]
      .map(p => p.trim())
      .filter(Boolean);
    return parts.join(", ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const formattedAddress = composeAddress();
    const locationData = {
      formattedAddress,
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      postalCode: form.pincode.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: coords.timestamp || Date.now(),
      label: saveAddress ? label.trim() : "Manual Entry",
      saveAddress,
    };

    try {
      await onSubmit(locationData);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 bg-surface-container-lowest border rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline-variant dark:placeholder:text-outline focus:ring-2 focus:ring-secondary/50 focus:outline-none transition-all ${
      errors[field] ? "border-error" : "border-outline-variant/40"
    }`;

  return (
    <div className="space-y-5">
      {/* Autocomplete Search input */}
      <div className="relative">
        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5 font-bold">
          Search Address (Autocomplete)
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface font-body-md text-body-md placeholder:text-outline-variant focus:ring-2 focus:ring-secondary/50 focus:outline-none transition-all"
            placeholder="Start typing an address..."
          />
          <span className="material-symbols-outlined absolute left-3 text-outline text-[20px]">search</span>
          {searching && (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin absolute right-3"></div>
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute w-full mt-1.5 bg-surface-bright dark:bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-lg z-[100] max-h-60 overflow-y-auto divide-y divide-outline-variant/10">
            {suggestions.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full px-4 py-3 text-left text-body-md hover:bg-surface-container-low transition-colors text-on-surface flex items-start gap-2.5"
              >
                <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">location_on</span>
                <span className="truncate">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-outline-variant/20"></div>
        <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Or Edit Details Manually</span>
        <div className="flex-1 h-px bg-outline-variant/20"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* House / Building */}
        <div>
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">
            House / Building <span className="text-outline">(optional)</span>
          </label>
          <input
            type="text"
            value={form.house}
            onChange={(e) => handleChange("house", e.target.value)}
            className={inputClass("house")}
            placeholder="e.g. Flat 302, Tower B"
          />
        </div>

        {/* Street */}
        <div>
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">
            Street <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={form.street}
            onChange={(e) => handleChange("street", e.target.value)}
            className={inputClass("street")}
            placeholder="e.g. MG Road"
          />
          {errors.street && <p className="text-error text-xs mt-1">{errors.street}</p>}
        </div>

        {/* Area / Locality */}
        <div>
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">
            Area / Locality <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={form.area}
            onChange={(e) => handleChange("area", e.target.value)}
            className={inputClass("area")}
            placeholder="e.g. Koramangala"
          />
          {errors.area && <p className="text-error text-xs mt-1">{errors.area}</p>}
        </div>

        {/* City + State Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">
              City <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className={inputClass("city")}
              placeholder="e.g. Bangalore"
            />
            {errors.city && <p className="text-error text-xs mt-1">{errors.city}</p>}
          </div>
          <div>
            <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">
              State <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => handleChange("state", e.target.value)}
              className={inputClass("state")}
              placeholder="e.g. Karnataka"
            />
            {errors.state && <p className="text-error text-xs mt-1">{errors.state}</p>}
          </div>
        </div>

        {/* Pincode + Country Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">
              Pincode <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={form.pincode}
              onChange={(e) => handleChange("pincode", e.target.value)}
              className={inputClass("pincode")}
              placeholder="e.g. 560034"
            />
            {errors.pincode && <p className="text-error text-xs mt-1">{errors.pincode}</p>}
          </div>
          <div>
            <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">
              Country <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => handleChange("country", e.target.value)}
              className={inputClass("country")}
              placeholder="e.g. India"
            />
            {errors.country && <p className="text-error text-xs mt-1">{errors.country}</p>}
          </div>
        </div>

        {/* Save option */}
        {showSaveOption && (
          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                  saveAddress
                    ? "bg-secondary border-secondary"
                    : "border-outline-variant group-hover:border-secondary"
                }`}>
                  {saveAddress && (
                    <span className="material-symbols-outlined text-on-secondary text-[14px]">check</span>
                  )}
                </div>
              </div>
              <span className="text-body-md text-on-surface">Save this address for future use</span>
            </label>

            {saveAddress && (
              <div className="ml-8">
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">
                  Address Label <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    if (errors.label) setErrors(prev => { const n = {...prev}; delete n.label; return n; });
                  }}
                  className={inputClass("label")}
                  placeholder="e.g. Home, Work, Parents"
                />
                {errors.label && <p className="text-error text-xs mt-1">{errors.label}</p>}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-outline-variant/40 text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/95 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                Confirming...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">check</span>
                Confirm Address
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ManualAddressForm;
