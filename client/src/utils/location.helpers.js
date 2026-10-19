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
  } else if (hospital.google_maps_url || hospital.googleMapsUrl) {
    return hospital.google_maps_url || hospital.googleMapsUrl;
  } else if (hospital.hospitalName || hospital.name) {
    destParam = encodeURIComponent(hospital.hospitalName || hospital.name);
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

/**
 * Coerces and parses a hospital rating (which may arrive as number, string like "4.2", or null).
 * Returns a valid positive number, or null if unrated/invalid.
 *
 * @param {number|string|null} ratingInput - Raw rating from backend
 * @returns {number|null} Clean numeric rating or null
 */
export function parseHospitalRating(ratingInput) {
  if (ratingInput === null || ratingInput === undefined || ratingInput === "") return null;
  const num = Number(ratingInput);
  return (typeof num === "number" && !isNaN(num) && num > 0) ? num : null;
}

/**
 * Filters, sanitizes, and caps pros/cons lists.
 * Returns at most `max` (default 3) non-empty trimmed strings.
 * Returns an empty array if missing, null, non-array, or empty.
 *
 * @param {*} items - Raw pros or cons input from hospital payload
 * @param {number} [max=3] - Maximum items to return
 * @returns {Array<string>} Cleaned array of at most `max` strings
 */
export function cleanProsCons(items, max = 3) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(item => typeof item === "string" && item.trim().length > 0)
    .map(item => item.trim())
    .slice(0, max);
}

/**
 * Validates that a website URL is a safe web link starting with http:// or https://.
 * Rejects javascript:, data:, ftp:, and malformed strings.
 *
 * @param {*} url - Raw website URL candidate
 * @returns {boolean} True if url starts with http:// or https://
 */
export function isValidWebUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed);
}

/**
 * Formats a hospital distance value, appending " km" to numeric-only values.
 * Returns null for missing, "Unknown", or "Nearby" fallbacks.
 *
 * @param {string|number|null} rawDist - Raw distance from API or normalizer
 * @returns {string|null} Formatted distance string or null
 */
export function formatDistance(rawDist) {
  if (rawDist === null || rawDist === undefined || rawDist === "") return null;
  const str = String(rawDist).trim();
  if (str === "Unknown" || str.toLowerCase() === "nearby" || str.toLowerCase().includes("nearby")) {
    return null;
  }
  // Check if string is purely numeric (e.g. "3.2", "4", "0.8")
  if (/^\d+(\.\d+)?$/.test(str)) {
    return `${str} km`;
  }
  return str;
}



