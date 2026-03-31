import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AuthForm from './AuthForm';
import { createMockAuthValue, createMockUser } from '../__mocks__/hookMocks';

// AuthForm imports useAuth from '../firebase'
const mockAuth = createMockAuthValue();

jest.mock('../firebase', () => ({
  useAuth: () => mockAuth,
}));

// Reset all mock return values before each test
beforeEach(() => {
  Object.assign(mockAuth, createMockAuthValue());
});

// Helper: fill and submit the sign-in form using fireEvent for reliability
const fillAndSubmitSignIn = (email, password) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  // Submit the form element directly (avoids ambiguity with multiple "Login" buttons)
  const form = screen.getByLabelText('Email').closest('form');
  fireEvent.submit(form);
};

describe('AuthForm', () => {
  describe('Sign In mode', () => {
    it('renders the sign-in form by default', () => {
      renderWithProviders(<AuthForm />);
      expect(screen.getByText('Log in to your Benchlot account')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('calls signIn with email and password', async () => {
      renderWithProviders(<AuthForm />);

      fillAndSubmitSignIn('user@test.com', 'password123');

      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalledWith('user@test.com', 'password123');
      });
    });

    it('displays error on failed sign-in', async () => {
      mockAuth.signIn.mockResolvedValue({ error: 'auth/invalid-credential' });

      renderWithProviders(<AuthForm />);

      fillAndSubmitSignIn('user@test.com', 'wrong');

      await waitFor(() => {
        expect(screen.getByText(/Invalid email or password/)).toBeInTheDocument();
      });
    });

    it('shows success message on successful sign-in', async () => {
      mockAuth.signIn.mockResolvedValue({ error: null });

      renderWithProviders(<AuthForm />);

      fillAndSubmitSignIn('user@test.com', 'password123');

      await waitFor(() => {
        expect(screen.getByText('Login successful!')).toBeInTheDocument();
      });
    });

    it('shows social login buttons', () => {
      renderWithProviders(<AuthForm />);
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('Continue with Facebook')).toBeInTheDocument();
    });
  });

  describe('Sign Up mode', () => {
    it('renders sign-up form when initialMode is signup', () => {
      renderWithProviders(<AuthForm initialMode="signup" />);
      expect(screen.getByText('Create a free Benchlot account')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      renderWithProviders(<AuthForm initialMode="signup" />);

      fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'different' } });

      const form = screen.getByLabelText('Email').closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('shows error for short password', async () => {
      renderWithProviders(<AuthForm initialMode="signup" />);

      fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } });

      const form = screen.getByLabelText('Email').closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Password mode', () => {
    it('renders reset form when initialMode is reset', () => {
      renderWithProviders(<AuthForm initialMode="reset" />);
      expect(screen.getByText('Reset your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('calls resetPassword with email', async () => {
      renderWithProviders(<AuthForm initialMode="reset" />);

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockAuth.resetPassword).toHaveBeenCalledWith('user@test.com');
      });
    });
  });

  describe('Mode switching', () => {
    it('switches from sign-in to sign-up', async () => {
      renderWithProviders(<AuthForm />);

      await userEvent.click(screen.getByText('Sign Up'));

      expect(screen.getByText('Create a free Benchlot account')).toBeInTheDocument();
    });

    it('switches to reset password from sign-in', async () => {
      renderWithProviders(<AuthForm />);

      await userEvent.click(screen.getByText('Forgot password?'));

      expect(screen.getByText('Reset your password')).toBeInTheDocument();
    });
  });

  describe('Logged-in state', () => {
    it('shows welcome message when user is logged in', () => {
      const user = createMockUser({ displayName: 'Test User', email: 'test@example.com' });
      Object.assign(mockAuth, createMockAuthValue({ user }));

      renderWithProviders(<AuthForm />);
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
