const STORAGE_KEYS = {
  history: "priceHistoryByProduct",
  wishlist: "wishlistByProduct",
  alerts: "alerts"
};

const MAX_HISTORY_PER_PRODUCT = 120;
const ALERT_ALARM_NAME = "price-check-wishlist-scan";

chrome.runtime.onInstalled.addListener(async () => {
  chrome.alarms.create(ALERT_ALARM_NAME, { periodInMinutes: 180 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALERT_ALARM_NAME, { periodInMinutes: 180 });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "PRICE_SNAPSHOT") {
    upsertSnapshot(message.payload).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "GET_PRODUCT_SUMMARY") {
    getProductSummary(message.productKey).then((summary) => sendResponse(summary));
    return true;
  }

  if (message.type === "TOGGLE_WISHLIST") {
    toggleWishlist(message.productKey, message.meta).then((result) => sendResponse(result));
    return true;
  }

  if (message.type === "SET_WISHLIST_TARGET") {
    setWishlistTarget(message.productKey, message.targetPrice).then((result) => sendResponse(result));
    return true;
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALERT_ALARM_NAME) return;
  await runWishlistScan();
});

function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

function setStorage(payload) {
  return chrome.storage.local.set(payload);
}

function normalizeHistoryRecord(payload) {
  return {
    productKey: payload.productKey,
    site: payload.site || "generic",
    url: payload.url,
    title: payload.title || payload.url,
    price: Number(payload.price),
    currency: payload.currency || "EUR",
    capturedAt: payload.capturedAt || new Date().toISOString()
  };
}

function shouldAppend(last, next) {
  if (!last) return true;

  const samePrice = Math.abs(Number(last.price) - Number(next.price)) < 0.0001;
  const lastTime = new Date(last.capturedAt).getTime();
  const nextTime = new Date(next.capturedAt).getTime();
  const sixHours = 6 * 60 * 60 * 1000;

  if (!samePrice) return true;
  return nextTime - lastTime >= sixHours;
}

async function upsertSnapshot(payload) {
  if (!payload || !payload.productKey || !payload.price) return;

  const next = normalizeHistoryRecord(payload);
  const { [STORAGE_KEYS.history]: historyByProduct = {} } = await getStorage([STORAGE_KEYS.history]);
  const existing = historyByProduct[next.productKey] || [];
  const last = existing[existing.length - 1];

  if (!shouldAppend(last, next)) return;

  const updated = [...existing, next].slice(-MAX_HISTORY_PER_PRODUCT);
  historyByProduct[next.productKey] = updated;

  await setStorage({ [STORAGE_KEYS.history]: historyByProduct });
  await evaluateWishlistAlert(next.productKey, next);
}

function computeStats(history) {
  if (!history || history.length === 0) {
    return null;
  }

  const prices = history.map((item) => Number(item.price)).filter((value) => Number.isFinite(value));
  if (prices.length === 0) return null;

  const current = prices[prices.length - 1];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, v) => sum + v, 0) / prices.length;

  const overMinPct = min > 0 ? ((current - min) / min) * 100 : 0;
  const overAvgPct = avg > 0 ? ((current - avg) / avg) * 100 : 0;
  const tooMuch = overMinPct >= 15 || overAvgPct >= 10;

  return {
    current,
    min,
    max,
    avg,
    samples: prices.length,
    overMinPct,
    overAvgPct,
    tooMuch
  };
}

async function getProductSummary(productKey) {
  const { [STORAGE_KEYS.history]: historyByProduct = {}, [STORAGE_KEYS.wishlist]: wishlist = {}, [STORAGE_KEYS.alerts]: alerts = [] } = await getStorage([
    STORAGE_KEYS.history,
    STORAGE_KEYS.wishlist,
    STORAGE_KEYS.alerts
  ]);

  const history = historyByProduct[productKey] || [];
  const stats = computeStats(history);
  const wishlistItem = wishlist[productKey] || null;
  const recentAlerts = alerts.filter((item) => item.productKey === productKey).slice(-5).reverse();

  return {
    history,
    stats,
    wishlistItem,
    recentAlerts
  };
}

async function toggleWishlist(productKey, meta = {}) {
  const { [STORAGE_KEYS.wishlist]: wishlist = {} } = await getStorage([STORAGE_KEYS.wishlist]);
  const exists = Boolean(wishlist[productKey]);

  if (exists) {
    delete wishlist[productKey];
  } else {
    wishlist[productKey] = {
      productKey,
      title: meta.title || productKey,
      url: meta.url,
      site: meta.site || "generic",
      targetPrice: null,
      createdAt: new Date().toISOString()
    };
  }

  await setStorage({ [STORAGE_KEYS.wishlist]: wishlist });
  return { inWishlist: !exists, item: wishlist[productKey] || null };
}

