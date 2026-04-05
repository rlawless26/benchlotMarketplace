import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Initialize Sentry error tracking
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.REACT_APP_ENVIRONMENT || 'production',
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
  });
}

// Initialize PostHog product analytics
if (process.env.REACT_APP_POSTHOG_KEY) {
  posthog.init(process.env.REACT_APP_POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: { recordCrossDomainIFrames: false },
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();