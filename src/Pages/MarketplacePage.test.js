import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import MarketplacePage from './MarketplacePage';
import { createMockTool } from '../__mocks__/hookMocks';

// Mock toolModel
const mockGetActiveTools = jest.fn();

jest.mock('../firebase/models/toolModel', () => ({
  getActiveTools: (...args) => mockGetActiveTools(...args),
  toolSubcategories: {
    'Hand Planes': ['Smoothing Planes', 'Jack Planes'],
    'Chisels': ['Bench Chisels'],
  },
  toolConditions: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
}));

// The page's data path is getAggregatedListings (the aggregator adapter),
// not toolModel — route the same mock through it so every existing test's
// loading/error/empty/cards assertions keep driving the page. The adapter
// used to be satisfied by the global Firestore mocks; it now uses fetch(),
// which jsdom doesn't provide.
jest.mock('../firebase/adapters/externalListingAdapter', () => ({
  ...jest.requireActual('../firebase/adapters/externalListingAdapter'),
  getAggregatedListings: (...args) => mockGetActiveTools(...args),
}));

// Mock ToolListingCard to simplify
jest.mock('../components/ToolListingCard', () => {
  return function MockToolListingCard({ tool }) {
    return <div data-testid={`tool-card-${tool.id}`}>{tool.name}</div>;
  };
});

beforeEach(() => {
  mockGetActiveTools.mockReset();
  mockGetActiveTools.mockResolvedValue({ tools: [] });
});

describe('MarketplacePage', () => {
  it('shows loading state initially', () => {
    mockGetActiveTools.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<MarketplacePage />);
    // "Loading listings..." appears in both the results count and the spinner
    const loadingElements = screen.getAllByText(/loading listings/i);
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows error when tools fail to load', async () => {
    mockGetActiveTools.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText(/could not load listings/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no tools match', async () => {
    mockGetActiveTools.mockResolvedValue({ tools: [] });

    renderWithProviders(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('No listings match')).toBeInTheDocument();
    });
  });

  it('renders tool cards when tools are loaded', async () => {
    const tools = [
      createMockTool({ id: 'tool-1', name: 'Smoothing Plane' }),
      createMockTool({ id: 'tool-2', name: 'Chisel Set' }),
    ];
    mockGetActiveTools.mockResolvedValue({ tools });

    renderWithProviders(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Smoothing Plane')).toBeInTheDocument();
      expect(screen.getByText('Chisel Set')).toBeInTheDocument();
    });
  });

  it('renders page header', async () => {
    mockGetActiveTools.mockResolvedValue({ tools: [] });

    renderWithProviders(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Search quality hand tools')).toBeInTheDocument();
    });
  });

  it('has a search input', async () => {
    mockGetActiveTools.mockResolvedValue({ tools: [] });

    renderWithProviders(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tools...')).toBeInTheDocument();
    });
  });
});
