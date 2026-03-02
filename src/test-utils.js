import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Renders a component wrapped in MemoryRouter and Suspense.
 * Use this instead of bare render() in all component tests.
 *
 * @param {React.ReactElement} ui - The component to render
 * @param {Object} options
 * @param {string[]} options.route - Initial route entries for MemoryRouter
 * @param {Object} options.renderOptions - Extra options passed to RTL render()
 */
export function renderWithProviders(ui, { route = ['/'], ...renderOptions } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={route}>
        <React.Suspense fallback={<div>Loading...</div>}>
          {children}
        </React.Suspense>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
