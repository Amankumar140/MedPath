/**
 * Canonical Hospital Normalizer
 * 
 * This module is the SINGLE normalization boundary between Swasthya AI Core
 * (or any external hospital discovery provider) and MedPath's internal
 * canonical hospital representation.
 * 
 * All provider-specific field aliases are resolved HERE, once.
 * Downstream code (DB writes, API responses, frontend) should never need
 * to resolve snake_case / camelCase / provider-specific aliases.
 * 
 * CANONICAL MEDPATH RECOMMENDATION CONTRACT:
 * 
 * Field                | Type       | Description
 * ---------------------|------------|--------------------------------------
 * hospitalName         | String     | Display name of the hospital
 * rankingPosition      | Int        | 1-based clinical rank
 * confidenceScore      | Float      | 0–1 normalized match confidence
 * trustScore           | Float      | 0–5 star rating
 * reviewCount          | Int?       | Number of reviews
 * suitability          | String?    | Match assessment (e.g. "Top Result")
 * source               | String?    | Provider/provenance (e.g. "Swasthya AI Core")
 * distance             | String     | Formatted distance (e.g. "2.4 km")
 * travelTime           | String?    | Formatted travel time (e.g. "8 mins")
 * latitude             | Float?     | GPS latitude
 * longitude            | Float?     | GPS longitude
 * address              | String?    | Full formatted address
 * landmark             | String?    | Nearby landmark
 * phone                | String?    | Contact phone number(s)
 * emergencyContact     | String?    | Emergency hotline
 * email                | String?    | Contact email
 * website              | String?    | Official website URL
 * googleMapsUrl        | String?    | Google Maps navigation URL
 * hospitalType         | String?    | e.g. "Super Specialty", "General Hospital"
 * hasEmergency         | Boolean    | 24/7 emergency available
 * hasIcu               | Boolean    | ICU available
 * bedCapacity          | Int?       | Total bed count
 * operatingHours       | String?    | e.g. "24 Hours (OPD 8:00 AM - 8:00 PM)"
 * insuranceAccepted    | Boolean?   | Cashless insurance supported
 * parking              | Boolean?   | Parking available
 * languages            | Json?      | Spoken languages array
 * accreditations       | Json?      | Accreditation array
 * specialties          | Json?      | Medical specialties array
 * departments          | Json?      | Clinical departments array
 * facilities           | Json?      | Diagnostic facilities array
 * services             | Json?      | Medical services array
 * doctors              | Json?      | Doctor/specialist objects array
 * pros                 | Json?      | Key highlights array
 * cons                 | Json?      | Considerations array
 * estimatedCost        | String     | Formatted cost string (e.g. "₹800 - ₹3,500")
 * estimatedCostRange   | Json?      | Structured cost object
 * overallScore         | Float?     | Raw overall score (0-100 or 0-1)
 * reason               | String     | Clinical explanation / rationale
 * summary              | String?    | Hospital overview
 * rawMetadata          | Json?      | Complete original provider object
 */

const logger = require('../config/logger');

/**
 * Resolves a field value from multiple possible provider-specific aliases.
 * Returns the first truthy value found, or the fallback.
 * 
 * @param {Object} obj - The source object
 * @param {string[]} aliases - Array of field names to try, in priority order
 * @param {*} fallback - Default value if none found
 * @returns {*} The resolved value
 */
function resolveField(obj, aliases, fallback = null) {
  for (const alias of aliases) {
    if (obj[alias] !== undefined && obj[alias] !== null) {
      return obj[alias];
    }
  }
  return fallback;
}

/**
 * Formats a cost range object into a display string.
 * @param {Object|string|null} costVal - Cost range or string
 * @returns {{ costStr: string, costRange: Object|null }}
 */
