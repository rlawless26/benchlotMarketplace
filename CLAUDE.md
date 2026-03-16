# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Rekerf — The marketplace for premium used hand tools. Formerly "Benchlot".

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
- **Styling**: Use Tailwind CSS with Rekerf design system (see tailwind.config.js)
- **Context**: Use React Context for app-wide state management

## Brand / Design System
- **Fonts**: Petrona (display/headings), Outfit (body/UI)
- **Colors**: Spruce (#1a3030), Bone (#f2f0eb), Honey (#d4aa60), Dark Teal (#0c1c1e)
- **Rules**: Never pure white backgrounds (use Bone). Never pure black text (use Dark Teal). Prices always in Honey. Button text on Honey is always Dark Teal.
- **Firebase project ID**: `benchlot-6d64e` (do not rename — this is the Google Cloud project identifier)
