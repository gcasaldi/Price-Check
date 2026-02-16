# Price Reality Check 💰

A browser extension that helps you make smarter shopping decisions by tracking prices, showing price history, and alerting you when you might be paying too much.

## Features

✅ **Price Comparison** - Compare current prices with historical data  
📊 **Price History** - Visual charts showing price trends over time  
⚠️ **Smart Alerts** - Get notified when you're paying too much or when prices drop  
🛒 **Intelligent Wishlist** - Track products and receive alerts when they reach your target price  
🌍 **Multi-Site Support** - Works on:
- Amazon (all regions)
- Booking.com
- eBay
- Other e-commerce sites

## Installation

### Chrome/Edge/Brave

1. Download or clone this repository
2. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the `Price-Check` folder
6. The extension is now installed!

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the `Price-Check` folder and select `manifest.json`
5. The extension is now installed!

## Usage

### Automatic Price Tracking

Simply visit any product page on supported sites (Amazon, Booking, eBay). The extension will:
- Automatically detect the product and current price
- Save the price to history
- Show an alert banner if the price is notably high or low

### View Price Analysis

1. Click the extension icon in your browser toolbar
2. The popup shows:
   - Current product information
   - Price statistics (current, average, lowest, highest)
   - Price history chart
   - Smart verdict: "Are you paying too much?"

### Add to Wishlist

1. On any product page, click the extension icon
2. Click "Add to Wishlist"
3. Set your target price (defaults to 10% below current price)
4. You'll receive browser notifications when the price drops to your target

### Manage Wishlist

1. Click the extension icon
2. Go to the "Wishlist" tab
3. View all tracked products
4. Click "View Product" to open the product page
5. Remove items you're no longer interested in

### Configure Settings

1. Click the extension icon
2. Go to the "Settings" tab
3. Configure:
   - Enable/disable price alerts
   - Set price threshold for "too high" warnings (default: 10%)
   - Clear all tracking data

## How It Works

1. **Content Script** - Detects product information on e-commerce pages
2. **Background Service** - Stores price history and manages alerts
3. **Popup UI** - Displays price analysis and wishlist
4. **Smart Analysis** - Compares current prices with historical averages

## Privacy

All data is stored locally in your browser using Chrome Storage API. No data is sent to external servers. Your shopping data stays private.

## Supported Sites

Currently supported:
- Amazon.com, Amazon.it, Amazon.co.uk, Amazon.de
- Booking.com
- eBay.com, eBay.it
- Generic e-commerce sites (with basic support)

## Development

### Project Structure

```
Price-Check/
├── manifest.json       # Extension configuration
├── content.js         # Product detection and price extraction
├── content.css        # Alert banner styles
├── background.js      # Price tracking and storage logic
├── popup.html         # Extension popup UI
├── popup.js          # Popup interaction logic
├── popup.css         # Popup styles
├── icons/            # Extension icons
└── README.md         # This file
```

### Contributing

Contributions are welcome! Feel free to:
- Add support for more e-commerce sites
- Improve price extraction algorithms
- Enhance the UI/UX
- Fix bugs

## License

MIT License - feel free to use and modify as needed.

## Future Enhancements

- [ ] Price comparison across multiple sites
- [ ] Export price history data
- [ ] Price drop predictions using ML
- [ ] Share deals with friends
- [ ] Mobile app version