(function initPriceCheckContent() {
  const MIN_PRICE = 0.01;

  function siteFromHost(host) {
    if (/amazon\./i.test(host)) return "amazon";
    if (/booking\.com$/i.test(host)) return "booking";
    return "generic";
  }

  function normalizePrice(raw) {
    if (!raw) return null;

    const cleaned = String(raw)
      .replace(/\s/g, "")
      .replace(/[^\d.,-]/g, "");

    if (!cleaned) return null;

    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");

    let normalized = cleaned;
    if (hasComma && hasDot) {
      const lastComma = cleaned.lastIndexOf(",");
      const lastDot = cleaned.lastIndexOf(".");
      if (lastComma > lastDot) {
        normalized = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = cleaned.replace(/,/g, "");
      }
    } else if (hasComma && !hasDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }

    const value = Number.parseFloat(normalized);
    if (!Number.isFinite(value) || value < MIN_PRICE) return null;
    return value;
  }

  function pickText(selectors, root = document) {
    for (const selector of selectors) {
      const el = root.querySelector(selector);
      if (el && el.textContent && el.textContent.trim()) {
        return el.textContent.trim();
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

  function extractAmazon() {
    const title =
      pickText(["#productTitle", "#title", "h1.a-size-large"]) ||
      document.title;

    const priceText = pickText([
      "#corePrice_feature_div .a-offscreen",
      ".a-price .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      "#price_inside_buybox"
    ]);

    const price = normalizePrice(priceText);
    if (!price) return null;

    return {
      title,
      price,
      currency: detectCurrency(priceText)
    };
  }

  function extractBooking() {
    const title =
      pickText(["h2", "h1[data-testid='title']", "#hp_hotel_name"]) ||
      document.title;

    const priceText = pickText([
      "[data-testid='price-and-discounted-price']",
      "[data-testid='price-for-x-nights']",
      ".prco-valign-middle-helper",
      "span[class*='price']"
    ]);

    const price = normalizePrice(priceText);
    if (!price) return null;

    return {
      title,
      price,
      currency: detectCurrency(priceText)
    };
  }

  function extractGeneric() {
    const title =
      pickText([
        "h1",
        "meta[property='og:title']",
        "meta[name='twitter:title']"
      ]) || document.title;

    let priceText = pickText([
      "[itemprop='price']",
      "meta[property='product:price:amount']",
      ".price",
      "[class*='price']",
      "[data-price]"
    ]);

    if (!priceText) {
      const body = document.body ? document.body.textContent || "" : "";
      const m = body.match(/(€|\$|£)\s?\d+[\d.,]*/);
      priceText = m ? m[0] : null;
    }

    const price = normalizePrice(priceText);
    if (!price) return null;

    return {
      title,
      price,
      currency: detectCurrency(priceText)
    };
  }

  function extractForCurrentPage() {
    const host = window.location.hostname;
    const site = siteFromHost(host);

    if (site === "amazon") {
      const data = extractAmazon();
      return data ? { site, ...data } : null;
    }
    if (site === "booking") {
      const data = extractBooking();
      return data ? { site, ...data } : null;
    }

    const genericData = extractGeneric();
    if (!genericData) return null;
    return { site, ...genericData };
  }

  function stableProductKey(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      const cleanPath = parsed.pathname.replace(/\/$/, "") || "/";
      return `${parsed.hostname}${cleanPath}`;
    } catch {
      return url;
    }
  }

  function shouldTrackPage() {
    const host = window.location.hostname;
    return /amazon\./i.test(host) || /booking\.com$/i.test(host) || /shop|store|product|hotel|booking/i.test(window.location.href);
  }

  function sendSnapshot() {
    if (!shouldTrackPage()) return;

    const extracted = extractForCurrentPage();
    if (!extracted || !extracted.price) return;

    chrome.runtime.sendMessage({
      type: "PRICE_SNAPSHOT",
      payload: {
        ...extracted,
        url: window.location.href,
        productKey: stableProductKey(window.location.href),
        capturedAt: new Date().toISOString()
      }
    });
  }

  setTimeout(sendSnapshot, 1200);
})();