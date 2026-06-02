import React from 'react';
import ReactGA from "react-ga4";
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

ReactGA.initialize("G-XPXF8K7W5D");

ReactGA.send({
  hitType: "pageview",
  page: window.location.pathname,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

serviceWorkerRegistration.register({
  onUpdate: registration => {
    console.log('[SW] New app version available.');
  },
  onSuccess: registration => {
    console.log('[SW] PRAGATI is cached for offline use.');
  },
});
