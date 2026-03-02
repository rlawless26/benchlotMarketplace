import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import CartPage from './CartPage';
import {
  createMockAuthValue,
  createAuthenticatedAuthValue,
  createMockCartValue,
  createMockCartItem,
} from '../__mocks__/hookMocks';

const mockAuth = createMockAuthValue();
const mockCart = createMockCartValue();

jest.mock('../firebase', () => ({
  useAuth: () => mockAuth,
  useCart: () => mockCart,
}));

jest.mock('../utils/featureFlags', () => ({
  openAuthModal: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  Object.assign(mockAuth, createMockAuthValue());
  Object.assign(mockCart, createMockCartValue());
  mockNavigate.mockClear();
});

describe('CartPage', () => {
  describe('Loading state', () => {
    it('shows loading spinner when loading and no cart', () => {
      Object.assign(mockCart, createMockCartValue({ loading: true, cart: null }));

      renderWithProviders(<CartPage />);
      expect(screen.getByText(/loading your cart/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('shows error message', () => {
      Object.assign(mockCart, createMockCartValue({ error: 'Failed to load cart' }));

      renderWithProviders(<CartPage />);
      expect(screen.getByText('Failed to load cart')).toBeInTheDocument();
    });
  });

  describe('Empty cart', () => {
    it('shows empty cart message', () => {
      renderWithProviders(<CartPage />);
      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    });

    it('shows link to browse tools', () => {
      renderWithProviders(<CartPage />);
      expect(screen.getByText('Browse Tools')).toBeInTheDocument();
    });
  });

  describe('Cart with items', () => {
    const items = [
      createMockCartItem({ id: 'item-1', name: 'Stanley Plane', price: 150, quantity: 1 }),
      createMockCartItem({ id: 'item-2', name: 'Chisel Set', price: 75, quantity: 2 }),
    ];

    beforeEach(() => {
      Object.assign(mockCart, createMockCartValue({ cart: { items } }));
    });

    it('renders all cart items', () => {
      renderWithProviders(<CartPage />);
      expect(screen.getByText('Stanley Plane')).toBeInTheDocument();
      expect(screen.getByText('Chisel Set')).toBeInTheDocument();
    });

    it('shows item count', () => {
      renderWithProviders(<CartPage />);
      expect(screen.getByText(/2 items in your cart/)).toBeInTheDocument();
    });

    it('shows Order Summary', () => {
      renderWithProviders(<CartPage />);
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    });

    it('calls removeItem when Remove is clicked', async () => {
      renderWithProviders(<CartPage />);

      const removeButtons = screen.getAllByRole('button', { name: /remove item/i });
      await userEvent.click(removeButtons[0]);

      expect(mockCart.removeItem).toHaveBeenCalledWith('item-1');
    });

    it('calls updateItemQuantity when + is clicked', async () => {
      renderWithProviders(<CartPage />);

      const increaseButtons = screen.getAllByRole('button', { name: /increase quantity/i });
      await userEvent.click(increaseButtons[0]);

      expect(mockCart.updateItemQuantity).toHaveBeenCalledWith('item-1', 2);
    });

    it('calls emptyCart when Clear Cart is clicked', async () => {
      renderWithProviders(<CartPage />);

      await userEvent.click(screen.getByText('Clear Cart'));

      expect(mockCart.emptyCart).toHaveBeenCalled();
    });
  });

  describe('Checkout buttons', () => {
    const items = [createMockCartItem()];

    it('shows "Proceed to Checkout" for authenticated users', () => {
      Object.assign(mockAuth, createAuthenticatedAuthValue());
      Object.assign(mockCart, createMockCartValue({ cart: { items } }));

      renderWithProviders(<CartPage />);
      expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
    });

    it('shows "Continue as Guest" for unauthenticated users', () => {
      Object.assign(mockCart, createMockCartValue({ cart: { items } }));

      renderWithProviders(<CartPage />);
      expect(screen.getByText('Continue as Guest')).toBeInTheDocument();
      expect(screen.getByText('Sign In to Checkout')).toBeInTheDocument();
      expect(screen.getByText('Create an Account')).toBeInTheDocument();
    });
  });
});
