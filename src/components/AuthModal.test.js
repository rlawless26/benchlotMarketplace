import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AuthModal from './AuthModal';
import { createMockAuthValue, createMockUser } from '../__mocks__/hookMocks';

// AuthModal imports useAuth from '../firebase' and uses AuthForm
const mockAuth = createMockAuthValue();

jest.mock('../firebase', () => ({
  useAuth: () => mockAuth,
}));

// Mock AuthForm to simplify modal testing
jest.mock('./AuthForm', () => {
  return function MockAuthForm({ initialMode }) {
    return <div data-testid="auth-form">AuthForm mode: {initialMode}</div>;
  };
});

beforeEach(() => {
  Object.assign(mockAuth, createMockAuthValue());
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  document.body.style.overflow = '';
});

describe('AuthModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    initialMode: 'signin',
  };

  it('renders nothing when isOpen is false', () => {
    renderWithProviders(<AuthModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('auth-form')).not.toBeInTheDocument();
  });

  it('renders AuthForm when isOpen is true', () => {
    renderWithProviders(<AuthModal {...defaultProps} />);
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    expect(screen.getByText('AuthForm mode: signin')).toBeInTheDocument();
  });

  it('passes initialMode to AuthForm', () => {
    renderWithProviders(<AuthModal {...defaultProps} initialMode="signup" />);
    expect(screen.getByText('AuthForm mode: signup')).toBeInTheDocument();
  });

  it('renders close button', () => {
    renderWithProviders(<AuthModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked (after animation delay)', async () => {
    const onClose = jest.fn();
    jest.useRealTimers(); // userEvent v13 doesn't support fake timers well
    renderWithProviders(<AuthModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    // handleClose sets a 300ms timeout before calling onClose
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('closes on ESC key', () => {
    const onClose = jest.fn();
    renderWithProviders(<AuthModal {...defaultProps} onClose={onClose} />);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    jest.advanceTimersByTime(300);
    expect(onClose).toHaveBeenCalled();
  });
});
