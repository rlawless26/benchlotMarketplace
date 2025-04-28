#!/bin/bash
# Script to deploy Firestore indexes

echo "Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "Done!"