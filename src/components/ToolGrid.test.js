import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import ToolGrid from './ToolGrid';
import { createMockTool } from '../__mocks__/hookMocks';

// Mock child components that have their own dependencies
jest.mock('./ToolListingCard', () => {
  return function MockToolListingCard({ tool, featured }) {
    return (
      <div data-testid={`tool-card-${tool.id}`}>
        <span>{tool.name}</span>
        {featured && <span>Featured</span>}
      </div>
    );
  };
});

describe('ToolGrid', () => {
  it('shows loading state', () => {
    renderWithProviders(<ToolGrid tools={[]} loading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithProviders(<ToolGrid tools={[]} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows empty message when tools array is empty', () => {
    renderWithProviders(<ToolGrid tools={[]} loading={false} />);
    expect(screen.getByText('No tools found')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    renderWithProviders(
      <ToolGrid tools={[]} loading={false} emptyMessage="No matching results" />
    );
    expect(screen.getByText('No matching results')).toBeInTheDocument();
  });

  it('renders tool cards when tools are provided', () => {
    const tools = [
      createMockTool({ id: 'tool-1', name: 'Plane' }),
      createMockTool({ id: 'tool-2', name: 'Chisel', featured: true }),
    ];

    renderWithProviders(<ToolGrid tools={tools} loading={false} />);
    expect(screen.getByTestId('tool-card-tool-1')).toBeInTheDocument();
    expect(screen.getByTestId('tool-card-tool-2')).toBeInTheDocument();
    expect(screen.getByText('Plane')).toBeInTheDocument();
    expect(screen.getByText('Chisel')).toBeInTheDocument();
  });
});