async function setWishlistTarget(productKey, targetPrice) {
  const nextTarget = Number(targetPrice);
  const { [STORAGE_KEYS.wishlist]: wishlist = {} } = await getStorage([STORAGE_KEYS.wishlist]);
  const item = wishlist[productKey];

  if (!item) return { ok: false, reason: "not-in-wishlist" };
  if (!Number.isFinite(nextTarget) || nextTarget <= 0) return { ok: false, reason: "invalid-target" };

  item.targetPrice = nextTarget;
  item.updatedAt = new Date().toISOString();
  wishlist[productKey] = item;
  await setStorage({ [STORAGE_KEYS.wishlist]: wishlist });

  return { ok: true, item };
}

async function evaluateWishlistAlert(productKey, latestRecord) {
  const { [STORAGE_KEYS.wishlist]: wishlist = {}, [STORAGE_KEYS.history]: historyByProduct = {}, [STORAGE_KEYS.alerts]: alerts = [] } = await getStorage([
    STORAGE_KEYS.wishlist,
    STORAGE_KEYS.history,
    STORAGE_KEYS.alerts
  ]);

  const item = wishlist[productKey];
  if (!item) return;

  const history = historyByProduct[productKey] || [];
  if (history.length === 0) return;

  const stats = computeStats(history);
  const current = Number(latestRecord.price);

  let reason = null;
  if (item.targetPrice && current <= item.targetPrice) {
    reason = `Prezzo sotto target (${item.targetPrice.toFixed(2)})`;
  } else if (stats && stats.overMinPct <= 5) {
    reason = "Prezzo vicino al minimo storico";
  }

  if (!reason) return;

  const alert = {
    id: `${productKey}-${Date.now()}`,
    productKey,
    title: item.title || latestRecord.title,
    price: current,
    currency: latestRecord.currency || "EUR",
    reason,
    createdAt: new Date().toISOString()
  };

  const updatedAlerts = [...alerts, alert].slice(-200);
  await setStorage({ [STORAGE_KEYS.alerts]: updatedAlerts });

  if (chrome.notifications) {
    chrome.notifications.create(alert.id, {
      type: "basic",
      iconUrl: "icon.png",
      title: "Price Check Alert",
      message: `${alert.title} - ${reason}`,
      priority: 2
    });
  }
}

async function runWishlistScan() {
  const { [STORAGE_KEYS.wishlist]: wishlist = {} } = await getStorage([STORAGE_KEYS.wishlist]);
  const items = Object.values(wishlist);
  for (const item of items) {
    if (!item.url) continue;
    try {
      const parsed = await fetchAndExtractPrice(item.url, item.site);
      if (!parsed || !parsed.price) continue;

      await upsertSnapshot({
        productKey: item.productKey,
        url: item.url,
        site: item.site,
        title: parsed.title || item.title,
        price: parsed.price,
        currency: parsed.currency,
        capturedAt: new Date().toISOString()
      });
    } catch {
    }
  }
}

async function fetchAndExtractPrice(url, siteHint = "generic") {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) return null;

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const site = detectSiteFromUrl(url, siteHint);

  if (site === "amazon") {
    return {
      title: findText(doc, ["#productTitle", "#title"]) || doc.title,
      price: parsePrice(findText(doc, [".a-price .a-offscreen", "#priceblock_ourprice", "#priceblock_dealprice"])),
      currency: detectCurrency(findText(doc, [".a-price .a-offscreen", "#priceblock_ourprice", "#priceblock_dealprice"]))
    };
  }

  if (site === "booking") {
    return {
      title: findText(doc, ["h2", "h1"]) || doc.title,
      price: parsePrice(findText(doc, ["[data-testid='price-and-discounted-price']", ".prco-valign-middle-helper", "span[class*='price']"])),
      currency: detectCurrency(findText(doc, ["[data-testid='price-and-discounted-price']", ".prco-valign-middle-helper", "span[class*='price']"]))
    };
  }

  const rawPrice = findText(doc, ["[itemprop='price']", ".price", "[class*='price']"]);
  return {
    title: findText(doc, ["h1", "title"]) || doc.title,
    price: parsePrice(rawPrice),
    currency: detectCurrency(rawPrice)
  };
}

function detectSiteFromUrl(url, siteHint) {
  if (siteHint && siteHint !== "generic") return siteHint;
  try {
    const host = new URL(url).hostname;
    if (/amazon\./i.test(host)) return "amazon";
    if (/booking\.com$/i.test(host)) return "booking";
  } catch {
  }
  return "generic";
}

function findText(doc, selectors) {
  for (const selector of selectors) {
    const node = doc.querySelector(selector);
    if (node && node.textContent && node.textContent.trim()) {
      return node.textContent.trim();
    }
  }
  return null;
}

function detectCurrency(text) {
  if (!text) return "EUR";
  if (/\$/.test(text)) return "USD";
  if (/£/.test(text)) return "GBP";
  if (/€/.test(text)) return "EUR";
  return "EUR";
}

function parsePrice(value) {
  if (!value) return null;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }

  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}