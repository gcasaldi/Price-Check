// Popup UI logic

let currentProduct = null;
let currentProductId = null;

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load tab data
    if (tabName === 'wishlist') {
      loadWishlist();
    } else if (tabName === 'settings') {
      loadSettings();
    }
  });
});

// Load current product
async function loadCurrentProduct() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'getCurrentProduct' }, async (response) => {
      if (chrome.runtime.lastError || !response || !response.product) {
        document.getElementById('no-product').style.display = 'block';
        document.getElementById('product-info').style.display = 'none';
        return;
      }

      currentProduct = response.product;
      currentProductId = generateProductId(currentProduct);
      
      // Show product info
      document.getElementById('no-product').style.display = 'none';
      document.getElementById('product-info').style.display = 'block';
      
      // Update UI
      if (currentProduct.image) {
        document.getElementById('product-image').src = currentProduct.image;
      }
      document.getElementById('product-title').textContent = currentProduct.title;
      document.getElementById('product-site').textContent = currentProduct.site.toUpperCase();
      document.getElementById('product-price').textContent = `${currentProduct.currency} ${currentProduct.price.toFixed(2)}`;
      
      // Load price history
      await loadPriceHistory();
      
      // Check if in wishlist
      checkWishlistStatus();
    });
  } catch (error) {
    console.error('Error loading product:', error);
  }
}

async function loadPriceHistory() {
  chrome.runtime.sendMessage({
    action: 'getPriceHistory',
    productId: currentProductId
  }, (response) => {
    if (response && response.history) {
      displayPriceHistory(response.history);
    }
  });
}

function displayPriceHistory(history) {
  document.getElementById('track-count').textContent = history.length;
  
  if (history.length === 0) {
    document.getElementById('current-price').textContent = `${currentProduct.currency} ${currentProduct.price.toFixed(2)}`;
    document.getElementById('average-price').textContent = '-';
    document.getElementById('lowest-price').textContent = '-';
    document.getElementById('highest-price').textContent = '-';
    document.getElementById('price-verdict').innerHTML = '<p class="info">ℹ️ Start tracking to see price analysis</p>';
    return;
  }
  
  const prices = history.map(h => h.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currency = currentProduct.currency;
  
  document.getElementById('current-price').textContent = `${currency} ${currentProduct.price.toFixed(2)}`;
  document.getElementById('average-price').textContent = `${currency} ${avgPrice.toFixed(2)}`;
  document.getElementById('lowest-price').textContent = `${currency} ${minPrice.toFixed(2)}`;
  document.getElementById('highest-price').textContent = `${currency} ${maxPrice.toFixed(2)}`;
  
  // Verdict
  const priceDiff = ((currentProduct.price - avgPrice) / avgPrice) * 100;
  let verdictHTML = '';
  
  if (priceDiff > 10) {
    verdictHTML = `<p class="warning">⚠️ You might be paying too much! Price is ${priceDiff.toFixed(1)}% above average.</p>`;
  } else if (priceDiff < -5) {
    verdictHTML = `<p class="success">✅ Great deal! Price is ${Math.abs(priceDiff).toFixed(1)}% below average.</p>`;
  } else {
    verdictHTML = `<p class="info">ℹ️ Price is close to average (${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(1)}%).</p>`;
  }
  
  document.getElementById('price-verdict').innerHTML = verdictHTML;
  
  // Draw chart
  drawChart(history);
}

function drawChart(history) {
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  if (history.length < 2) {
    ctx.fillStyle = '#999';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Not enough data to show chart', width / 2, height / 2);
    return;
  }
  
  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // Draw axes
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  
  // Draw price line
  ctx.strokeStyle = '#228be6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  history.forEach((point, index) => {
    const x = padding + (index / (history.length - 1)) * chartWidth;
    const y = height - padding - ((point.price - minPrice) / priceRange) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Draw points
  ctx.fillStyle = '#228be6';
  history.forEach((point, index) => {
    const x = padding + (index / (history.length - 1)) * chartWidth;
    const y = height - padding - ((point.price - minPrice) / priceRange) * chartHeight;
    
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw labels
  ctx.fillStyle = '#666';
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(maxPrice.toFixed(2), padding - 5, padding + 5);
  ctx.fillText(minPrice.toFixed(2), padding - 5, height - padding + 5);
}

async function checkWishlistStatus() {
  chrome.runtime.sendMessage({ action: 'getWishlist' }, (response) => {
    if (response && response.wishlist && response.wishlist[currentProductId]) {
      document.getElementById('add-to-wishlist').style.display = 'none';
      document.getElementById('remove-from-wishlist').style.display = 'block';
    } else {
      document.getElementById('add-to-wishlist').style.display = 'block';
      document.getElementById('remove-from-wishlist').style.display = 'none';
    }
  });
}

// Wishlist actions
document.getElementById('add-to-wishlist').addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'addToWishlist',
    data: currentProduct
  }, (response) => {
    if (response && response.success) {
      checkWishlistStatus();
      alert('Added to wishlist! You will be notified when the price drops.');
    }
  });
});

