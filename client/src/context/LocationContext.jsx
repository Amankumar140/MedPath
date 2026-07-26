import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import locationService from "../services/location.service";
import { useAuth } from "./AuthContext";

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const { user } = useAuth();
  const [savedLocations, setSavedLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | requesting | granted | denied | unavailable | timeout
  const [error, setError] = useState(null);

  const loadSavedLocations = useCallback(async () => {
    if (!user) return;
    setLoadingLocations(true);
    setError(null);
    try {
      const response = await locationService.listLocations();
      if (response && response.success) {
        setSavedLocations(response.data);
      }
    } catch (e) {
      console.error("Failed to load saved locations:", e);
      setError("Failed to load saved locations.");
    } finally {
      setLoadingLocations(false);
    }
  }, [user]);

  const addLocation = useCallback(async (data) => {
    setError(null);
    try {
      const response = await locationService.createLocation(data);
      if (response && response.success) {
        await loadSavedLocations();
        return response.data;
      }
    } catch (e) {
      console.error("Failed to save location:", e);
      setError("Failed to save location.");
      throw e;
    }
  }, [loadSavedLocations]);

  const updateSavedLocation = useCallback(async (id, data) => {
    setError(null);
    try {
      const response = await locationService.updateLocation(id, data);
      if (response && response.success) {
        await loadSavedLocations();
        return response.data;
      }
    } catch (e) {
      console.error("Failed to update location:", e);
      setError("Failed to update location.");
      throw e;
    }
  }, [loadSavedLocations]);

  const removeLocation = useCallback(async (id) => {
    setError(null);
    try {
      await locationService.deleteLocation(id);
      setSavedLocations(prev => prev.filter(loc => loc.id !== id));
      if (selectedLocation?.id === id) {
        setSelectedLocation(null);
      }
    } catch (e) {
      console.error("Failed to delete location:", e);
      setError("Failed to delete location.");
      throw e;
    }
  }, [selectedLocation]);

  const selectLocation = useCallback((location) => {
    setSelectedLocation(location);
    if (user && location) {
      localStorage.setItem(`medpath_location_${user.id}`, JSON.stringify(location));
    }
    setError(null);
  }, [user]);

  const clearSelectedLocation = useCallback(() => {
    setSelectedLocation(null);
    if (user) {
      localStorage.removeItem(`medpath_location_${user.id}`);
    }
  }, [user]);

  const requestGPSLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      setError("Geolocation is not supported by your browser.");
      return null;
    }

    setGpsStatus("requesting");
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setGpsStatus("granted");
          const { latitude, longitude, accuracy } = position.coords;
          const timestamp = position.timestamp;

          let loc = {
            latitude,
            longitude,
            accuracy,
            timestamp,
            label: "Current Location",
          };

          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              {
                headers: {
                  'Accept-Language': 'en',
                  'User-Agent': 'MedPath-Healthcare-App/1.0',
                },
              }
            );
            if (geoRes.ok) {
              const data = await geoRes.json();
              const address = data.address || {};
              loc = {
                ...loc,
                formattedAddress: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                city: address.city || address.town || address.village || address.county || null,
                state: address.state || null,
                country: address.country || null,
                postalCode: address.postcode || null,
              };
            }
          } catch (err) {
            console.warn("Direct geocoding failed, trying backend service...", err);
          }

          if (!loc.formattedAddress) {
            try {
              const response = await locationService.resolveCurrentLocation(latitude, longitude);
              if (response && response.success) {
                loc = {
                  ...loc,
                  ...response.data,
                };
              }
            } catch (e) {
              console.error("Reverse geocoding failed on backend:", e);
              loc.formattedAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            }
          }

          setSelectedLocation(loc);
          if (user) {
            localStorage.setItem(`medpath_location_${user.id}`, JSON.stringify(loc));
            // Save to user profile in backend as default
            try {
              await locationService.createLocation({
                label: loc.label || "Current Location",
                formattedAddress: loc.formattedAddress || `${loc.latitude}, ${loc.longitude}`,
                latitude: loc.latitude || null,
                longitude: loc.longitude || null,
                city: loc.city || null,
                state: loc.state || null,
                country: loc.country || null,
                postalCode: loc.postalCode || null,
                isDefault: true,
              });
              // Reload locations
              const savedRes = await locationService.listLocations();
              if (savedRes && savedRes.success) {
                setSavedLocations(savedRes.data);
              }
            } catch (e) {
              console.error("Failed to save automatic location in user profile:", e);
            }
          }
          resolve(loc);
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setGpsStatus("denied");
              setError("Location permission denied. You can enter your address manually.");
              break;
            case err.POSITION_UNAVAILABLE:
              setGpsStatus("unavailable");
              setError("Location information is unavailable. Please enter your address manually.");
              break;
            case err.TIMEOUT:
              setGpsStatus("timeout");
              setError("Location request timed out. Please try again or enter your address manually.");
              break;
            default:
              setGpsStatus("unavailable");
              setError("An unknown error occurred while getting your location.");
              break;
          }
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
        }
      );
    });
  }, [user]);

  const dismissError = useCallback(() => setError(null), []);

  // Automatic geolocate flow on login / app launch
  useEffect(() => {
    if (!user) {
      setSavedLocations([]);
      setSelectedLocation(null);
      setGpsStatus("idle");
      return;
    }

    const checkAndRequestLocation = async () => {
      setLoadingLocations(true);
      try {
        // 1. Fetch saved locations from backend
        const response = await locationService.listLocations();
        let defaultLoc = null;
        if (response && response.success && response.data) {
          setSavedLocations(response.data);
          defaultLoc = response.data.find(loc => loc.isDefault);
        }

        // 2. Check localStorage cache
        const cached = localStorage.getItem(`medpath_location_${user.id}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setSelectedLocation(parsed);
            setGpsStatus("granted");
            setLoadingLocations(false);
            return;
          } catch (e) {
            console.error("Error parsing cached location", e);
          }
        }

        // 3. Use default saved location if found
        if (defaultLoc) {
          setSelectedLocation(defaultLoc);
          setGpsStatus("granted");
          localStorage.setItem(`medpath_location_${user.id}`, JSON.stringify(defaultLoc));
          setLoadingLocations(false);
          return;
        }

        // 4. Auto request browser GPS permission if not already denied
        if (navigator.geolocation) {
          try {
            const perm = await navigator.permissions.query({ name: 'geolocation' });
            if (perm.state === 'denied') {
              setGpsStatus("denied");
              setLoadingLocations(false);
              return;
            }
          } catch (e) {
            // navigator.permissions unsupported, fall through
          }
          await requestGPSLocation();
        } else {
          setGpsStatus("unavailable");
        }
      } catch (err) {
        console.error("Error in checkAndRequestLocation:", err);
      } finally {
        setLoadingLocations(false);
      }
    };

    checkAndRequestLocation();
  }, [user, requestGPSLocation]);

  // Periodic location refresh every 30 minutes while app is active
  useEffect(() => {
    if (!user || gpsStatus !== "granted") return;

    const intervalId = setInterval(() => {
      console.log("Refreshing browser GPS location (30-minute interval)...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const timestamp = position.timestamp;

          let loc = {
            latitude,
            longitude,
            accuracy,
            timestamp,
            label: "Current Location",
          };

          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              {
                headers: {
                  'Accept-Language': 'en',
                  'User-Agent': 'MedPath-Healthcare-App/1.0',
                },
              }
            );
            if (geoRes.ok) {
              const data = await geoRes.json();
              const address = data.address || {};
              loc = {
                ...loc,
                formattedAddress: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                city: address.city || address.town || address.village || address.county || null,
                state: address.state || null,
                country: address.country || null,
                postalCode: address.postcode || null,
              };
            }
          } catch (err) {
            console.warn("Direct reverse geocode refresh failed", err);
            loc.formattedAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          }

          setSelectedLocation(loc);
          localStorage.setItem(`medpath_location_${user.id}`, JSON.stringify(loc));
        },
        (err) => {
          console.warn("GPS interval refresh failed:", err.message);
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }, 1800000); // 30 minutes

    return () => clearInterval(intervalId);
  }, [user, gpsStatus]);

  return (
    <LocationContext.Provider value={{
      savedLocations,
      selectedLocation,
      loadingLocations,
      gpsStatus,
      error,
      loadSavedLocations,
      addLocation,
      updateSavedLocation,
      removeLocation,
      selectLocation,
      clearSelectedLocation,
      requestGPSLocation,
      dismissError,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function usePatientLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("usePatientLocation must be used within a LocationProvider");
  }
  return context;
}
