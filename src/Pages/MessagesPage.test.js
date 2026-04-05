import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import MessagesPage from './MessagesPage';
import {
  createMockOffer,
  createMockConversation,
} from '../__mocks__/hookMocks';

// Must use `mock` prefix for variables referenced inside jest.mock factories
let mockActiveOffers = [];
let mockConversations = [];

jest.mock('../firebase/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'user-123', displayName: 'Test User' },
    loading: false,
    isAuthenticated: jest.fn(() => true),
  }),
}));

jest.mock('../firebase/hooks/useOffers', () => ({
  useOffers: () => ({
    activeOffers: mockActiveOffers,
    loading: false,
    error: null,
    OfferStatus: {
      PENDING: 'pending',
      ACCEPTED: 'accepted',
      COUNTERED: 'countered',
      DECLINED: 'declined',
      EXPIRED: 'expired',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
    },
  }),
}));

jest.mock('../firebase/hooks/useMessages', () => ({
  useMessages: () => ({
    conversations: mockConversations,
    loading: false,
    error: null,
    markAsRead: jest.fn(),
  }),
}));

jest.mock('../utils/featureFlags', () => ({
  openAuthModal: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

beforeEach(() => {
  mockActiveOffers = [];
  mockConversations = [];
  mockNavigate.mockClear();
});

describe('MessagesPage — Bridge De-duplication', () => {
  it('does not show bridged offers as separate sidebar items', async () => {
    const convo = createMockConversation({ id: 'convo-1' });
    const bridgedOffer = createMockOffer({
      id: 'offer-1',
      conversationId: 'convo-1',
      toolTitle: 'Bridged Plane Offer',
    });

    mockActiveOffers = [bridgedOffer];
    mockConversations = [convo];

    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Seller User').length).toBeGreaterThan(0);
    });

    // Should only have 1 list item (the conversation), not 2
    const allItems = screen.getAllByRole('listitem');
    expect(allItems).toHaveLength(1);
  });

  it('shows standalone offers (no conversationId) as separate items', async () => {
    const standaloneOffer = createMockOffer({
      id: 'offer-2',
      conversationId: null,
      toolTitle: 'Standalone Chisel Offer',
    });

    mockActiveOffers = [standaloneOffer];
    mockConversations = [];

    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText('Standalone Chisel Offer')).toBeInTheDocument();
    });
  });

  it('enriches conversation item with linked offer badge', async () => {
    const convo = createMockConversation({ id: 'convo-1' });
    const bridgedOffer = createMockOffer({
      id: 'offer-1',
      conversationId: 'convo-1',
      status: 'pending',
      updatedAt: { seconds: Date.now() / 1000 + 100 },
    });

    mockActiveOffers = [bridgedOffer];
    mockConversations = [convo];

    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText('Offer')).toBeInTheDocument();
    });

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows both standalone offer and conversation as separate items', async () => {
    const convo = createMockConversation({ id: 'convo-1' });
    const standaloneOffer = createMockOffer({
      id: 'offer-2',
      conversationId: null,
      toolTitle: 'Standalone Offer',
    });

    mockActiveOffers = [standaloneOffer];
    mockConversations = [convo];

    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Seller User').length).toBeGreaterThan(0);
      expect(screen.getByText('Standalone Offer')).toBeInTheDocument();
    });

    const allItems = screen.getAllByRole('listitem');
    expect(allItems).toHaveLength(2);
  });

  it('shows empty state when no messages or offers', () => {
    mockActiveOffers = [];
    mockConversations = [];

    renderWithProviders(<MessagesPage />);

    expect(screen.getByText('No messages found')).toBeInTheDocument();
  });
});
