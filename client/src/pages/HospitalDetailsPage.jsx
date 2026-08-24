import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Button, Badge, ProgressBar, EmptyState } from "../components/ui";
import { formatEstimatedCost } from "../components/chat/TypingBubble";
import { usePatientLocation } from "../context/LocationContext";
import { getDirectionsUrl, formatTelUrl, parsePhoneNumbers } from "../utils/location.helpers";

export function HospitalDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedLocation } = usePatientLocation();

  // Scroll to top when page opens
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const hospital = location.state?.hospital;

  // If no hospital data provided, show redirect message
  if (!hospital) {
    return (
      <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full" role="main">
        <EmptyState
          icon="info"
          title="Hospital Not Found"
          description="No hospital details available. Please select a hospital from the recommendations page."
          action={{
            label: "Back to Recommendations",
            icon: "arrow_back",
            onClick: () => navigate("/hospitals")
          }}
        />
      </div>
    );
  }

  const ratingVal = hospital.trustScore || hospital.overallRating || 4.5;
  const rawPhone = hospital.phone || hospital.contact_number;
  const phoneNumbers = parsePhoneNumbers(rawPhone);
  const emergencyPhone = hospital.emergencyContact || hospital.emergency_contact;
  const addressVal = hospital.address || hospital.formatted_address;
  const landmarkVal = hospital.landmark;
  const emailVal = hospital.email;
  const websiteVal = hospital.website || hospital.websiteUrl;
  const googleMapsUrl = hospital.googleMapsUrl || hospital.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.hospitalName || "Hospital")}`;
  const lat = hospital.latitude ?? hospital.lat;
  const lng = hospital.longitude ?? hospital.lng;
  const rawDist = hospital.distance || hospital.distance_km;
  const validDistance = (rawDist && rawDist !== 'Unknown' && rawDist !== 'Nearby' && !rawDist.includes('Nearby')) ? rawDist : null;

  const specialtiesList = Array.isArray(hospital.specialties) ? hospital.specialties : (typeof hospital.specialties === 'string' ? hospital.specialties.split(',') : []);
  const departmentsList = Array.isArray(hospital.departments) ? hospital.departments : (typeof hospital.departments === 'string' ? hospital.departments.split(',') : []);
  const facilitiesList = Array.isArray(hospital.facilities) ? hospital.facilities : (typeof hospital.facilities === 'string' ? hospital.facilities.split(',') : []);
  const servicesList = Array.isArray(hospital.services) ? hospital.services : (typeof hospital.services === 'string' ? hospital.services.split(',') : []);
  const languagesList = Array.isArray(hospital.languages) ? hospital.languages : (typeof hospital.languages === 'string' ? hospital.languages.split(',') : []);
  const doctorsList = Array.isArray(hospital.doctors) ? hospital.doctors : [];
  const accreditationsList = Array.isArray(hospital.accreditations) ? hospital.accreditations : (typeof hospital.accreditations === 'string' ? hospital.accreditations.split(',') : []);

  return (
    <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full animate-fade-in" role="main" aria-label={`Hospital details: ${hospital.hospitalName}`}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-label-md text-secondary hover:text-primary transition-colors mb-6 cursor-pointer font-semibold"
        aria-label="Go back to recommendations"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        Back to Recommendations
      </button>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Hospital Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Header & Overview Card */}
          <Card variant="glass" className="p-6 md:p-8 border border-outline-variant/15 space-y-6">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-headline-lg font-bold text-primary dark:text-primary-fixed leading-snug">
                  {hospital.hospitalName}
                </h2>
                {hospital.hospitalType && (
                  <Badge variant="neutral" className="capitalize">
                    {hospital.hospitalType}
                  </Badge>
                )}
                {hospital.source && (
                  <span className="bg-tertiary-container/30 text-on-tertiary-container dark:text-tertiary px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-tertiary/10">
                    {hospital.source}
                  </span>
                )}
              </div>

              {accreditationsList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {accreditationsList.map((acc, i) => (
                    <span key={i} className="bg-secondary-container/30 text-secondary border border-secondary/20 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      🏅 {acc}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {hospital.summary && (
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 italic text-on-surface-variant font-medium text-body-md">
                " {hospital.summary} "
              </div>
            )}

            {hospital.reason && (
              <p className="text-body-lg text-on-surface leading-relaxed font-medium">
                {hospital.reason}
              </p>
            )}

            {/* Capabilities & Status Badges */}
            <div className="pt-5 border-t border-outline-variant/15 space-y-3">
              <h4 className="text-label-sm font-bold text-primary dark:text-primary-fixed uppercase tracking-wider">
                Capabilities & Facilities
              </h4>
              <div className="flex flex-wrap gap-2.5">
                <span className={`px-3 py-1.5 rounded-xl text-label-sm font-semibold border flex items-center gap-1.5 shadow-sm ${
                  hospital.hasEmergency !== false
                    ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                    : "bg-outline-variant/10 text-outline border-outline-variant/15"
                }`}>
                  <span className="material-symbols-outlined text-[16px]">{hospital.hasEmergency !== false ? "check_circle" : "cancel"}</span>
                  24/7 Emergency Care
                </span>
                <span className={`px-3 py-1.5 rounded-xl text-label-sm font-semibold border flex items-center gap-1.5 shadow-sm ${
                  hospital.hasIcu !== false
                    ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                    : "bg-outline-variant/10 text-outline border-outline-variant/15"
                }`}>
                  <span className="material-symbols-outlined text-[16px]">{hospital.hasIcu !== false ? "check_circle" : "cancel"}</span>
                  ICU Facilities
                </span>
                <span className="bg-tertiary/10 text-tertiary border-tertiary/20 px-3 py-1.5 rounded-xl text-label-sm font-semibold border flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  Cashless Insurance Accepted
                </span>
                {hospital.bedCapacity && (
                  <span className="bg-secondary/10 text-secondary border border-secondary/20 px-3 py-1.5 rounded-xl text-label-sm font-semibold flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">hotel</span>
                    {hospital.bedCapacity} Beds
                  </span>
                )}
                {hospital.operatingHours && (
                  <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-xl text-label-sm font-semibold flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {hospital.operatingHours}
                  </span>
                )}
                {hospital.parking && (
                  <span className="bg-surface-container-low text-on-surface border border-outline-variant/20 px-3 py-1.5 rounded-xl text-label-sm font-semibold flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">local_parking</span>
                    Parking Available
                  </span>
                )}
              </div>
            </div>

            {/* Specialties & Clinical Departments */}
            {(specialtiesList.length > 0 || departmentsList.length > 0) && (
              <div className="pt-5 border-t border-outline-variant/15 space-y-3">
                <h4 className="text-label-sm font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                  Specialties & Clinical Departments
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[...new Set([...specialtiesList, ...departmentsList])].map((item, i) => (
                    <span key={i} className="bg-surface-container-low text-on-surface px-3 py-1.5 rounded-xl text-xs font-semibold border border-outline-variant/20 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnostic Facilities & Services */}
            {(facilitiesList.length > 0 || servicesList.length > 0) && (
              <div className="pt-5 border-t border-outline-variant/15 space-y-3">
                <h4 className="text-label-sm font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">medical_services</span>
                  Diagnostic Facilities & Medical Services
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[...new Set([...facilitiesList, ...servicesList])].map((srv, i) => (
                    <span key={i} className="bg-tertiary/5 text-on-surface px-3 py-1.5 rounded-xl text-xs font-semibold border border-tertiary/15">
                      ✓ {srv}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages & Doctors */}
            {(languagesList.length > 0 || doctorsList.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-outline-variant/15">
                {languagesList.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-label-sm font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">translate</span>
                      Spoken Languages
                    </h4>
                    <p className="text-body-md font-semibold text-on-surface">
                      {languagesList.join(", ")}
                    </p>
                  </div>
                )}
                {doctorsList.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-label-sm font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">groups</span>
                      Attending Doctors & Specialists
                    </h4>
                    <ul className="list-disc pl-5 text-body-md text-on-surface font-semibold space-y-1">
                      {doctorsList.map((doc, i) => (
                        <li key={i}>{typeof doc === 'object' ? `${doc.name} (${doc.specialty})` : doc}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Pros & Cons */}
            {((hospital.pros && hospital.pros.length > 0) || (hospital.cons && hospital.cons.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-outline-variant/15">
                {hospital.pros && hospital.pros.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-label-sm font-bold text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">thumb_up</span>
                      Key Highlights & Pros
                    </h4>
                    <ul className="list-disc pl-5 text-body-md text-on-surface-variant space-y-1 font-medium">
                      {hospital.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                    </ul>
                  </div>
                )}
                {hospital.cons && hospital.cons.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-label-sm font-bold text-error uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-error">thumb_down</span>
                      Considerations
                    </h4>
                    <ul className="list-disc pl-5 text-body-md text-on-surface-variant space-y-1 font-medium">
                      {hospital.cons.map((con, i) => <li key={i}>{con}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* COMPLETE CONTACT & LOCATION SECTION */}
            <div className="space-y-4 pt-6 border-t border-outline-variant/20 bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/15">
              <h4 className="text-label-md font-bold text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">contact_phone</span>
                Contact & Location Details
              </h4>

              <div className="space-y-3.5 text-body-md text-on-surface font-semibold">
                {/* Complete Address & Landmark */}
                {addressVal && (
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5" aria-hidden="true">location_on</span>
                    <div>
                      <p className="leading-relaxed font-bold text-primary dark:text-primary-fixed">{addressVal}</p>
                      {landmarkVal && (
                        <p className="text-xs text-outline font-medium mt-0.5">
                          📍 Landmark: <span className="font-semibold text-on-surface-variant">{landmarkVal}</span>
                        </p>
                      )}
                      {(lat && lng) && (
                        <p className="text-[11px] text-outline font-medium mt-0.5">
                          Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* All Phone Numbers */}
                {phoneNumbers.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5" aria-hidden="true">call</span>
                    <div>
                      <p className="text-xs text-outline font-bold uppercase tracking-wider mb-1">Phone Numbers</p>
                      <div className="flex flex-wrap gap-3">
                        {phoneNumbers.map((phoneNum, idx) => (
                          <a
                            key={idx}
                            href={formatTelUrl(phoneNum)}
                            className="inline-flex items-center gap-1 text-secondary hover:text-primary hover:underline bg-surface px-3 py-1 rounded-lg border border-outline-variant/20 shadow-sm"
                            title={`Call ${phoneNum}`}
                          >
                            📞 {phoneNum}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact Hotline */}
                {emergencyPhone && (
                  <div className="flex items-center gap-3 bg-error-container/20 p-3 rounded-xl border border-error/20 text-on-error-container">
                    <span className="material-symbols-outlined text-error text-[22px] shrink-0" aria-hidden="true">medical_services</span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block text-error">24/7 Emergency Hotline</span>
                      <a
                        href={formatTelUrl(emergencyPhone)}
                        className="text-error font-extrabold hover:underline text-body-md"
                      >
                        🚨 {emergencyPhone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Website */}
                {websiteVal && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px] shrink-0" aria-hidden="true">language</span>
                    <div>
                      <span className="text-xs text-outline font-bold uppercase tracking-wider block">Official Website</span>
                      <a href={websiteVal} target="_blank" rel="noreferrer" className="text-secondary hover:text-primary hover:underline font-bold truncate block max-w-md">
                        🌐 {websiteVal}
                      </a>
                    </div>
                  </div>
                )}

                {/* Email */}
                {emailVal && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px] shrink-0" aria-hidden="true">mail</span>
                    <div>
                      <span className="text-xs text-outline font-bold uppercase tracking-wider block">Email Contact</span>
                      <a href={`mailto:${emailVal}`} className="text-secondary hover:text-primary hover:underline font-bold">
                        📧 {emailVal}
                      </a>
                    </div>
                  </div>
                )}

                {/* Google Maps & Navigation Links */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-surface hover:bg-surface-container text-primary font-bold px-4 py-2.5 rounded-xl border border-outline-variant/30 shadow-sm text-xs transition-all hover-lift"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">explore</span>
                    Open in Google Maps
                  </a>

                  <a
                    href={getDirectionsUrl(hospital, selectedLocation)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 premium-gradient-primary text-on-primary font-bold px-4 py-2.5 rounded-xl shadow-md text-xs transition-all hover-lift"
                  >
                    <span className="material-symbols-outlined text-[18px]">directions</span>
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          </Card>

          {/* Intelligence Score metrics */}
          <Card variant="glass" className="p-6 md:p-8 border border-outline-variant/15 space-y-5">
            <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed">Intelligence & Match Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between shadow-sm">
                <span className="text-outline text-label-sm font-bold uppercase tracking-wider">Trust Rating</span>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-headline-md font-bold text-primary dark:text-primary-fixed">{ratingVal}</span>
                  <span className="text-label-sm text-outline font-bold">/ 5.0</span>
                </div>
                <ProgressBar value={ratingVal} max={5} variant="secondary" className="mt-4" />
              </div>

              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between shadow-sm">
                <span className="text-outline text-label-sm font-bold uppercase tracking-wider">Match Confidence</span>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-headline-md font-bold text-primary dark:text-primary-fixed">
                    {Math.round((hospital.confidenceScore > 1 ? hospital.confidenceScore / 100 : hospital.confidenceScore) * 100)}%
                  </span>
                </div>
                <ProgressBar value={hospital.confidenceScore > 1 ? hospital.confidenceScore : hospital.confidenceScore * 100} max={100} variant="secondary" className="mt-4" />
              </div>

              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between shadow-sm">
                <span className="text-outline text-label-sm font-bold uppercase tracking-wider">Ranking Position</span>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-headline-md font-bold text-primary dark:text-primary-fixed">#{hospital.rankingPosition || 1}</span>
                  <span className="text-label-sm text-outline font-bold">of results</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Map & Location Pin */}
        <div className="space-y-6">
          <Card variant="glass" className="p-6 border border-outline-variant/15 flex flex-col h-full justify-between gap-5 shadow-md">
            <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed">Department Locator</h3>

            {/* Map Graphic */}
            <div className="w-full h-64 bg-surface-container-high rounded-2xl overflow-hidden border border-outline-variant/20 relative flex items-center justify-center shadow-inner">
              <div className="absolute inset-0 bg-cover bg-center opacity-85" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400')" }}></div>
              <div className="absolute inset-0 bg-secondary/5 mix-blend-color"></div>

              <div className="relative z-10 flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-error drop-shadow-md animate-bounce" aria-hidden="true">location_on</span>
                <div className="bg-surface/95 dark:bg-surface-container/95 backdrop-blur-sm border border-outline-variant/35 rounded-xl p-3 shadow-md text-center max-w-[210px] mt-1.5">
                  <p className="text-label-sm font-bold text-primary dark:text-primary-fixed truncate">{hospital.hospitalName || hospital.hospital_name || hospital.name}</p>
                  {validDistance && <p className="text-[10px] text-outline font-bold mt-0.5">{validDistance} away</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3 font-semibold">
              {validDistance && (
                <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                  <span className="text-outline">Travel Distance</span>
                  <span className="font-bold text-primary dark:text-primary-fixed">{validDistance}</span>
                </div>
              )}
              {hospital.travelTime && (
                <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                  <span className="text-outline">Travel Time</span>
                  <span className="font-bold text-primary dark:text-primary-fixed">{hospital.travelTime}</span>
                </div>
              )}
              <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                <span className="text-outline">Estimated Out-of-Pocket</span>
                <span className="font-bold text-primary dark:text-primary-fixed">{formatEstimatedCost(hospital.estimatedCost || hospital.estimated_cost_range)}</span>
              </div>
              {ratingVal && (
                <div className="flex justify-between text-body-md border-b border-outline-variant/10 pb-2">
                  <span className="text-outline">Overall Rating</span>
                  <span className="font-bold text-primary dark:text-primary-fixed">{ratingVal} ★ ({hospital.reviewCount || 0} reviews)</span>
                </div>
              )}
              <div className="flex justify-between text-body-md pb-1">
                <span className="text-outline">Suitability</span>
                <span className="font-bold text-primary dark:text-primary-fixed">{hospital.source || "High Match"}</span>
              </div>
            </div>

            <Button
              onClick={() => navigate('/reviews/wizard', {
                state: {
                  conversationId: hospital.conversationId,
                  recommendationSnapshotId: hospital.id,
                  hospitalName: hospital.hospitalName,
                  estimatedCost: hospital.estimatedCost
                }
              })}
              variant="secondary"
              icon="rate_review"
              ariaLabel={`Write a review for ${hospital.hospitalName}`}
              className="w-full touch-target"
            >
              Write a Review
            </Button>

            <a
              href={getDirectionsUrl(hospital, selectedLocation)}
              target="_blank"
              rel="noreferrer"
              className="w-full premium-gradient-primary text-on-primary hover:opacity-95 transition-all py-3.5 rounded-xl font-bold text-label-md flex items-center justify-center gap-2 shadow-md text-center cursor-pointer hover-lift"
              aria-label={`Get directions to ${hospital.hospitalName} on Google Maps`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">directions</span>
              Get Directions
            </a>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default HospitalDetailsPage;
