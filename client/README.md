# MedPath Frontend Client

MedPath is an AI-powered hospital recommendation and medical navigation platform. This folder contains the React + Vite frontend application, built with Tailwind CSS v4 and matching the Google Stitch designs.

## Features

- **Triage AI Assistant**: Interactive consultation with Server-Sent Events (SSE) streaming, progressive updates, auto-scrolling, and inline response follow-up selections.
- **Firebase Authentication**: Pre-configured integration for Email/Password registration, Login, and Google Popup authorization.
- **Unified API Services**: Axios-based API managers mapping backend routers with dynamic bearer token interception.
- **Theme Toggling**: System-preferred dark/light settings with local persistence.
- **Fallback Evaluation Mode**: Automatically activates if Firebase or backend server connectivity is absent, loading rich, fully interactive mock consultation runs and hospital recommendations.

---

## Directory Layout

```
client/
├── src/
│   ├── assets/       # Media files and assets
│   ├── components/   # Shared presentation elements
│   ├── config/       # Local setup files
│   ├── context/      # Theme, Auth, and Conversation State Providers
│   ├── firebase/     # Firebase configuration
│   ├── layouts/      # Sidebar and top nav components
│   ├── pages/        # Views (Splash, Login, Chat, Recs, details)
│   ├── routes/       # Private and Public Route guards
│   ├── services/     # Central API connectors (Axios & SSE)
│   ├── styles/       # Root stylesheets
│   ├── utils/        # Generic helper functions
│   ├── App.jsx       # Root contexts orchestrator
│   └── main.jsx      # React mounting entrypoint
├── index.html        # Main HTML header referencing Google Fonts
├── postcss.config.js # CSS plugins manager
├── tailwind.config.js# Styling theme parameters
└── vite.config.js    # Bundler config
```

---

## Getting Started

### 1. Requirements
Ensure you have Node.js (version 18 or above) installed on your system.

### 2. Installation
Run the following command in the `client/` directory to install package dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `client/` directory and configure the variables (or leave empty to run in Fallback Developer Mode):
```env
# Backend Base API URL
VITE_API_URL=http://localhost:5000/api/v1

# Firebase credentials (Web SDK)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Running the Dev Server
To start the hot-reloading development server:
```bash
npm run dev
```

### 5. Compiling for Production
To bundle assets for deployment:
```bash
npm run build
```
The compiled output will be generated inside the `dist/` directory.
