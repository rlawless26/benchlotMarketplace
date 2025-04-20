// src/Pages/AuthPage.js
import React from 'react';
import AuthForm from '../components/AuthForm';

/**
 * Auth Page Component
 * A dedicated page for authentication where users can sign in, sign up, or reset their password
 */
const AuthPage = () => {
  return (
    <div className="page-container py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-serif font-semibold mb-6 text-center">Account</h1>
        <div className="card p-6">
          <AuthForm />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;