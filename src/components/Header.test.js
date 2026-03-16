import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import Header from './Header';
import {
  createMockAuthValue,
  createAuthenticatedAuthValue,
  createMockSellerUser,
  createMockWishlistValue,
  createMockNotificationsValue,
  createMockMessagesValue,
} from '../__mocks__/hookMocks';

// Header imports hooks from individual files
const mockAuth = createMockAuthValue();
const mockWishlist = createMockWishlistValue();
const mockNotifications = createMockNotificationsValue();
const mockMessages = createMockMessagesValue();

jest.mock('../firebase/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));
jest.mock('../firebase/hooks/useWishlist', () => ({
  useWishlist: () => mockWishlist,
}));
jest.mock('../firebase/hooks/useNotifications', () => ({
  __esModule: true,
  default: () => mockNotifications,
}));
jest.mock('../firebase/hooks/useMessages', () => ({
  useMessages: () => mockMessages,
}));

// Mock CartIcon and AuthModal to simplify
jest.mock('./CartIcon', () => {
  return function MockCartIcon() {
    return <div data-testid="cart-icon">Cart</div>;
  };
});
jest.mock('./AuthModal', () => {
  return function MockAuthModal({ isOpen, initialMode }) {
    if (!isOpen) return null;
    return <div data-testid="auth-modal">AuthModal: {initialMode}</div>;
  };
});

// Mock featureFlags
jest.mock('../utils/featureFlags', () => ({
  onAuthModalRequested: jest.fn(() => jest.fn()),
}));

// Mock toolModel
jest.mock('../firebase/models/toolModel', () => ({
  toolCategories: ['Hand Planes', 'Chisels', 'Hand Saws', 'Sharpening'],
  toolSubcategories: {
    'Hand Planes': ['Smoothing Planes', 'Jack Planes'],
    'Chisels': ['Bench Chisels'],
    'Hand Saws': ['Backsaws'],
    'Sharpening': ['Whetstones'],
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  Object.assign(mockAuth, createMockAuthValue());
  Object.assign(mockWishlist, createMockWishlistValue());
  Object.assign(mockNotifications, createMockNotificationsValue());
  Object.assign(mockMessages, createMockMessagesValue());
  mockNavigate.mockClear();
});

describe('Header', () => {
  describe('Unauthenticated user', () => {
    it('renders logo and Rekerf link', () => {
      renderWithProviders(<Header />);
      expect(screen.getByText('Rekerf')).toBeInTheDocument();
    });

    it('shows Log In and Sign Up buttons', () => {
      renderWithProviders(<Header />);
      expect(screen.getByText('Log In')).toBeInTheDocument();
      expect(screen.getAllByText('Sign Up').length).toBeGreaterThan(0);
    });

    it('shows cart icon', () => {
      renderWithProviders(<Header />);
      expect(screen.getAllByTestId('cart-icon').length).toBeGreaterThan(0);
    });

    it('shows Sell Your Tools link', () => {
      renderWithProviders(<Header />);
      const sellLinks = screen.getAllByText('Sell Your Tools');
      expect(sellLinks.length).toBeGreaterThan(0);
    });

    it('opens auth modal when Log In is clicked', async () => {
      renderWithProviders(<Header />);
      await userEvent.click(screen.getByText('Log In'));
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByText('AuthModal: signin')).toBeInTheDocument();
    });
  });

  describe('Authenticated user', () => {
    beforeEach(() => {
      Object.assign(mockAuth, createAuthenticatedAuthValue({ displayName: 'Test User' }));
    });

    it('does not show Log In / Sign Up', () => {
      renderWithProviders(<Header />);
      expect(screen.queryByText('Log In')).not.toBeInTheDocument();
    });

    it('shows profile dropdown button', () => {
      renderWithProviders(<Header />);
      expect(screen.getByRole('button', { name: /open user menu/i })).toBeInTheDocument();
    });

    it('opens profile dropdown when clicked', async () => {
      renderWithProviders(<Header />);
      await userEvent.click(screen.getByRole('button', { name: /open user menu/i }));
      expect(screen.getByText('My Account')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  describe('Seller user', () => {
    beforeEach(() => {
      const sellerUser = createMockSellerUser();
      Object.assign(mockAuth, createAuthenticatedAuthValue(
        { ...sellerUser },
        {}
      ));
    });

    it('shows Seller Dashboard in profile dropdown', async () => {
      renderWithProviders(<Header />);
      await userEvent.click(screen.getByRole('button', { name: /open user menu/i }));
      expect(screen.getByText('Seller Dashboard')).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('renders search input', () => {
      renderWithProviders(<Header />);
      const searchInputs = screen.getAllByPlaceholderText(/search for tools/i);
      expect(searchInputs.length).toBeGreaterThan(0);
    });
  });
});
