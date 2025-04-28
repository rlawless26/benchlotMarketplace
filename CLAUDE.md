# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- `npm start` - Start the React development server
- `npm test` - Run tests (Jest with React Testing Library)
- `npm run build` - Build production version
- `npm run build:staging` - Build for staging environment
- `npm test -- --testNamePattern="specific test name"` - Run a single test
- `cd functions && npm run serve` - Start Firebase functions emulator

## Code Style Guidelines
- **Imports**: Group imports by type (React, third-party, local) with line breaks between groups
- **Components**: Use functional components with hooks
- **Naming**: PascalCase for components, camelCase for variables/functions
- **File Structure**: Keep components, hooks, and utilities in their respective folders
- **Error Handling**: Use try/catch with detailed console.error for debugging
- **Documentation**: Use JSDoc for functions, especially in model files
- **Firebase**: Abstract Firebase operations into model files and custom hooks
- **Styling**: Use Tailwind CSS with custom color theme defined in tailwind.config.js
- **Context**: Use React Context for app-wide state management