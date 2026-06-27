# MedPath Frontend Architecture & Documentation

Welcome to the MedPath frontend application. This codebase is built with modern, performant React + Vite patterns, integrating Firebase authentication, real-time Server-Sent Events (SSE), and a fluid, responsive UI styled with Tailwind CSS v4.

---

## Technical Stack & Libraries

- **Core Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4 + PostCSS
- **State Management**: React Context API
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios (with interceptors)
- **Authentication**: Firebase Client SDK v12
- **Validation**: Zod (for type-safety verification)
- **Linter**: Oxlint (fast code check)

---

## Folder Structure

```text
client/
├── public/                 # Static asset folders
├── src/
│   ├── assets/             # Brand logos and style assets
│   ├── components/         # Reusable presentation components
│   │   ├── ErrorBoundary.jsx  # Recovery UI for React render crashes
│   │   ├── SkeletonLoader.jsx # Pulse/shimmer loading states
│   │   └── Toast.jsx          # Alert notifications dispatcher
│   ├── context/            # Shared React contexts
│   │   ├── AuthContext.jsx         # Firebase sessions & DB sync
│   │   ├── ConversationContext.jsx # Consultation records & SSE stream
│   │   └── ThemeContext.jsx        # Visual dark/light mode toggle
│   ├── layouts/            # Layout wrappers
│   │   └── MainLayout.jsx          # Mobile bottom nav & desktop sidebar
│   ├── pages/              # Routed pages
│   │   ├── ChatPage.jsx            # Interactive AI triage workspace
│   │   ├── DashboardPage.jsx       # Home dashboard and past history
│   │   ├── HospitalDetailsPage.jsx # Comprehensive clinical department view
│   │   ├── LoginPage.jsx           # Sign in screen
│   │   ├── NotFoundPage.jsx        # 404 error page
│   │   ├── ProfilePage.jsx         # Settings (Language, Theme, Display Name)
│   │   ├── RecommendationsPage.jsx  # Specialized hospital recommendation list
│   │   ├── SignupPage.jsx          # Sign up screen
│   │   └── SplashPage.jsx          # Animated landing loading gate
│   ├── routes/             # Guarded router configuration
│   │   └── AppRoutes.jsx           # Protected and public routes with code splitting
│   ├── services/           # Backend API integration layer
│   │   ├── auth.service.js         # Firebase-to-Backend session synchronization
│   │   ├── axios.js                # Customized request/response interceptors
│   │   ├── conversation.service.js # Triage CRUD & SSE chunk reader
│   │   ├── system.service.js       # Health checking utility
│   │   └── user.service.js         # Account updates
│   ├── index.css           # Global custom theme styles
│   ├── main.jsx            # React root mounting point
│   └── tailwind.config.js  # Color schemes, fonts, spacing tokens
├── .env.example            # Environment variables template
├── package.json            # Scripts and packages manifest
└── vite.config.js          # Vite build config
```

---

## Key Workflows

### 1. Authentication Lifecycle
- **Automatic Session Checks**: `AuthContext.jsx` runs `onIdTokenChanged` on mount to check for active Firebase credentials.
- **Backend Handshake**: Upon verification, the Firebase ID token is retrieved and posted to the backend endpoint `/auth/login`. If verified by the backend, the user's DB profile is saved in state.
- **API Token Insertion**: The Axios request interceptor (`axios.js`) automatically appends the Firebase token in the `Authorization: Bearer <TOKEN>` header.
- **Proactive Token Refresh**: Firebase automatically rotates ID tokens periodically, and a background interval refreshes it in localStorage every 10 minutes to guarantee validation stays active.
- **Session Expiration Event**: If any API call returns `401` or `403` status, the response interceptor drops the token and dispatches the `medpath:auth-expired` custom event. `AuthContext` catches this event, signs the user out of Firebase, and triggers a redirection.

### 2. Conversation Triage & SSE Streaming
- **Initiating Consultation**: A user types a quick symptom on the dashboard or chat. The app starts a consultation on the backend and updates the URL route to `/chat/:id`.
- **SSE Stream Reader**: In `conversationService.sendMessageStream`, we invoke a browser `fetch` requesting the SSE stream:
  - We read raw message bytes from the `ReadableStream` reader.
  - Chunks are matched for event markers (`event: status`, `event: message`, `event: end`, `event: error`).
  - Text updates are pushed in real-time to the UI thread using the stream state callback.
- **Completion Sync**: Once the stream ends, the app reloads the conversation details (including parsed symptoms, context completion flags, and hospital recommendation snapshots).

### 3. Recommendation Matcher
- Hospital Department lists are generated using the AI engine results.
- **Filters**: Users can refine department match results dynamically using maximum distance ranges, specialization filters, and estimated cost tiers.
- **Hospital Scorecard**: Selecting a hospital from the list navigates to `HospitalDetailsPage` presenting:
  - Confidence matching percentages.
  - Quality metrics, trust scores, and Billing transparency ratings.
  - Department directions linked directly with Google Maps APIs.

---

## Performance Optimizations

1. **Vite Code Splitting**: All pages in `AppRoutes.jsx` are loaded asynchronously via `React.lazy()`:
   ```javascript
   const ChatPage = lazy(() => import("../pages/ChatPage"));
   ```
   This ensures that the initial bundle loaded by the browser is minimized, improving page load speeds.
2. **Suspense Loaders**: While chunks are resolving, the application renders a modern shimmering medical loading skeleton component.
3. **Component Memoization**: The chat log screen uses memoized rendering (`React.memo`) for the message bubbles. This prevents unnecessary reflows and layout recalculations when receiving streamed SSE updates.

---

## Accessibility Compliance (A11y)

- **Semantic Layout**: Appropriate roles and landmarks (`role="main"`, `role="navigation"`, `role="banner"`) define the main layouts.
- **ARIA Labels**: Descriptive labels (`aria-label`, `aria-pressed`, `aria-current`) exist on icon-only control bars, send keys, theme toggles, and audio buttons.
- **Live Notifications**: Toast notifications and stream progress status areas use `aria-live="polite"` to announce activities dynamically.
- **Keyboard Navigation**: Standard focus elements, outline indicators, and form controllers are fully navigable via `Tab` and `Enter` inputs.

---

## Configuration Variables

Copy the `.env.example` file to `.env` and fill in the details:
```env
# Backend API URL
VITE_API_URL=http://localhost:3000/api/v1

# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=swasthya-79a08.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=swasthya-79a08
VITE_FIREBASE_STORAGE_BUCKET=swasthya-79a08.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=G-...
```
