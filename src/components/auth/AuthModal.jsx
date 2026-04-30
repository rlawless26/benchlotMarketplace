/**
 * AuthModal — the minimal sign-in / sign-up surface for the aggregator.
 *
 * Design goals (explicit ask from Rob):
 *   - So frictionless the user barely notices signup happened
 *   - Firebase auth only — no new providers
 *
 * Primary CTA: Continue with Google (one click, popup OAuth). Secondary
 * path: email magic link — user types their email, we send a sign-in link,
 * one click in the email and they're in. No passwords, no names, no
 * "confirm password," no "agree to terms" checkbox (terms acceptance is
 * implicit in using the service per our rewritten Terms page).
 *
 * Same modal handles sign-in AND sign-up: Firebase resolves the distinction
 * under the hood (existing account → sign in; new email → creates one).
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Mail, ArrowRight } from 'lucide-react';

import { useAuth } from '../../firebase/hooks/useAuth';
import { useAuthModal } from '../../context/AuthModalContext';

// Google "G" mark, colored. Keeps bundle light — no icon import needed.
function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

const LABELS = {
  'save-alert': 'Save this alert',
  'alerts-page': 'Your alerts',
  default: 'Sign in',
};

const AuthModal = () => {
  const { isOpen, reason, close } = useAuthModal();
  const { user, signInWithGoogle, sendSignInLink } = useAuth();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'google' | 'error'
  const [errorMsg, setErrorMsg] = useState(null);

  // Close automatically once auth completes. Handles both the Google popup
  // return path AND the email-link completion that runs on next mount.
  useEffect(() => {
    if (isOpen && user) close();
  }, [user, isOpen, close]);

  // Reset local state every time the modal opens — previous session's
  // "link sent" confirmation shouldn't persist when the user opens it again.
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setStep('idle');
      setErrorMsg(null);
    }
  }, [isOpen]);

  // ESC-to-close + scroll lock.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  const handleGoogle = useCallback(async () => {
    setStep('google');
    setErrorMsg(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg(error);
      setStep('error');
    }
    // Success path closes via the user-effect above.
  }, [signInWithGoogle]);

  const handleEmailSubmit = useCallback(async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setStep('sending');
    setErrorMsg(null);
    const { success, error } = await sendSignInLink(value);
    if (success) {
      setStep('sent');
    } else {
      setErrorMsg(error || 'Could not send link. Please try again.');
      setStep('error');
    }
  }, [email, sendSignInLink]);

  if (!isOpen) return null;

  const title = LABELS[reason] || LABELS.default;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 1000,
        background: 'rgba(12, 28, 30, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bone)',
          border: '1px solid #e4e2dc',
          borderRadius: 12,
          boxShadow: '0 24px 48px rgba(12,28,30,0.22)',
          padding: '36px 32px 28px',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="cursor-pointer"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--fg-muted)',
            borderRadius: 6,
          }}
        >
          <X size={18} />
        </button>

        <h2
          style={{
            margin: '0 0 6px',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: '-0.6px',
            color: 'var(--spruce)',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: '0 0 28px',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--fg-muted)',
          }}
        >
          {step === 'sent'
            ? "We emailed you a link. Click it to sign in — no password needed."
            : 'One click. No password to remember.'}
        </p>

        {step !== 'sent' && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={step === 'google'}
              className="w-full inline-flex items-center justify-center cursor-pointer"
              style={{
                gap: 10,
                padding: '13px 20px',
                background: '#ffffff',
                border: '1px solid #d0cfc9',
                borderRadius: 8,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 15,
                color: '#0c1c1e',
                opacity: step === 'google' ? 0.7 : 1,
              }}
            >
              <GoogleMark size={18} />
              {step === 'google' ? 'Opening Google…' : 'Continue with Google'}
            </button>

            <div
              className="flex items-center"
              style={{ gap: 10, margin: '22px 0' }}
            >
              <span style={{ flex: 1, height: 1, background: '#e4e2dc' }} />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: 11,
                  color: 'var(--fg-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                }}
              >
                or
              </span>
              <span style={{ flex: 1, height: 1, background: '#e4e2dc' }} />
            </div>

            <form onSubmit={handleEmailSubmit}>
              <label
                htmlFor="auth-email"
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--spruce)',
                }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--fg-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@shop.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={step === 'sending'}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    background: '#f8f6f2',
                    border: '1px solid #d0cfc9',
                    borderRadius: 8,
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    fontSize: 15,
                    color: '#0c1c1e',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={step === 'sending' || !email.trim()}
                className="w-full inline-flex items-center justify-center cursor-pointer"
                style={{
                  gap: 6,
                  marginTop: 12,
                  padding: '13px 20px',
                  background: 'var(--honey)',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 15,
                  color: 'var(--dark-teal)',
                  opacity: step === 'sending' || !email.trim() ? 0.7 : 1,
                }}
              >
                {step === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
                {step !== 'sending' && <ArrowRight size={15} />}
              </button>
            </form>
          </>
        )}

        {step === 'sent' && (
          <div
            style={{
              padding: '20px 18px',
              background: 'rgba(42, 106, 74, 0.08)',
              border: '1px solid rgba(42, 106, 74, 0.3)',
              borderRadius: 8,
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--spruce)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Check your email
            </div>
            We sent a sign-in link to <strong>{email}</strong>. Click it to
            finish signing in.
            <button
              type="button"
              onClick={() => { setStep('idle'); setEmail(''); }}
              className="cursor-pointer"
              style={{
                display: 'block',
                marginTop: 14,
                padding: 0,
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                fontSize: 13,
                color: 'var(--honey)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Use a different email
            </button>
          </div>
        )}

        {errorMsg && step === 'error' && (
          <div
            role="alert"
            style={{
              marginTop: 14,
              padding: '10px 12px',
              background: 'rgba(168, 58, 42, 0.08)',
              border: '1px solid rgba(168, 58, 42, 0.3)',
              borderRadius: 8,
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: '#a83a2a',
            }}
          >
            {errorMsg}
          </div>
        )}

        <p
          style={{
            margin: '22px 0 0',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
            textAlign: 'center',
          }}
        >
          By continuing you agree to our{' '}
          <Link
            to="/terms"
            onClick={close}
            style={{ color: 'var(--fg-muted)', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            to="/privacy"
            onClick={close}
            style={{ color: 'var(--fg-muted)', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
