/**
 * Constructs a Google Maps directions URL for a hospital target.
 * Uses destination coordinates (latitude, longitude) if available.
 * Fallback priority: google_maps_url -> address/formatted_address -> hospitalName.
 * Automatically appends origin coordinates if userLocation contains valid latitude and longitude.
 *
 * @param {Object} hospital - The hospital object containing latitude, longitude, address, or hospitalName.
 * @param {Object|null} userLocation - The current user location object containing latitude and longitude.
 * @returns {string} Fully formatted Google Maps directions URL.
 */
export function getDirectionsUrl(hospital, userLocation) {
  if (!hospital) return "https://www.google.com/maps";

  let destParam = "";
  const lat = hospital.latitude ?? hospital.lat;
  const lng = hospital.longitude ?? hospital.lng;

  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    destParam = `${lat},${lng}`;
  } else if (hospital.address || hospital.formatted_address) {
    destParam = encodeURIComponent(hospital.address || hospital.formatted_address);
  } else if (hospital.hospitalName || hospital.name) {
    destParam = encodeURIComponent(hospital.hospitalName || hospital.name);
  } else if (hospital.google_maps_url || hospital.googleMapsUrl) {
    return hospital.google_maps_url || hospital.googleMapsUrl;
  } else {
    destParam = "hospital";
  }

  let url = `https://www.google.com/maps/dir/?api=1&destination=${destParam}`;

  if (userLocation?.latitude !== null && userLocation?.latitude !== undefined &&
      userLocation?.longitude !== null && userLocation?.longitude !== undefined) {
    url += `&origin=${userLocation.latitude},${userLocation.longitude}`;
  }

  return url;
}

/**
 * Parses a phone number string that may contain multiple numbers separated by commas, slashes, or semicolons.
 *
 * @param {string|Array} phoneInput - Raw phone input.
 * @returns {Array<string>} Array of cleaned, individual phone number strings.
 */
export function parsePhoneNumbers(phoneInput) {
  if (!phoneInput) return [];
  if (Array.isArray(phoneInput)) return phoneInput.filter(Boolean);
  if (typeof phoneInput !== "string") return [String(phoneInput)];
  return phoneInput
    .split(/[,;/|]+/)
    .map(p => p.trim())
    .filter(Boolean);
}

/**
 * Formats a phone string into a clean tel: protocol link for mobile calling.
 * Strips out non-digit characters except leading '+'.
 *
 * @param {string} phone - Raw phone number string.
 * @returns {string} Cleaned tel: URL string.
 */
export function formatTelUrl(phone) {
  if (!phone) return "#";
  const cleaned = phone.replace(/[^+\d]/g, "");
  return `tel:${cleaned}`;
}

