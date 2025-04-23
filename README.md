# Honey Barrel Chrome Extension

A Chrome extension that helps users compare whisky/wine prices between retail sites and the BAXUS marketplace.

## Features

- Real-time price comparison between retail sites and BAXUS marketplace
- Automatic bottle name matching using similarity algorithm
- Overlay display showing potential savings
- Popup interface with detailed match information

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Supported Retail Sites

Currently supports:
- wine.com
- totalwine.com

## Technical Architecture

### Components

- **Background Script**: Handles BAXUS API communication and bottle matching logic
- **Content Script**: Extracts bottle information from retail sites and displays overlay
- **Popup**: Shows detailed match information and price comparisons

### Matching Algorithm

Uses a similarity-based approach to match bottle names:
1. Normalizes bottle names (removes special characters, standardizes spacing)
2. Calculates word-based similarity score
3. Filters matches above 60% similarity

## Development

### Project Structure

```
├── manifest.json      # Extension configuration
├── background.js      # Background service worker
├── content.js         # Content script for retail sites
├── popup.html         # Extension popup interface
├── popup.js          # Popup functionality
└── icons/            # Extension icons
```

### API Integration

Interacts with BAXUS marketplace API:
- Endpoint: `https://services.baxus.co/api/search/listings`
- Supports pagination and filtering for listed items

## Permissions

- `activeTab`: Access current tab information
- `scripting`: Inject content scripts
- `storage`: Store extension data
- Host permissions for BAXUS API and retail sites