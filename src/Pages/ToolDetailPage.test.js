import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import ToolDetailPage from './ToolDetailPage';
import {
  createMockAuthValue,
  createMockTool,
} from '../__mocks__/hookMocks';

// ToolDetailPage imports useAuth from '../firebase'
const mockAuth = createMockAuthValue();

jest.mock('../firebase', () => ({
  useAuth: () => mockAuth,
}));

// Mock toolModel functions
const mockGetToolById = jest.fn();
const mockGetActiveTools = jest.fn();

jest.mock('../firebase/models/toolModel', () => ({
  getToolById: (...args) => mockGetToolById(...args),
  getActiveTools: (...args) => mockGetActiveTools(...args),
  toolStatus: { PENDING_IMAGES: 'pending_images', ACTIVE: 'active' },
  uploadToolImage: jest.fn(),
  conditionDefinitions: {
    New: 'Brand new, never used',
    'Like New': 'Barely used, excellent condition',
    Good: 'Normal wear, fully functional',
  },
}));

// Mock userModel
jest.mock('../firebase/models/userModel', () => ({
  getUserById: jest.fn().mockResolvedValue(null),
}));

// Mock child components
jest.mock('../components/ImageComponent', () => {
  return function MockImageComponent({ placeholderText }) {
    return <div data-testid="placeholder-image">{placeholderText}</div>;
  };
});

jest.mock('../components/AddToCartButton', () => {
  return function MockAddToCartButton({ tool }) {
    return <button aria-label="Add this item to your cart">Add to Cart</button>;
  };
});

jest.mock('../components/SaveToolButton', () => {
  return function MockSaveToolButton() {
    return <button aria-label="Watch this item">Save</button>;
  };
});

jest.mock('../components/MakeOfferModal', () => {
  return function MockMakeOfferModal() {
    return null;
  };
});

jest.mock('../utils/featureFlags', () => ({
  openAuthModal: jest.fn(),
}));

// Mock useParams to return a tool id
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'tool-1' }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: '', pathname: '/tools/tool-1' }),
}));

beforeEach(() => {
  Object.assign(mockAuth, createMockAuthValue());
  mockGetToolById.mockReset();
  mockGetActiveTools.mockReset();
  mockGetActiveTools.mockResolvedValue({ tools: [] });
  mockNavigate.mockClear();
});

describe('ToolDetailPage', () => {
  it('shows loading state initially', () => {
    // Never resolves, so it stays loading
    mockGetToolById.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<ToolDetailPage />);
    expect(screen.getByText(/loading tool details/i)).toBeInTheDocument();
  });

  it('shows error state when tool fails to load', async () => {
    mockGetToolById.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<ToolDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading tool/i)).toBeInTheDocument();
    });
  });

  it('shows tool not found when null is returned', async () => {
    mockGetToolById.mockResolvedValue(null);

    renderWithProviders(<ToolDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Tool Not Found')).toBeInTheDocument();
    });
  });

  it('renders tool details when loaded successfully', async () => {
    const tool = createMockTool({
      name: 'Vintage Lie-Nielsen Plane',
      current_price: 350,
      category: 'Hand Planes',
      condition: 'Like New',
    });
    mockGetToolById.mockResolvedValue(tool);

    renderWithProviders(<ToolDetailPage />);

    await waitFor(() => {
      // Tool name may appear in breadcrumb and heading
      const nameElements = screen.getAllByText('Vintage Lie-Nielsen Plane');
      expect(nameElements.length).toBeGreaterThan(0);
    });
    expect(screen.getByText('$350')).toBeInTheDocument();
  });

  it('shows Add to Cart button for non-owner', async () => {
    const tool = createMockTool({ user_id: 'other-user' });
    mockGetToolById.mockResolvedValue(tool);

    renderWithProviders(<ToolDetailPage />);

    await waitFor(() => {
      const nameElements = screen.getAllByText(tool.name);
      expect(nameElements.length).toBeGreaterThan(0);
    });

    // The page has a visible "Add to Cart" button and a hidden AddToCartButton
    expect(screen.getAllByText('Add to Cart').length).toBeGreaterThan(0);
  });

  it('shows Return to Marketplace button on error', async () => {
    mockGetToolById.mockRejectedValue(new Error('fail'));

    renderWithProviders(<ToolDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Return to Marketplace')).toBeInTheDocument();
    });
  });

  it('renders breadcrumb navigation on success', async () => {
    const tool = createMockTool({ category: 'Chisels' });
    mockGetToolById.mockResolvedValue(tool);

    renderWithProviders(<ToolDetailPage />);

    await waitFor(() => {
      // "Marketplace" and "Chisels" appear in breadcrumb and possibly elsewhere
      const marketplaceLinks = screen.getAllByText('Marketplace');
      expect(marketplaceLinks.length).toBeGreaterThan(0);
      const chiselElements = screen.getAllByText('Chisels');
      expect(chiselElements.length).toBeGreaterThan(0);
    });
  });
});
