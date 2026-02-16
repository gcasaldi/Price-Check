// Content script for detecting and tracking prices on e-commerce sites

class PriceDetector {
  constructor() {
    this.currentSite = this.detectSite();
    this.productInfo = null;
  }

  detectSite() {
    const hostname = window.location.hostname;
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('booking')) return 'booking';
    if (hostname.includes('ebay')) return 'ebay';
    return 'generic';
  }

  extractProductInfo() {
    switch (this.currentSite) {
      case 'amazon':
        return this.extractAmazonProduct();
      case 'booking':
        return this.extractBookingProduct();
      case 'ebay':
        return this.extractEbayProduct();
      default:
        return this.extractGenericProduct();
    }
  }

  extractAmazonProduct() {
    const title = document.querySelector('#productTitle')?.textContent.trim();
    const priceWhole = document.querySelector('.a-price-whole')?.textContent.trim();
    const priceFraction = document.querySelector('.a-price-fraction')?.textContent.trim();
    const image = document.querySelector('#landingImage, #imgBlkFront')?.src;
    const asin = this.getAsinFromUrl();

    if (!title || !priceWhole) return null;

    const price = parseFloat(`${priceWhole.replace(/[^\d]/g, '')}.${priceFraction || '00'}`);

    return {
      site: 'amazon',
      id: asin || window.location.pathname,
      title,
      price,
      currency: this.detectCurrency(),
      url: window.location.href,
      image,
      timestamp: Date.now()
    };
  }

  extractBookingProduct() {
    const title = document.querySelector('h2.pp-header__title, .hp__hotel-name')?.textContent.trim();
    const priceElement = document.querySelector('.prco-valign-middle-helper, .bui-price-display__value');
    const image = document.querySelector('.hotel_image, .bh-photo-grid-item img')?.src;

    if (!title || !priceElement) return null;

    const priceText = priceElement.textContent.trim();
    const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));

    return {
      site: 'booking',
      id: window.location.pathname,
      title,
      price,
      currency: this.detectCurrency(),
      url: window.location.href,
      image,
      timestamp: Date.now()
    };
  }

  extractEbayProduct() {
    const title = document.querySelector('.x-item-title__mainTitle, h1.it-ttl')?.textContent.trim();
    const priceElement = document.querySelector('.x-price-primary .ux-textspans, .notranslate.vi-VR-cvipPrice');
    const image = document.querySelector('.ux-image-carousel-item img, #icImg')?.src;

    if (!title || !priceElement) return null;

    const priceText = priceElement.textContent.trim();
    const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));

    return {
      site: 'ebay',
      id: window.location.pathname,
      title,
      price,
      currency: this.detectCurrency(),
      url: window.location.href,
      image,
      timestamp: Date.now()
    };
  }

  extractGenericProduct() {
    // Generic extraction for other e-commerce sites
    const title = document.querySelector('h1, .product-title, .product-name')?.textContent.trim();
    const priceElement = document.querySelector('.price, .product-price, [itemprop="price"]');
    const image = document.querySelector('.product-image img, [itemprop="image"]')?.src;

    if (!title || !priceElement) return null;

    const priceText = priceElement.textContent || priceElement.getAttribute('content');
    const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));

    return {
      site: 'generic',
      id: window.location.pathname,
      title,
      price,
      currency: this.detectCurrency(),
      url: window.location.href,
      image,
      timestamp: Date.now()
    };
  }

  getAsinFromUrl() {
    const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }

  detectCurrency() {
    const hostname = window.location.hostname;
    if (hostname.includes('.it')) return 'EUR';
    if (hostname.includes('.co.uk')) return 'GBP';
    if (hostname.includes('.de')) return 'EUR';
    if (hostname.includes('.com')) return 'USD';
    return 'EUR';
  }

  async savePrice() {
    const productInfo = this.extractProductInfo();
    if (!productInfo) {
      console.log('Price Reality Check: Could not extract product info');
      return;
    }

    this.productInfo = productInfo;

    // Send to background script for storage
    chrome.runtime.sendMessage({
      action: 'savePrice',
      data: productInfo
    });

    // Check if price is good
    chrome.runtime.sendMessage({
      action: 'checkPrice',
      data: productInfo
    }, (response) => {
      if (response && response.alert) {
        this.showPriceAlert(response);
      }
    });
  }

  showPriceAlert(alertData) {
    // Create alert banner
    const existingAlert = document.getElementById('price-check-alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.id = 'price-check-alert';
    alert.className = 'price-check-alert';
    
    let message = '';
    let alertClass = '';

    if (alertData.isPriceTooHigh) {
      message = `⚠️ You might be paying too much! Historical average: ${alertData.currency}${alertData.averagePrice.toFixed(2)}`;
      alertClass = 'price-check-alert-warning';
    } else if (alertData.isGoodPrice) {
      message = `✅ Good price! Below average by ${alertData.priceDifference}%`;
      alertClass = 'price-check-alert-success';
    } else {
      message = `ℹ️ Price tracking started. Check back later for history.`;
      alertClass = 'price-check-alert-info';
    }

    alert.className += ' ' + alertClass;
    alert.innerHTML = `
      <div class="price-check-alert-content">
        <span>${message}</span>
        <button class="price-check-alert-close">×</button>
      </div>
    `;

    document.body.insertBefore(alert, document.body.firstChild);

    alert.querySelector('.price-check-alert-close').addEventListener('click', () => {
      alert.remove();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (alert.parentNode) alert.remove();
    }, 10000);
  }
}

// Initialize detector when page loads
const detector = new PriceDetector();

// Wait for page to load completely
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => detector.savePrice(), 1000);
  });
} else {
  setTimeout(() => detector.savePrice(), 1000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentProduct') {
    const productInfo = detector.extractProductInfo();
    sendResponse({ product: productInfo });
  }
  return true;
});