function formatCostRange(costVal) {
  let costRange = null;
  let costStr = null;

  if (costVal && typeof costVal === 'object' && (costVal.min !== undefined || costVal.max !== undefined || costVal.min_inr !== undefined)) {
    costRange = costVal;
    const min = costVal.min ?? costVal.min_inr ?? costVal.min_cost;
    const max = costVal.max ?? costVal.max_inr ?? costVal.max_cost;
    if (min !== undefined && max !== undefined) {
      costStr = `₹${Number(min).toLocaleString()} - ₹${Number(max).toLocaleString()}`;
    } else if (min !== undefined) {
      costStr = `From ₹${Number(min).toLocaleString()}`;
    }
  } else if (typeof costVal === 'string') {
    // Try parsing JSON string
    try {
      const parsed = JSON.parse(costVal);
      if (parsed && typeof parsed === 'object' && (parsed.min !== undefined || parsed.max !== undefined)) {
        costRange = parsed;
        const min = parsed.min ?? parsed.min_inr;
        const max = parsed.max ?? parsed.max_inr;
        costStr = `₹${Number(min).toLocaleString()} - ₹${Number(max).toLocaleString()}`;
      }
    } catch (e) {
      // Raw text cost
      const trimmed = costVal.trim();
      if (trimmed && trimmed !== '{}' && trimmed !== 'null' && trimmed.toLowerCase() !== 'variable cost' && trimmed.toLowerCase() !== 'unknown') {
        costStr = trimmed;
      }
    }
  }

  return { costStr, costRange };
}

/**
 * Normalizes a raw Swasthya hospital recommendation into the canonical
 * MedPath recommendation contract.
 * 
 * This is the ONLY place where provider-specific field aliases are resolved.
 * 
 * @param {Object} raw - Raw hospital object from Swasthya or local fallback
 * @param {Object} options - Additional context
 * @param {number} options.patientLat - Patient latitude for distance calculation
 * @param {number} options.patientLng - Patient longitude for distance calculation
 * @param {string} options.defaultSource - Default source provenance
 * @param {Function} options.distanceFn - Distance calculation function(hosp, lat, lng)
 * @returns {Object} Canonical MedPath recommendation object
 */
