/**
 * SiteHeader — slim chrome for post-pivot content pages (About, FAQ, Contact).
 *
 * Distinct from the marketplace/aggregator Header components. This is the
 * editorial header per the design handoff: wordmark left, About · FAQ ·
 * Sign-in right.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../firebase/hooks/useAuth';
import AuthModal from '../AuthModal';

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      style={{
        color: active ? 'var(--spruce)' : 'var(--fg-secondary)',
        fontWeight: active ? 600 : 500,
        fontSize: 13,
        letterSpacing: '0.02em',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--spruce)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--fg-secondary)';
      }}
    >
      {label}
    </Link>
  );
}

export default function SiteHeader({ current }) {
  const { isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header
        style={{
          padding: '22px 0',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--bone)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            to="/"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 24,
              color: 'var(--spruce)',
              letterSpacing: '-1.2px',
              textDecoration: 'none',
            }}
          >
            Benchlot
          </Link>
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              fontFamily: 'var(--font-body)',
            }}
          >
            <NavLink to="/faq" label="RAQ" active={current === 'raq'} />
            <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
            {isAuthenticated() ? (
              <NavLink to="/alerts" label="My alerts" active={current === 'alerts'} />
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--spruce)',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.02em',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="signin"
        title="Sign In to Your Account"
      />
    </>
  );
}
