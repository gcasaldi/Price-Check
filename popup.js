function currencyFormatter(currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  });
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

function siteFromHost(host) {
  if (/amazon\./i.test(host)) return "Amazon";
  if (/booking\.com$/i.test(host)) return "Booking";
  return "E-commerce";
}

function message(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

function drawChart(canvas, history) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!history || history.length < 2) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.fillText("Storico insufficiente", 10, 20);
    return;
  }

  const prices = history.map((item) => Number(item.price)).filter(Number.isFinite);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 0.0001);

  const padding = 16;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  ctx.beginPath();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;

  prices.forEach((value, index) => {
    const x = padding + (index / (prices.length - 1)) * chartW;
    const y = padding + ((max - value) / range) * chartH;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function renderStats(container, stats, currency) {
  if (!stats) {
    container.innerHTML = "<span>Nessun dato</span>";
    return;
  }

  const fmt = currencyFormatter(currency);
  container.innerHTML = [
    `Attuale: ${fmt.format(stats.current)}`,
    `Min: ${fmt.format(stats.min)}`,
    `Max: ${fmt.format(stats.max)}`,
    `Media: ${fmt.format(stats.avg)}`,
    `Campioni: ${stats.samples}`,
    `Sopra minimo: ${stats.overMinPct.toFixed(1)}%`
  ]
    .map((line) => `<span>${line}</span>`)
    .join("");
}

function renderVerdict(el, stats) {
  if (!stats) {
    el.textContent = "Raccogliendo dati...";
    el.className = "verdict neutral";
    return;
  }

  if (stats.tooMuch) {
    el.textContent = "⚠️ Stai pagando troppo";
    el.className = "verdict warn";
  } else {
    el.textContent = "✅ Prezzo competitivo";
    el.className = "verdict good";
  }
}

function renderAlerts(el, alerts, currency) {
  el.innerHTML = "";
  if (!alerts || alerts.length === 0) {
    el.innerHTML = "<li>Nessun alert recente</li>";
    return;
  }

  const fmt = currencyFormatter(currency);
  for (const alert of alerts) {
    const item = document.createElement("li");
    item.textContent = `${fmt.format(alert.price)} - ${alert.reason}`;
    el.appendChild(item);
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function init() {
  const tab = await getActiveTab();
  if (!tab || !tab.url) return;

  const productKey = stableProductKey(tab.url);
  const host = new URL(tab.url).hostname;
  const siteName = siteFromHost(host);

  const siteLabel = document.getElementById("siteLabel");
  const titleEl = document.getElementById("title");
  const currentPriceEl = document.getElementById("currentPrice");
  const verdictEl = document.getElementById("verdict");
  const statsEl = document.getElementById("stats");
  const chartEl = document.getElementById("historyChart");
  const alertsEl = document.getElementById("alerts");
  const wishlistToggle = document.getElementById("wishlistToggle");
  const targetInput = document.getElementById("targetPrice");
  const saveTarget = document.getElementById("saveTarget");
  const wishlistStatus = document.getElementById("wishlistStatus");

  siteLabel.textContent = `Sito: ${siteName}`;

  const summary = await message("GET_PRODUCT_SUMMARY", { productKey });
  const history = summary?.history || [];
  const stats = summary?.stats || null;
  const wishlistItem = summary?.wishlistItem || null;
  const recentAlerts = summary?.recentAlerts || [];

  const latest = history[history.length - 1];
  const currency = latest?.currency || "EUR";
  const fmt = currencyFormatter(currency);

  titleEl.textContent = latest?.title || tab.title || "Prodotto";
  currentPriceEl.textContent = latest ? fmt.format(latest.price) : "-";
  renderVerdict(verdictEl, stats);
  renderStats(statsEl, stats, currency);
  drawChart(chartEl, history);
  renderAlerts(alertsEl, recentAlerts, currency);

  function refreshWishlistState(item) {
    const inWishlist = Boolean(item);
    wishlistToggle.textContent = inWishlist ? "Rimuovi dalla wishlist" : "Aggiungi in wishlist";
    wishlistStatus.textContent = inWishlist
      ? `In wishlist${item.targetPrice ? ` • target ${fmt.format(item.targetPrice)}` : ""}`
      : "Non in wishlist";
    targetInput.value = item?.targetPrice || "";
  }

  refreshWishlistState(wishlistItem);

  wishlistToggle.addEventListener("click", async () => {
    const result = await message("TOGGLE_WISHLIST", {
      productKey,
      meta: {
        title: titleEl.textContent,
        url: tab.url,
        site: siteName.toLowerCase()
      }
    });
    refreshWishlistState(result?.item || null);
  });

  saveTarget.addEventListener("click", async () => {
    const targetPrice = Number(targetInput.value);
    const result = await message("SET_WISHLIST_TARGET", {
      productKey,
      targetPrice
    });

    if (!result?.ok) {
      wishlistStatus.textContent = "Prima aggiungi alla wishlist e inserisci un target valido";
      return;
    }

    refreshWishlistState(result.item);
    wishlistStatus.textContent = "Target salvato ✅";
  });
}

init();