function normalizeHospital(raw, options = {}) {
  const {
    patientLat = null,
    patientLng = null,
    defaultSource = 'Swasthya AI Core',
    distanceFn = null,
  } = options;

  // === Name ===
  const hospitalName = resolveField(raw, ['hospital_name', 'name', 'hospitalName'], 'Specialized Healthcare Facility');

  // === Ranking ===
  const rawRank = resolveField(raw, ['rank', 'ranking_position', 'rankingPosition'], null);
  const parsedRank = (rawRank !== null && rawRank !== undefined && String(rawRank).trim() !== '') ? Number(rawRank) : null;
  const validRank = (parsedRank !== null && !isNaN(parsedRank)) ? parsedRank : null;
  const rankingPosition = validRank !== null ? validRank : 1;

  // === Scores ===
  // Confidence score: normalize to 0–1 range
  let rawScore = resolveField(raw, ['overall_score', 'confidence_score', 'confidenceScore', 'overallScore'], 0.85);
  if (typeof rawScore !== 'number') rawScore = parseFloat(rawScore) || 0.85;
  const confidenceScore = rawScore > 1 ? rawScore / 100 : rawScore;

  // Trust score: 0–5 star rating (null if unrated)
  let trustScore = resolveField(raw, ['overall_rating', 'trust_score', 'rating', 'trustScore', 'overallRating'], null);
  if (trustScore !== null && typeof trustScore !== 'number') {
    trustScore = parseFloat(trustScore) || null;
  }

  // Review count
  const reviewCount = resolveField(raw, ['review_count', 'reviewCount'], null);

  // === CRITICAL: Source and Suitability are INDEPENDENT ===
  // source = provider/provenance (e.g. "Swasthya AI Core")
  // suitability = match assessment (e.g. "Top Result", "Good Option", "Other Option")
  const source = resolveField(raw, ['source'], defaultSource);
  let suitability = resolveField(raw, ['suitability'], null);
  if (!suitability) {
    if (validRank !== null) {
      if (validRank === 1) {
        suitability = 'Top Result';
      } else if (validRank === 2 || validRank === 3) {
        suitability = 'Good Option';
      } else {
        suitability = 'Other Option';
      }
    } else {
      if (confidenceScore >= 0.70) {
        suitability = 'Top Result';
      } else if (confidenceScore >= 0.40) {
        suitability = 'Good Option';
      } else {
        suitability = 'Other Option';
      }
    }
  }

  // === Distance & Travel ===
  let distance = null;
  const distKm = resolveField(raw, ['distance_km', 'distanceKm'], null);
  const distRaw = resolveField(raw, ['distance'], null);

  if (distKm) {
    distance = typeof distKm === 'string' && (distKm.includes('km') || distKm.includes('m'))
      ? distKm
      : `${distKm} km`;
  } else if (distRaw && distRaw !== 'Unknown' && distRaw !== 'Nearby') {
    distance = typeof distRaw === 'number' ? `${distRaw} km` : distRaw;
  } else if (distanceFn) {
    distance = distanceFn(raw, patientLat, patientLng);
  }
  if (!distance) distance = 'Nearby';

  // Travel time
  const estMinutes = resolveField(raw, ['estimated_travel_time_minutes', 'est_time_mins'], null);
  let travelTime = resolveField(raw, ['travel_time', 'travelTime'], null);
  if (!travelTime && estMinutes) {
    travelTime = `${estMinutes} mins`;
  }

  // === Location ===
  const latitude = resolveField(raw, ['latitude', 'lat'], null);
  const longitude = resolveField(raw, ['longitude', 'lng'], null);
  const address = resolveField(raw, ['formatted_address', 'address', 'location', 'full_address', 'formattedAddress'], null);
  const landmark = resolveField(raw, ['landmark'], null);

  // === Contact ===
  const phone = resolveField(raw, ['contact_number', 'phone', 'phone_number', 'phoneNumber', 'contact', 'telephone'], null);
  const emergencyContact = resolveField(raw, ['emergency_contact', 'emergencyContact'], null);
  const email = resolveField(raw, ['email'], null);
  const website = resolveField(raw, ['website', 'website_url', 'websiteUrl'], null);
  const googleMapsUrl = resolveField(raw, ['google_maps_url', 'googleMapsUrl'], null);

  // === Hospital Properties ===
  const hospitalType = resolveField(raw, ['hospital_type', 'hospitalType', 'type'], null);
  const hasEmergency = resolveField(raw, ['has_emergency', 'hasEmergency', 'emergency_available'], true);
  const hasIcu = resolveField(raw, ['has_icu', 'hasIcu', 'icu_available'], true);
  const bedCapacity = resolveField(raw, ['bed_capacity', 'bedCapacity'], null);
  const operatingHours = resolveField(raw, ['operating_hours', 'operatingHours'], null);
  const insuranceAccepted = resolveField(raw, ['insurance_accepted', 'insuranceAccepted'], null);
  const parking = resolveField(raw, ['parking'], null);

  // === Collections ===
  const languages = resolveField(raw, ['languages'], null);
  const accreditations = resolveField(raw, ['accreditations', 'certifications'], null);
  const specialties = resolveField(raw, ['specialties'], null);
  const departments = resolveField(raw, ['departments'], null);
  const facilities = resolveField(raw, ['facilities'], null);
  const services = resolveField(raw, ['services'], null);
  const doctors = resolveField(raw, ['doctors'], null);
  const pros = resolveField(raw, ['pros', 'highlights'], null);
  const cons = resolveField(raw, ['cons', 'considerations'], null);

  // === Cost ===
  const costInput = resolveField(raw, ['estimated_cost_range', 'estimatedCostRange', 'cost'], null);
  const { costStr, costRange } = formatCostRange(costInput);

  // === Clinical ===
  const reason = resolveField(raw, ['explanation', 'reason', 'summary'], 'Specialized clinical facility matched for your reported symptoms.');
  const summary = resolveField(raw, ['summary', 'description', 'overview'], null);

  logger.info(`[SWASTHYA_NORMALIZATION_V2] Normalized hospital: "${hospitalName}" (source="${source}", suitability="${suitability}")`);

  return {
    hospitalName,
    rankingPosition,
    confidenceScore,
    trustScore,
    reviewCount,
    suitability,
    source,
    distance,
    travelTime,
    latitude,
    longitude,
    address,
    landmark,
    phone,
    emergencyContact,
    email,
    website,
    googleMapsUrl,
    hospitalType,
    hasEmergency: hasEmergency ?? true,
    hasIcu: hasIcu ?? true,
    bedCapacity: typeof bedCapacity === 'number' ? bedCapacity : (bedCapacity ? parseInt(bedCapacity, 10) || null : null),
    operatingHours,
    insuranceAccepted,
    parking,
    languages,
    accreditations,
    specialties,
    departments,
    facilities,
    services,
    doctors,
    pros,
    cons,
    estimatedCost: costStr,
    estimatedCostRange: costRange,
    overallScore: confidenceScore,
    reason,
    summary,
    // rawMetadata: the complete original provider object for forward compatibility
    rawMetadata: raw,
  };
}

