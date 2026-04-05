import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import OfferActivityCard from './OfferActivityCard';
import {
  createMockUser,
  createMockOffersValue,
} from '../__mocks__/hookMocks';

// Mock hooks
const mockAuth = { user: createMockUser(), loading: false, isAuthenticated: jest.fn(() => true) };
const mockOffers = createMockOffersValue();

jest.mock('../firebase/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../firebase/hooks/useOffers', () => ({
  useOffers: () => mockOffers,
}));

beforeEach(() => {
  Object.assign(mockOffers, createMockOffersValue());
});

const baseMessage = {
  id: 'msg-1',
  senderId: 'seller-456', // someone else sent it
  type: 'offer_activity',
  text: 'Offer: $120',
  offerId: 'offer-1',
  offerSnapshot: {
    status: 'pending',
    currentPrice: 120,
    originalPrice: 150,
  },
  createdAt: { seconds: Date.now() / 1000 },
};

describe('OfferActivityCard', () => {
  it('renders offer price and status', () => {
    renderWithProviders(<OfferActivityCard message={baseMessage} />);

    expect(screen.getByText('$120')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/of \$150 asking/)).toBeInTheDocument();
  });

  it('shows action buttons when current user can act (received offer)', () => {
    renderWithProviders(<OfferActivityCard message={baseMessage} />);

    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Counter')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('hides action buttons when current user sent the offer', () => {
    const ownMessage = { ...baseMessage, senderId: 'user-123' };
    renderWithProviders(<OfferActivityCard message={ownMessage} />);

    expect(screen.queryByText('Accept')).not.toBeInTheDocument();
    expect(screen.queryByText('Counter')).not.toBeInTheDocument();
    expect(screen.queryByText('Decline')).not.toBeInTheDocument();
  });

  it('hides action buttons for terminal statuses', () => {
    const declinedMessage = {
      ...baseMessage,
      offerSnapshot: { ...baseMessage.offerSnapshot, status: 'declined' },
    };
    renderWithProviders(<OfferActivityCard message={declinedMessage} />);

    expect(screen.queryByText('Accept')).not.toBeInTheDocument();
    expect(screen.queryByText('Decline')).not.toBeInTheDocument();
  });

  it('calls acceptOffer when Accept is clicked', async () => {
    renderWithProviders(<OfferActivityCard message={baseMessage} />);

    await userEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(mockOffers.acceptOffer).toHaveBeenCalledWith('offer-1');
    });
  });

  it('calls declineOffer when Decline is clicked', async () => {
    renderWithProviders(<OfferActivityCard message={baseMessage} />);

    await userEvent.click(screen.getByText('Decline'));

    await waitFor(() => {
      expect(mockOffers.declineOffer).toHaveBeenCalledWith('offer-1');
    });
  });

  it('shows counter form when Counter is clicked', async () => {
    renderWithProviders(<OfferActivityCard message={baseMessage} />);

    await userEvent.click(screen.getByText('Counter'));

    expect(screen.getByPlaceholderText('Your counter offer')).toBeInTheDocument();
    expect(screen.getByText('Send Counter')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('submits counter offer with amount', async () => {
    renderWithProviders(<OfferActivityCard message={baseMessage} />);

    await userEvent.click(screen.getByText('Counter'));

    const input = screen.getByPlaceholderText('Your counter offer');
    await userEvent.clear(input);
    await userEvent.type(input, '135');

    await userEvent.click(screen.getByText('Send Counter'));

    await waitFor(() => {
      expect(mockOffers.counterOffer).toHaveBeenCalledWith('offer-1', 135, '');
    });
  });

  it('shows "Offer Accepted" header for accepted offers', () => {
    const acceptedMessage = {
      ...baseMessage,
      offerSnapshot: { ...baseMessage.offerSnapshot, status: 'accepted' },
    };
    renderWithProviders(<OfferActivityCard message={acceptedMessage} />);

    expect(screen.getByText('Offer Accepted')).toBeInTheDocument();
  });

  it('shows Complete Purchase link for accepted offers where user can act', () => {
    const acceptedMessage = {
      ...baseMessage,
      offerSnapshot: { ...baseMessage.offerSnapshot, status: 'accepted' },
    };
    renderWithProviders(<OfferActivityCard message={acceptedMessage} />);

    expect(screen.getByText('Complete Purchase')).toBeInTheDocument();
  });

  it('renders accepted offer with correct status badge', () => {
    const acceptedMessage = {
      ...baseMessage,
      offerSnapshot: { ...baseMessage.offerSnapshot, status: 'accepted' },
    };
    renderWithProviders(<OfferActivityCard message={acceptedMessage} />);

    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });
});
