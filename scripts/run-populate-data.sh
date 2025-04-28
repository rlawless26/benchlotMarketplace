#!/bin/bash

echo "Installing required dependencies..."
npm install --no-save firebase@8.10.0

echo "Running populate data script..."
node populate-mock-data.js

echo "Done!"