# Benchlot Firebase Implementation - Project Structure

This folder contains the source code for the Benchlot application. The project follows a structured organization pattern to maintain clean code separation and reusability.

## Directory Structure

- **Pages/** - Full page components with their own routes
  - Each file represents a complete page in the application
  - These components compose UI from smaller components
  - Pages are responsible for data fetching and layout orchestration

- **components/** - Reusable UI components
  - Building blocks used to construct pages
  - Components should be focused on a single responsibility
  - Stateful components that handle specific functionality
  
  - **ui/** - Low-level UI components
    - Basic building blocks like buttons, inputs, cards, etc.
    - These are pure presentational components
    - Highly reusable across the entire application
    - Styled consistently with the design system

- **firebase/** - Firebase integration
  - Authentication services
  - Database access
  - Storage utilities
  - Custom hooks for Firebase features

- **styles/** - Global styles and design system
  - Global CSS files
  - Design system definitions
  - Tailwind extensions and configurations

## Styling Approach

The project uses Tailwind CSS with custom extensions to match the Benchlot design system:

- **Colors**: Forest green primary (#17613F) with complimentary palette
- **Typography**: Spectral (serif) for headings, Montserrat (sans-serif) for body text
- **Components**: Consistent styling for cards, buttons, forms, etc.

## Best Practices

- Components should be modular and reusable where possible
- Pages should compose components, not contain complex UI directly
- Follow the established naming conventions
- Maintain the directory structure when adding new files
- UI components should be styled according to the design system