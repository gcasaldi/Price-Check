// Background service worker for price tracking and alerts

// Storage structure:
// {
//   priceHistory: {
//     [productId]: [{ price, timestamp, url, title }, ...]
//   },
//   wishlist: {
//     [productId]: { ...productInfo, targetPrice, alerts }
//   },
//   settings: {
//     alertsEnabled: true,
//     priceThreshold: 10  // percentage
//   }
// }

class PriceTracker {
  constructor() {
    this.initializeStorage();
    this.setupAlarms();
  }

  async initializeStorage() {
    const result = await chrome.storage.local.get(['settings']);
    if (!result.settings) {
      await chrome.storage.local.set({
        settings: {
          alertsEnabled: true,
          priceThreshold: 10
        }
      });
    }
  }

  setupAlarms() {
    // Check wishlist prices every 6 hours
    chrome.alarms.create('checkWishlist', {
      periodInMinutes: 360
    });
  }

  async savePrice(productInfo) {
    const productId = this.generateProductId(productInfo);
    
    const result = await chrome.storage.local.get(['priceHistory']);
    const priceHistory = result.priceHistory || {};
    
    if (!priceHistory[productId]) {
      priceHistory[productId] = [];
    }

    // Add new price entry
    priceHistory[productId].push({
      price: productInfo.price,
      timestamp: productInfo.timestamp,
      url: productInfo.url,
      title: productInfo.title,
      currency: productInfo.currency
    });

    // Keep only last 100 entries per product
    if (priceHistory[productId].length > 100) {
      priceHistory[productId] = priceHistory[productId].slice(-100);
    }

    await chrome.storage.local.set({ priceHistory });
    
    return priceHistory[productId];
  }

  async getPriceHistory(productId) {
    const result = await chrome.storage.local.get(['priceHistory']);
    const priceHistory = result.priceHistory || {};
    return priceHistory[productId] || [];
  }

  async checkPrice(productInfo) {
    const productId = this.generateProductId(productInfo);
    const history = await this.getPriceHistory(productId);

    if (history.length < 2) {
      return {
        alert: true,
        isNewProduct: true,
        message: 'Price tracking started'
      };
    }

    const prices = history.map(h => h.price);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);

    const currentPrice = productInfo.price;
    const priceDiff = ((currentPrice - averagePrice) / averagePrice) * 100;

    const settings = await this.getSettings();
    const threshold = settings.priceThreshold || 10;

    let response = {
      alert: true,
      averagePrice,
      lowestPrice,
      highestPrice,
      currentPrice,
      priceDifference: Math.abs(priceDiff).toFixed(1),
      currency: productInfo.currency
    };

    if (priceDiff > threshold) {
      response.isPriceTooHigh = true;
      response.message = `Price is ${priceDiff.toFixed(1)}% above average`;
    } else if (priceDiff < -5) {
      response.isGoodPrice = true;
      response.message = `Good price! ${Math.abs(priceDiff).toFixed(1)}% below average`;
    } else {
      response.alert = false;
    }

    return response;
  }

  async addToWishlist(productInfo, targetPrice = null) {
    const productId = this.generateProductId(productInfo);
    const result = await chrome.storage.local.get(['wishlist']);
    const wishlist = result.wishlist || {};

    wishlist[productId] = {
      ...productInfo,
      targetPrice: targetPrice || productInfo.price * 0.9, // 10% below current by default
      addedAt: Date.now(),
      alerts: []
    };

    await chrome.storage.local.set({ wishlist });
    return wishlist[productId];
  }

  async removeFromWishlist(productId) {
    const result = await chrome.storage.local.get(['wishlist']);
    const wishlist = result.wishlist || {};
    delete wishlist[productId];
    await chrome.storage.local.set({ wishlist });
  }

  async getWishlist() {
    const result = await chrome.storage.local.get(['wishlist']);
    return result.wishlist || {};
  }

  async checkWishlistPrices() {
    const wishlist = await this.getWishlist();
    const settings = await this.getSettings();

    if (!settings.alertsEnabled) return;

    for (const [productId, item] of Object.entries(wishlist)) {
      const history = await this.getPriceHistory(productId);
      if (history.length === 0) continue;

      const latestPrice = history[history.length - 1].price;
      
      if (latestPrice <= item.targetPrice) {
        // Price target reached!
        this.sendNotification(
          'Price Alert!',
          `${item.title.substring(0, 50)}... is now ${item.currency}${latestPrice} (target: ${item.currency}${item.targetPrice})`
        );

        // Record alert
        const result = await chrome.storage.local.get(['wishlist']);
        const updatedWishlist = result.wishlist || {};
        if (updatedWishlist[productId]) {
          updatedWishlist[productId].alerts.push({
            timestamp: Date.now(),
            price: latestPrice,
            targetPrice: item.targetPrice
          });
          await chrome.storage.local.set({ wishlist: updatedWishlist });
        }
      }
    }
  }

  sendNotification(title, message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message
    });
  }

  generateProductId(productInfo) {
    // Create unique ID based on site and product identifier
    return `${productInfo.site}_${productInfo.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  async getSettings() {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || { alertsEnabled: true, priceThreshold: 10 };
  }

  async updateSettings(settings) {
    await chrome.storage.local.set({ settings });
  }
}

// Initialize tracker
const tracker = new PriceTracker();

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'savePrice') {
    tracker.savePrice(request.data).then(history => {
      sendResponse({ success: true, history });
    });
    return true;
  }

  if (request.action === 'checkPrice') {
    tracker.checkPrice(request.data).then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'getPriceHistory') {
    tracker.getPriceHistory(request.productId).then(history => {
      sendResponse({ history });
    });
    return true;
  }

  if (request.action === 'addToWishlist') {
    tracker.addToWishlist(request.data, request.targetPrice).then(item => {
      sendResponse({ success: true, item });
    });
    return true;
  }

  if (request.action === 'removeFromWishlist') {
    tracker.removeFromWishlist(request.productId).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getWishlist') {
    tracker.getWishlist().then(wishlist => {
      sendResponse({ wishlist });
    });
    return true;
  }

  if (request.action === 'getSettings') {
    tracker.getSettings().then(settings => {
      sendResponse({ settings });
    });
    return true;
  }

  if (request.action === 'updateSettings') {
    tracker.updateSettings(request.settings).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkWishlist') {
    tracker.checkWishlistPrices();
  }
});
