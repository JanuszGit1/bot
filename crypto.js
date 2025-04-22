const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
let coinSymbolMap = {};
let mapLoaded = false;

async function loadCoinList() {
  if (mapLoaded) return;
  try {
    console.log("[🧠] Ładuję listę kryptowalut z CoinGecko…");
    const res = await fetch("https://api.coingecko.com/api/v3/coins/list");
    const list = await res.json();
    list.forEach(c => {
      const sym = c.symbol.toLowerCase();
      coinSymbolMap[sym] = coinSymbolMap[sym] || [];
      coinSymbolMap[sym].push(c.id);
    });
    mapLoaded = true;
    console.log(`[✅] Załadowano ${list.length} pozycji.`);
  } catch (e) {
    console.error("❌ Nie udało się załadować listy monet:", e);
    mapLoaded = false;
  }
}

function getAsciiTrend(perc) {
  if (perc > 10) return "📈📈📈";
  if (perc > 3)  return "📈📈";
  if (perc > 0)  return "📈";
  if (perc === 0) return "➖";
  if (perc > -3) return "📉";
  if (perc > -10) return "📉📉";
  return "📉📉📉";
}

const preferredCoinIds = [/* … */];
function pickBestCoinId(possible) {
  return preferredCoinIds.find(p => possible.includes(p)) || possible[0];
}

async function handleCryptoCommand(text, page, sendMessage) {
  await loadCoinList();
  const m = text.match(/^!(?:crypto|kurs|krypto|cena)\s*(\S*)/i);
  if (!m) return false;

  const arg = m[1]?.toLowerCase();
  if (arg === "top") {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?" +
      "vs_currency=usd&order=market_cap_desc&per_page=10&page=1");
    const top = await res.json();
    const msg = top.map((c,i) =>
      `${i+1}. ${c.symbol.toUpperCase()} – $${c.current_price.toLocaleString()} `+
      `(${c.price_change_percentage_24h.toFixed(2)}%) ${getAsciiTrend(c.price_change_percentage_24h)}`
    ).join("\n");
    await sendMessage(page, `📊 **Top 10:**\n${msg}`);
    return true;
  }

  if (!arg) {
    await sendMessage(page, "❌ Użyj: `!crypto <symbol>` lub `!crypto top`");
    return true;
  }

  const ids = coinSymbolMap[arg] || [];
  if (!ids.length) {
    await sendMessage(page, `❌ Nie znaleziono kryptowaluty \`${arg.toUpperCase()}\`.`);
    return true;
  }

  const coinId = pickBestCoinId(ids);
  try {
    const api = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}` +
                `&vs_currencies=usd,eur,pln&include_24hr_change=true`;
    const resp = await fetch(api);
    const data = await resp.json();
    const c = data[coinId];
    if (!c) throw new Error("Brak danych");
    const { usd, eur, pln, usd_24h_change } = c;
    const fmtPLN = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
    const msg =
      `💹 **${arg.toUpperCase()}** (${coinId}):\n` +
      `• USD: $${usd.toLocaleString()}\n` +
      `• EUR: €${eur.toLocaleString()}\n` +
      `• PLN: ${fmtPLN.format(pln)}\n` +
      `• 24h: ${usd_24h_change.toFixed(2)}% ${getAsciiTrend(usd_24h_change)}`;
    await sendMessage(page, msg);
  } catch (e) {
    console.error("❌ Błąd !crypto:", e);
    await sendMessage(page, "❌ Wystąpił problem przy pobieraniu danych o kryptowalucie.");
  }
  return true;
}

module.exports = { handleCryptoCommand };
