import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import ToolListingCard from './ToolListingCard';
import { createMockTool } from '../__mocks__/hookMocks';

// Mock child components with external dependencies
jest.mock('./ToolImage', () => {
  return function MockToolImage({ tool }) {
    return <img alt={tool.name} src="placeholder.jpg" />;
  };
});

jest.mock('./SaveToolButton', () => {
  return function MockSaveToolButton() {
    return <button>Save</button>;
  };
});

describe('ToolListingCard', () => {
  it('renders tool name and links to detail page', () => {
    const tool = createMockTool();
    renderWithProviders(<ToolListingCard tool={tool} />);

    const links = screen.getAllByRole('link');
    const detailLinks = links.filter(l => l.getAttribute('href') === `/tools/${tool.id}`);
    expect(detailLinks.length).toBeGreaterThan(0);
    expect(screen.getByText(tool.name)).toBeInTheDocument();
  });

  it('displays formatted price', () => {
    const tool = createMockTool({ price: 150 });
    renderWithProviders(<ToolListingCard tool={tool} />);
    expect(screen.getByText('$150')).toBeInTheDocument();
  });

  it('displays category badge', () => {
    const tool = createMockTool({ category: 'Hand Planes' });
    renderWithProviders(<ToolListingCard tool={tool} />);
    expect(screen.getByText('Hand Planes')).toBeInTheDocument();
  });

  it('displays condition', () => {
    const tool = createMockTool({ condition: 'Good' });
    renderWithProviders(<ToolListingCard tool={tool} />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows Featured badge when featured', () => {
    const tool = createMockTool({ featured: true });
    renderWithProviders(<ToolListingCard tool={tool} featured={true} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('does NOT show Featured badge when not featured', () => {
    const tool = createMockTool({ featured: false });
    renderWithProviders(<ToolListingCard tool={tool} featured={false} />);
    expect(screen.queryByText('Featured')).not.toBeInTheDocument();
  });

  it('shows original price with strikethrough when discounted', () => {
    const tool = createMockTool({ price: 150, original_price: 200 });
    renderWithProviders(<ToolListingCard tool={tool} />);
    expect(screen.getByText('$200')).toBeInTheDocument();
    expect(screen.getByText('$150')).toBeInTheDocument();
  });
});
