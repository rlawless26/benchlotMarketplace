import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AddToCartButton from './AddToCartButton';
import {
  createMockAuthValue,
  createMockCartValue,
  createMockTool,
  createMockNotificationContextValue,
} from '../__mocks__/hookMocks';

// AddToCartButton imports useCart and useAuth from '../firebase'
// and useNotificationContext from '../context/NotificationContext'
const mockAuth = createMockAuthValue();
const mockCart = createMockCartValue();
const mockNotificationCtx = createMockNotificationContextValue();

jest.mock('../firebase', () => ({
  useAuth: () => mockAuth,
  useCart: () => mockCart,
}));

jest.mock('../context/NotificationContext', () => ({
  useNotificationContext: () => mockNotificationCtx,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  Object.assign(mockAuth, createMockAuthValue());
  Object.assign(mockCart, createMockCartValue());
  Object.assign(mockNotificationCtx, createMockNotificationContextValue());
  mockNavigate.mockClear();
});

describe('AddToCartButton', () => {
  const tool = createMockTool();

  it('renders "Add to Cart" by default', () => {
    renderWithProviders(<AddToCartButton tool={tool} />);
    expect(screen.getByRole('button', { name: /add this item to your cart/i })).toBeInTheDocument();
    expect(screen.getByText('Add to Cart')).toBeInTheDocument();
  });

  it('calls addToCart when clicked', async () => {
    renderWithProviders(<AddToCartButton tool={tool} />);

    await userEvent.click(screen.getByRole('button'));

    expect(mockCart.addToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        toolId: tool.id,
        name: tool.name,
      })
    );
  });

  it('shows "View Cart" when item is already in cart', () => {
    mockCart.isItemInCart.mockReturnValue(true);

    renderWithProviders(<AddToCartButton tool={tool} />);
    expect(screen.getByText('View Cart')).toBeInTheDocument();
  });

  it('navigates to /cart when "View Cart" is clicked', async () => {
    mockCart.isItemInCart.mockReturnValue(true);

    renderWithProviders(<AddToCartButton tool={tool} />);
    await userEvent.click(screen.getByRole('button'));

    expect(mockNavigate).toHaveBeenCalledWith('/cart');
  });

  it('shows notification after adding to cart', async () => {
    renderWithProviders(<AddToCartButton tool={tool} />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockNotificationCtx.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Added to Cart',
          type: 'cart',
        })
      );
    });
  });

  it('button is disabled while loading', async () => {
    // Make addToCart take time
    mockCart.addToCart.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<AddToCartButton tool={tool} />);
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
