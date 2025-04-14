# Benchlot Documentation Organization

## Overview

This document explains how the Benchlot project documentation is organized and where to find specific information.

## Directory Structure

```
/benchlot
├── README.md              # Project overview and getting started guide
├── docs/                  # Documentation directory
│   ├── README.md          # Documentation index
│   ├── MIGRATION.md       # Migration strategy from Supabase to Firebase
│   ├── STRIPE-INTEGRATION.md  # Stripe payment processing integration
│   ├── FIREBASE-FUNCTIONS.md  # Firebase Functions implementation
│   ├── SECURITY-RULES.md      # Firestore and Storage security rules
│   └── ORGANIZATION.md        # This file - documentation organization
├── functions/             # Firebase Functions code
│   ├── index.js           # Main API implementation
│   └── service-account.json  # Service account credentials (gitignored)
├── src/                   # React application code
│   ├── components/        # React components
│   │   └── StripeCheckout.js  # Stripe checkout component
│   └── firebase/          # Firebase integration
│       ├── hooks/         # Custom React hooks
│       └── models/        # Firestore data models
└── .env.local             # Environment variables (gitignored)
```

## Documentation Files

### Core Documentation

- **README.md**: Main project overview, features, and getting started guide
- **docs/README.md**: Index of all documentation files

### Implementation Guides

- **STRIPE-INTEGRATION.md**: Comprehensive guide to the Stripe payment processing integration
- **FIREBASE-FUNCTIONS.md**: Details about the Firebase Functions implementation
- **SECURITY-RULES.md**: Documentation of Firestore and Storage security rules
- **MIGRATION.md**: Strategy for migrating from Supabase to Firebase

## How to Use This Documentation

1. Start with the main **README.md** for a project overview and getting started guide
2. For specific implementation details, refer to the corresponding guide in the docs directory
3. To understand the documentation organization, refer to this file (ORGANIZATION.md)

## Contribution Guidelines

When adding new documentation:

1. Place it in the appropriate location within the docs directory
2. Follow the existing documentation format and style
3. Update the docs/README.md index with a link to the new documentation
4. Create or update any cross-references in other documentation files