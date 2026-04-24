/**
 * Auth modal context.
 *
 * Single provider mounted near the root of App.js. Any component can call
 * `useAuthModal().open()` to pop the modal open from anywhere — header sign-
 * in links, save-alert prompts, ToolScan CTAs, etc. — without navigating
 * away from the page.
 *
 * Kept tiny on purpose: just `{ isOpen, open, close }` plus an optional
 * `reason` string for analytics ("save-alert", "alerts-page", etc.) that
 * downstream components can read if they want to tailor copy.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { onAuthModalRequested } from '../utils/featureFlags';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(null);

  const open = useCallback((opts = {}) => {
    setReason(opts.reason || null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setReason(null);
  }, []);

  // Bridge the legacy utils/featureFlags openAuthModal(...) event helper to
  // the new context API. Existing callers (e.g. SaveAlertButton) dispatch
  // through the event helper; this listener translates those events into
  // open() calls so we don't need to touch every caller.
  useEffect(() => {
    const unsubscribe = onAuthModalRequested((payload) => {
      open({ reason: payload?.redirectPath ? 'redirect' : null });
    });
    return unsubscribe;
  }, [open]);

  return (
    <AuthModalContext.Provider value={{ isOpen, reason, open, close }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return ctx;
}
