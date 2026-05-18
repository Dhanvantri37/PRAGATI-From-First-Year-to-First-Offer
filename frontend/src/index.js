import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Register service worker for PWA (offline support, install prompt, caching)
serviceWorkerRegistration.register({
  onUpdate: registration => {
    // Optionally notify the user a new version is available
    console.log('[SW] New app version available.');
    // The PWAInstallPrompt component handles the UI for this
  },
  onSuccess: registration => {
    console.log('[SW] PRAGATI is cached for offline use.');
  },
});
