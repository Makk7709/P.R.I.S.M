#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Running PRISM v2 tests..."

# Run unit tests
echo -e "\n${GREEN}Running unit tests...${NC}"
npm run test:unit
UNIT_EXIT_CODE=$?

# Run dashboard tests
echo -e "\n${GREEN}Running dashboard tests...${NC}"
npm run test:dashboard
DASHBOARD_EXIT_CODE=$?

# Run all tests
echo -e "\n${GREEN}Running all tests...${NC}"
npm run test:all
ALL_EXIT_CODE=$?

# Check results
if [ $UNIT_EXIT_CODE -eq 0 ] && [ $DASHBOARD_EXIT_CODE -eq 0 ] && [ $ALL_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed.${NC}"
    exit 1
fi 