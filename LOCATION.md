# MedPath – Patient Location & Address Management

## Overview

MedPath uses patient location to find nearby healthcare facilities during AI consultations. Location is determined through two methods:

1. **Automatic GPS** – Browser Geolocation API with reverse geocoding
2. **Manual Address Entry** – Structured address form

The user always has both options. Location is never forced.

---

## Permission Flow

### GPS Location Request

```
User starts new consultation
        ↓
LocationPermissionModal appears
        ↓
User clicks "Use Current Location"
        ↓
Browser requests geolocation permission
        ↓
    ┌─────────────┐
    │  Granted?    │
    └──────┬──────┘
     Yes   │   No
      ↓    │    ↓
  Get coords  Show error + manual option
      ↓
  Reverse geocode via Nominatim API
      ↓
  Display formatted address
      ↓
  User confirms → Start consultation
```

### Error States

| State | Message | Action |
|-------|---------|--------|
| Permission Denied | "Location permission denied" | Offer manual entry |
| Position Unavailable | "Location information is unavailable" | Offer manual entry |
| Timeout | "Location request timed out" | Retry button + manual entry |
| API Unsupported | "Geolocation is not supported" | Show manual entry only |

### Key Principle

Location permission is requested **only** when the user explicitly clicks "Use Current Location". MedPath never requests GPS in the background or on page load.

---

## Saved Locations

Users can save multiple addresses for quick reuse.

### Data Model

```
SavedLocation
├── id (UUID)
├── userId (FK → User)
├── label (e.g., "Home", "Work", "Parents")
├── formattedAddress (full string)
├── latitude / longitude (optional, from GPS)
├── city, state, country, postalCode
├── isDefault (boolean)
├── createdAt / updatedAt
```

### Operations

| Operation | API Endpoint | Method |
|-----------|-------------|--------|
| List all | `/api/v1/locations` | GET |
| Create | `/api/v1/locations` | POST |
| Update | `/api/v1/locations/:id` | PATCH |
| Delete | `/api/v1/locations/:id` | DELETE |
| Reverse geocode | `/api/v1/location/current` | POST |

### Default Address

- Only one address can be default per user
- Setting a new default automatically unsets the previous one
- First saved address is automatically set as default

### Access Points

- **Profile Page** → Saved Locations section (full CRUD)
- **Location Modal** → Quick selection from saved addresses when starting consultation

---

## Conversation Integration

When a consultation starts, the selected location is attached to the conversation's `PatientContext`:

```
PatientContext
├── location (city or address string – used by AI triage)
├── latitude (GPS coordinate)
├── longitude (GPS coordinate)  
├── formattedAddress (full human-readable address)
├── city (extracted city name)
```

### Data Flow

```
User selects location (GPS/Manual/Saved)
        ↓
LocationContext stores selectedLocation
        ↓
User sends first message
        ↓
ConversationContext creates conversation
        ↓
PatientContext initialized with location fields
        ↓
Python microservice receives location in triage context
        ↓
AI uses location for hospital proximity search
```

### Python Microservice

The Python `PatientContext` schema includes passthrough fields:
- `latitude` (Optional[float])
- `longitude` (Optional[float])
- `formatted_address` (Optional[str])
- `city` (Optional[str])

**No AI logic was modified.** The Python service simply receives these fields as additional context.

---

## Privacy Considerations

### What We Do

- Request GPS permission only when user explicitly initiates it
- Store location data only in the user's saved locations and conversation context
- Use location solely for finding nearby healthcare facilities
- Display privacy notice in the location modal

### What We Don't Do

- **No continuous tracking** – GPS is a one-time request per consultation
- **No background location** – No service workers or background geolocation
- **No third-party sharing** – Location data stays within MedPath
- **No location history** – Only the per-conversation context and user-saved addresses are stored

### Data Retention

- Saved locations persist until user deletes them
- Conversation location data follows conversation lifecycle (soft-delete)
- No location analytics or aggregation

---

## Reverse Geocoding

MedPath uses the **OpenStreetMap Nominatim API** for reverse geocoding:

- **Endpoint**: `https://nominatim.openstreetmap.org/reverse`
- **No API key required**
- **Rate limit**: 1 request/second (enforced by Nominatim policy)
- **User-Agent**: `MedPath-Healthcare-App/1.0`

### Response Mapping

| Nominatim Field | MedPath Field |
|----------------|---------------|
| `display_name` | `formattedAddress` |
| `address.suburb` / `neighbourhood` | `locality` |
| `address.city` / `town` / `village` | `city` |
| `address.state` | `state` |
| `address.country` | `country` |
| `address.postcode` | `postalCode` |

### Fallback

If reverse geocoding fails, raw coordinates are returned as the formatted address: `"28.6139, 77.2090"`.

---

## Frontend Architecture

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `LocationPermissionModal` | `components/location/` | Pre-consultation location selection |
| `ManualAddressForm` | `components/location/` | Structured address entry form |
| `SavedAddressList` | `components/location/` | Reusable saved address cards |
| `LocationSettings` | `components/location/` | Profile page location management |

### Context

`LocationContext` provides:
- `savedLocations` – Array of saved addresses
- `selectedLocation` – Currently selected for consultation
- `gpsStatus` – GPS permission state machine
- CRUD actions for saved locations
- `requestGPSLocation()` – Browser Geolocation + reverse geocode
- `selectLocation()` / `clearSelectedLocation()`

### Integration Points

- **ChatPage** – Shows `LocationPermissionModal` for new consultations
- **ConversationContext** – Attaches `selectedLocation` to patient context
- **ProfilePage** – Renders `LocationSettings` for address management

---

## Validation

### Coordinates
- Latitude: `-90` to `90`
- Longitude: `-180` to `180`

### Postal Code
- 4–10 digit numeric string

### Required Fields (Manual Entry)
- Street
- Area / Locality
- City
- State
- Pincode
- Country

### Label (Saved Locations)
- Required, max 50 characters