/**
 * Normalizes a local Hospital DB record into the canonical format.
 * Used by local fallback discovery.
 * 
 * @param {Object} dbHospital - Prisma Hospital model record
 * @param {number} index - 0-based rank index
 * @param {Object} options - Context options
 * @param {string} options.symptoms - Patient symptoms
 * @param {string} options.city - Patient city
 * @param {number} options.patientLat - Patient latitude
 * @param {number} options.patientLng - Patient longitude
 * @param {Function} options.distanceFn - Distance calculation function
 * @returns {Object} Canonical recommendation object
 */
function normalizeLocalHospital(dbHospital, index, options = {}) {
  const { symptoms = 'general health evaluation', city = 'India', distanceFn = null, patientLat = null, patientLng = null } = options;
  
  // Build a raw-like object from the DB Hospital record
  const rawLike = {
    hospital_name: dbHospital.hospitalName,
    rank: index + 1,
    overall_score: dbHospital.overallRating ? Math.round(dbHospital.overallRating * 20) : 88 - (index * 5),
    overall_rating: dbHospital.overallRating || null,
    review_count: dbHospital.reviewCount || null,
    estimated_cost_range: { min: 500, max: 2500, currency: 'INR' },
    latitude: dbHospital.latitude,
    longitude: dbHospital.longitude,
    explanation: `Specialized regional facility equipped for ${symptoms}. Offers 24/7 care and emergency capabilities.`,
    source: 'MedPath Local Registry',
    summary: `${dbHospital.hospitalName} provides comprehensive medical services with modern diagnostic capabilities.`,
    formatted_address: dbHospital.address || `${city}, India`,
    contact_number: dbHospital.phoneNumber || null,
    website: dbHospital.websiteUrl || null,
    google_maps_url: dbHospital.googleMapsUrl || null,
    hospital_type: dbHospital.ownershipType || null,
    has_emergency: dbHospital.emergencyAvailable ?? true,
    has_icu: dbHospital.icuAvailable ?? true,
    insurance_accepted: dbHospital.insuranceCashlessAvailable ?? null,
    accreditations: [
      dbHospital.accreditationNabh ? 'NABH' : null,
      dbHospital.accreditationNabl ? 'NABL' : null,
    ].filter(Boolean),
  };

  return normalizeHospital(rawLike, {
    patientLat,
    patientLng,
    defaultSource: 'MedPath Local Registry',
    distanceFn,
  });
}

/**
 * Converts a canonical recommendation object into a Prisma-ready
 * create/update data payload for RecommendationSnapshot.
 * 
 * This ensures that all paths (Swasthya, local fallback, cache reuse)
 * produce identical DB payloads.
 * 
 * @param {string} conversationId - Conversation UUID
 * @param {Object} canonical - Canonical recommendation object
 * @returns {Object} Prisma RecommendationSnapshot create data
 */
