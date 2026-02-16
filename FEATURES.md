# Price Reality Check - Feature Documentation

## Core Features

### 1. Automatic Price Detection
The extension automatically detects products and prices when you visit e-commerce websites.

**Supported Sites:**
- Amazon (.com, .it, .co.uk, .de)
- Booking.com
- eBay (.com, .it)
- Generic e-commerce sites

**Detection Method:**
- Analyzes page DOM structure
- Extracts product title, price, currency, and image
- Identifies product using ASIN (Amazon) or URL path
- Stores timestamp with each price entry

### 2. Price History Tracking
Maintains historical price data for all visited products.

**Storage:**
- Up to 100 price points per product
- Stored locally using Chrome Storage API
- No external servers - complete privacy
- Automatic cleanup of old entries

**Data Points:**
- Price value
- Timestamp
- Product URL
- Product title
- Currency

### 3. Price Analysis & Alerts
Intelligent analysis of current prices vs. historical data.

**Metrics Calculated:**
- Current price
- Average price (historical)
- Lowest price seen
- Highest price seen
- Price difference percentage

**Alert Types:**
- ⚠️ "Paying too much" warning (price > average + threshold)
- ✅ "Good deal" notification (price significantly below average)
- ℹ️ Informational alerts for new products

**Alert Display:**
- Banner at top of product pages
- Extension badge notification
- Color-coded by severity (red/green/blue)
- Auto-dismiss after 10 seconds

### 4. Visual Price Charts
Interactive price history visualization in the popup.

**Chart Features:**
- Line graph showing price trends
- Data points for each tracked price
- Automatic scaling based on price range
- Shows min/max price labels
- Track count display

### 5. Intelligent Wishlist
Track favorite products and get alerts when prices drop.

**Wishlist Features:**
- Add any tracked product to wishlist
- Set custom target prices
- Automatic monitoring every 6 hours
- Browser notifications when target price reached
- View all wishlist items in dedicated tab
- Quick access to product pages

**Target Price:**
- Defaults to 10% below current price
- User-configurable
- Multiple alerts supported

### 6. Browser Notifications
System-level notifications for important price events.

**Notification Triggers:**
- Wishlist target price reached
- Significant price drops
- Good deals detected

**Notification Content:**
- Product title
- Current price
- Target price
- Direct link to product

### 7. Configurable Settings
User preferences for customizing extension behavior.

**Settings:**
- Enable/disable price alerts
- Price threshold for "too high" warning (default: 10%)
- Clear all stored data option

### 8. Privacy & Security
Complete privacy protection with local-only storage.

**Privacy Features:**
- No external API calls
- No data transmission to servers
- All storage local to browser
- No tracking or analytics
- No account required

**Security:**
- Secure hostname validation
- No eval() or unsafe code execution
- Content Security Policy compliant
- Minimal permissions requested

## User Interface

### Extension Popup
Three-tab interface for easy navigation.

**Tab 1: Current Product**
- Product image and title
- Current site badge
- Price statistics grid
- Price history chart
- Price verdict message
- Add/remove wishlist buttons

**Tab 2: Wishlist**
- List of all tracked products
- Product images and titles
- Current vs target prices
- Quick links to products
- Remove from wishlist buttons

**Tab 3: Settings**
- Alert toggle
- Price threshold slider
- Clear data button

### Content Page Alerts
Non-intrusive banner alerts at top of product pages.

**Design:**
- Gradient backgrounds (color-coded)
- Clear messaging
- Close button
- Responsive layout
- Smooth animations

## Technical Implementation

### Architecture
- **Manifest V3** - Latest Chrome extension standard
- **Service Worker** - Background price tracking
- **Content Scripts** - Page integration
- **Storage API** - Local data persistence
- **Alarms API** - Scheduled wishlist checks
- **Notifications API** - System notifications

### Code Structure
- Modular class-based design
- Async/await for all storage operations
- Message passing between components
- Error handling throughout
- Clean separation of concerns

### Performance
- Minimal DOM manipulation
- Efficient storage queries
- Lightweight scripts
- No third-party dependencies
- Fast price detection

## Usage Scenarios

### Scenario 1: First-time Product Visit
1. User visits Amazon product page
2. Extension detects product and price
3. Alert shown: "Price tracking started"
4. Price saved to history
5. Product appears in popup with initial data

### Scenario 2: Returning to Tracked Product
1. User revisits previously tracked product
2. Extension detects product
3. Current price compared with history
4. Alert shown if price is notably high/low
5. Popup shows full price analysis and chart

### Scenario 3: Wishlist Alert
1. User adds product to wishlist with target price
2. Extension checks price every 6 hours
3. Price drops to target
4. Browser notification sent
5. User can visit product at good price

### Scenario 4: Price History Analysis
1. User clicks extension icon
2. Popup shows current product
3. Charts display price trends
4. Statistics reveal pricing patterns
5. User makes informed decision

## Browser Compatibility

- Chrome (recommended)
- Edge
- Brave
- Opera
- Firefox (with minor adjustments)

## Data Format

### Product Info Object
```javascript
{
  site: 'amazon',
  id: 'B01234ABCD',
  title: 'Product Name',
  price: 89.99,
  currency: 'USD',
  url: 'https://...',
  image: 'https://...',
  timestamp: 1234567890
}
```

### Price History Entry
```javascript
{
  price: 89.99,
  timestamp: 1234567890,
  url: 'https://...',
  title: 'Product Name',
  currency: 'USD'
}
```

### Wishlist Item
```javascript
{
  ...productInfo,
  targetPrice: 79.99,
  addedAt: 1234567890,
  alerts: [
    { timestamp: 1234567890, price: 79.99, targetPrice: 79.99 }
  ]
}
```

## Future Enhancements

Potential features for future versions:
- Cross-site price comparison
- Price drop predictions using ML
- Export price history to CSV
- Share deals with friends
- Mobile app version
- Integration with shopping lists
- Coupon code detection
- Cashback integration
- Product reviews aggregation
- Price alerts via email/SMS