document.getElementById('remove-from-wishlist').addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'removeFromWishlist',
    productId: currentProductId
  }, (response) => {
    if (response && response.success) {
      checkWishlistStatus();
    }
  });
});

// Load wishlist
async function loadWishlist() {
  chrome.runtime.sendMessage({ action: 'getWishlist' }, (response) => {
    if (!response || !response.wishlist) return;
    
    const wishlist = response.wishlist;
    const items = Object.entries(wishlist);
    
    if (items.length === 0) {
      document.getElementById('wishlist-empty').style.display = 'block';
      document.getElementById('wishlist-items').innerHTML = '';
      return;
    }
    
    document.getElementById('wishlist-empty').style.display = 'none';
    
    const html = items.map(([id, item]) => `
      <div class="wishlist-item">
        <img src="${item.image || 'icons/icon48.png'}" alt="${item.title}">
        <div class="wishlist-item-info">
          <h4>${item.title}</h4>
          <p class="small">${item.site.toUpperCase()}</p>
          <p>Current: ${item.currency} ${item.price.toFixed(2)} | Target: ${item.currency} ${item.targetPrice.toFixed(2)}</p>
          <div class="wishlist-item-actions">
            <a href="${item.url}" target="_blank" class="btn-link">View Product</a>
            <button class="btn-link remove-wishlist-item" data-id="${id}">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
    
    document.getElementById('wishlist-items').innerHTML = html;
    
    // Add remove handlers
    document.querySelectorAll('.remove-wishlist-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = btn.dataset.id;
        chrome.runtime.sendMessage({
          action: 'removeFromWishlist',
          productId
        }, () => {
          loadWishlist();
        });
      });
    });
  });
}

// Load settings
async function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response && response.settings) {
      document.getElementById('alerts-enabled').checked = response.settings.alertsEnabled;
      document.getElementById('price-threshold').value = response.settings.priceThreshold;
    }
  });
}

// Save settings
document.getElementById('alerts-enabled').addEventListener('change', (e) => {
  chrome.runtime.sendMessage({
    action: 'getSettings'
  }, (response) => {
    const settings = response.settings;
    settings.alertsEnabled = e.target.checked;
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings
    });
  });
});

document.getElementById('price-threshold').addEventListener('change', (e) => {
  chrome.runtime.sendMessage({
    action: 'getSettings'
  }, (response) => {
    const settings = response.settings;
    settings.priceThreshold = parseInt(e.target.value);
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings
    });
  });
});

document.getElementById('clear-data').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all price tracking data? This cannot be undone.')) {
    chrome.storage.local.clear(() => {
      alert('All data cleared.');
      window.location.reload();
    });
  }
});

// Helper function
function generateProductId(productInfo) {
  return `${productInfo.site}_${productInfo.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Initialize
loadCurrentProduct();
