import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import MakeOfferModal from './MakeOfferModal';
import {
  createMockUser,
  createMockTool,
  createMockOffersValue,
} from '../__mocks__/hookMocks';

// Mock hooks
const mockUser = createMockUser();
const mockOffers = createMockOffersValue();

jest.mock('../firebase/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, loading: false, isAuthenticated: jest.fn(() => true) }),
}));

jest.mock('../firebase/hooks/useOffers', () => ({
  useOffers: () => mockOffers,
}));

// Mock the messageModel lazy import used by MakeOfferModal
const mockGetOrCreateConversation = jest.fn().mockResolvedValue({ id: 'convo-new' });
const mockSendConvoMessage = jest.fn().mockResolvedValue({});

jest.mock('../firebase/models/messageModel', () => ({
  getOrCreateConversation: (...args) => mockGetOrCreateConversation(...args),
  sendMessage: (...args) => mockSendConvoMessage(...args),
}));

beforeEach(() => {
  Object.assign(mockOffers, createMockOffersValue());
  mockGetOrCreateConversation.mockClear().mockResolvedValue({ id: 'convo-new' });
  mockSendConvoMessage.mockClear().mockResolvedValue({});
});

describe('MakeOfferModal — Bridge', () => {
  const tool = createMockTool({ title: 'Stanley No. 4 Smoothing Plane', sellerName: 'Seller Joe' });
  const onClose = jest.fn();
  const onSuccess = jest.fn();

  const renderModal = () =>
    renderWithProviders(
      <MakeOfferModal isOpen={true} onClose={onClose} tool={tool} onSuccess={onSuccess} />
    );

  it('renders the offer form with tool info', () => {
    renderModal();

    expect(screen.getByText('Make an Offer')).toBeInTheDocument();
    expect(screen.getByText(/Stanley No. 4/)).toBeInTheDocument();
    expect(screen.getByLabelText('Your Offer')).toBeInTheDocument();
  });

  it('creates a conversation when submitting an offer', async () => {
    renderModal();

    // The default offer amount is 90% of price (135)
    await userEvent.click(screen.getByText('Submit Offer'));

    await waitFor(() => {
      // Should have created a conversation first
      expect(mockGetOrCreateConversation).toHaveBeenCalledWith(
        'user-123',
        'seller-456',
        expect.objectContaining({
          metadata: expect.objectContaining({
            toolId: 'tool-1',
          }),
        })
      );
    });

    await waitFor(() => {
      // Should have created the offer with conversationId
      expect(mockOffers.createOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'convo-new',
          toolId: 'tool-1',
          price: 135,
        })
      );
    });
  });

  it('sends a text message in the conversation when message is provided', async () => {
    renderModal();

    const messageInput = screen.getByRole('textbox', { name: /share a message/i });
    await userEvent.type(messageInput, 'Very interested in this plane!');

    await userEvent.click(screen.getByText('Submit Offer'));

    await waitFor(() => {
      expect(mockSendConvoMessage).toHaveBeenCalledWith(
        'convo-new',
        expect.objectContaining({
          senderId: 'user-123',
          text: 'Very interested in this plane!',
        })
      );
    });
  });

  it('does not send a text message when message is empty', async () => {
    renderModal();

    await userEvent.click(screen.getByText('Submit Offer'));

    await waitFor(() => {
      expect(mockOffers.createOffer).toHaveBeenCalled();
    });

    expect(mockSendConvoMessage).not.toHaveBeenCalled();
  });

  it('passes conversationId to onSuccess callback', async () => {
    jest.useFakeTimers();
    renderModal();

    await userEvent.click(screen.getByText('Submit Offer'));

    await waitFor(() => {
      expect(screen.getByText('Offer Submitted!')).toBeInTheDocument();
    });

    jest.advanceTimersByTime(1500);

    expect(onSuccess).toHaveBeenCalledWith('convo-new');

    jest.useRealTimers();
  });

  it('validates offer amount is not too low', async () => {
    renderModal();

    const input = screen.getByLabelText('Your Offer');
    await userEvent.clear(input);
    await userEvent.type(input, '50');

    await userEvent.click(screen.getByText('Submit Offer'));

    expect(screen.getByText('Please offer at least 50% of the asking price.')).toBeInTheDocument();
    expect(mockOffers.createOffer).not.toHaveBeenCalled();
  });

  it('validates offer amount is not too high', async () => {
    renderModal();

    const input = screen.getByLabelText('Your Offer');
    await userEvent.clear(input);
    await userEvent.type(input, '200');

    await userEvent.click(screen.getByText('Submit Offer'));

    expect(screen.getByText('Your offer should be lower than the asking price.')).toBeInTheDocument();
    expect(mockOffers.createOffer).not.toHaveBeenCalled();
  });
});
