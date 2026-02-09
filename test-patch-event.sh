#!/bin/bash

# Test script for PATCH /api/events/[eventId]

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing PATCH /api/events/[eventId] endpoint${NC}"
echo "=========================================="
echo ""

# First, get an event ID (you'll need to replace this with an actual event ID)
echo -e "${YELLOW}Enter an event ID to test:${NC}"
read EVENT_ID

if [ -z "$EVENT_ID" ]; then
    echo -e "${RED}Error: Event ID is required${NC}"
    exit 1
fi

# Test data
IMAGE_URL="https://images.unsplash.com/photo-1540575467063-178a50c2df87"

echo -e "${YELLOW}Testing with image URL: ${IMAGE_URL}${NC}"
echo ""

# Make the request
echo -e "${YELLOW}Sending PATCH request...${NC}"
RESPONSE=$(curl -s -X PATCH \
  http://localhost:3001/api/events/${EVENT_ID} \
  -H "Content-Type: application/json" \
  -d "{\"imageUrl\": \"${IMAGE_URL}\"}")

echo ""
echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Test passed - Event updated successfully${NC}"
else
    echo -e "${RED}✗ Test failed - See error above${NC}"
fi
