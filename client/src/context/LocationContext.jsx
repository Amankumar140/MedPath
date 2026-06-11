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
    setError(null);
  }, []);

  const clearSelectedLocation = useCallback(() => {
    setSelectedLocation(null);
  }, []);

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
          const { latitude, longitude } = position.coords;

          try {
            // 1. Try Nominatim directly from the client side for maximum resilience (independent of Node server status)
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              {
                headers: {
                  'Accept-Language': 'en',
                },
              }
            );
            if (geoRes.ok) {
              const data = await geoRes.json();
              const address = data.address || {};
              const loc = {
                formattedAddress: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                city: address.city || address.town || address.village || address.county || null,
                state: address.state || null,
                country: address.country || null,
                postalCode: address.postcode || null,
                latitude,
                longitude,
                label: "Current Location",
              };
              setSelectedLocation(loc);
              resolve(loc);
              return;
            }
          } catch (err) {
            console.warn("Direct geocoding failed, trying backend service...", err);
          }

          try {
            // 2. Fallback: call backend geocoding service
            const response = await locationService.resolveCurrentLocation(latitude, longitude);
            if (response && response.success) {
              const loc = {
                ...response.data,
                label: "Current Location",
              };
              setSelectedLocation(loc);
              resolve(loc);
            } else {
              throw new Error("Invalid backend response");
            }
          } catch (e) {
            console.error("Reverse geocoding failed on both client and backend:", e);
            const fallback = {
              latitude,
              longitude,
              formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              label: "Current Location",
            };
            setSelectedLocation(fallback);
            resolve(fallback);
          }
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
          timeout: 15000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    });
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  // Load saved locations when user is authenticated
  useEffect(() => {
    if (user) {
      loadSavedLocations();
    } else {
      setSavedLocations([]);
      setSelectedLocation(null);
      setGpsStatus("idle");
    }
  }, [user, loadSavedLocations]);

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