function toSnapshotCreateData(conversationId, canonical) {
  return {
    conversationId,
    hospitalName: canonical.hospitalName || 'Specialized Healthcare Facility',
    rankingPosition: canonical.rankingPosition || 1,
    confidenceScore: (typeof canonical.confidenceScore === 'number' && !isNaN(canonical.confidenceScore)) ? canonical.confidenceScore : 0.85,
    trustScore: (typeof canonical.trustScore === 'number' && !isNaN(canonical.trustScore)) ? canonical.trustScore : 0.0,
    estimatedCost: canonical.estimatedCost || 'Variable Cost',
    distance: canonical.distance || 'Nearby',
    latitude: canonical.latitude || null,
    longitude: canonical.longitude || null,
    reason: canonical.reason || 'Specialized clinical facility matched for your reported symptoms.',
    source: canonical.source || 'Swasthya AI Core',
    suitability: canonical.suitability || 'Good Option',
    summary: canonical.summary || null,
    pros: canonical.pros || null,
    cons: canonical.cons || null,
    overallScore: canonical.overallScore || canonical.confidenceScore || 0.85,
    travelTime: canonical.travelTime || null,
    website: canonical.website || null,
    phone: canonical.phone || null,
    address: canonical.address || null,
    hospitalType: canonical.hospitalType || null,
    accreditations: canonical.accreditations || null,
    reviewCount: canonical.reviewCount || null,
    hasEmergency: canonical.hasEmergency ?? true,
    hasIcu: canonical.hasIcu ?? true,
    estimatedCostRange: canonical.estimatedCostRange || null,
    specialties: canonical.specialties || null,
    departments: canonical.departments || null,
    facilities: canonical.facilities || null,
    services: canonical.services || null,
    doctors: canonical.doctors || null,
    languages: canonical.languages || null,
    emergencyContact: canonical.emergencyContact || null,
    email: canonical.email || null,
    googleMapsUrl: canonical.googleMapsUrl || null,
    landmark: canonical.landmark || null,
    bedCapacity: canonical.bedCapacity || null,
    operatingHours: canonical.operatingHours || null,
    insuranceAccepted: canonical.insuranceAccepted ?? null,
    parking: canonical.parking ?? null,
    rawMetadata: canonical.rawMetadata || null,
  };
}

/**
 * List of ALL canonical snapshot fields (excluding id, conversationId, createdAt).
 * Used by reuseCompletedDiscovery to ensure no field is accidentally omitted.
 * If a field is added to the schema, add it here.
 */
const SNAPSHOT_COPY_FIELDS = [
  'hospitalName', 'rankingPosition', 'confidenceScore', 'trustScore',
  'estimatedCost', 'distance', 'latitude', 'longitude', 'reason', 'source',
  'suitability', 'summary', 'pros', 'cons', 'overallScore', 'travelTime',
  'website', 'phone', 'address', 'hospitalType', 'accreditations',
  'reviewCount', 'hasEmergency', 'hasIcu', 'estimatedCostRange',
  'specialties', 'departments', 'facilities', 'services', 'doctors',
  'languages', 'emergencyContact', 'email', 'googleMapsUrl', 'landmark',
  'bedCapacity', 'operatingHours', 'insuranceAccepted', 'parking', 'rawMetadata',
];

/**
 * Creates a Prisma-ready clone payload from an existing snapshot record.
 * Used by reuseCompletedDiscovery to copy ALL fields without hand-maintaining a list.
 * 
 * @param {string} targetConversationId - The target conversation ID
 * @param {Object} existingSnapshot - Existing Prisma RecommendationSnapshot record
 * @returns {Object} Prisma create data for the cloned snapshot
 */
function cloneSnapshotData(targetConversationId, existingSnapshot) {
  const data = { conversationId: targetConversationId };
  for (const field of SNAPSHOT_COPY_FIELDS) {
    if (existingSnapshot[field] !== undefined) {
      data[field] = existingSnapshot[field];
    }
  }
  if (data.trustScore === null || data.trustScore === undefined || isNaN(data.trustScore)) {
    data.trustScore = 0.0;
  }
  if (!data.estimatedCost) {
    data.estimatedCost = 'Variable Cost';
  }
  return data;
}

module.exports = {
  normalizeHospital,
  normalizeLocalHospital,
  toSnapshotCreateData,
  cloneSnapshotData,
  SNAPSHOT_COPY_FIELDS,
  resolveField,
  formatCostRange,
};
