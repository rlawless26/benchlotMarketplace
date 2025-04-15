// src/Pages/AuthPage.js
import React from 'react';
import AuthForm from '../components/AuthForm';

const AuthPage = () => {
  return (
    <div className="page-container py-8">
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