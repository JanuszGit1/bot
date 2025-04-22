const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// Czcionka – dynamiczny fallback
const fontPath = path.join(__dirname, 'Roboto-VariableFont_wdth,wght.ttf'); // Zamieniamy czcionkę na Roboto
let FONT_FAMILY = 'Roboto';

if (!fs.existsSync(fontPath)) {
  console.error("❌ Brak czcionki: Roboto-VariableFont_wdth,wght.ttf — używam domyślnej.");
  FONT_FAMILY = 'Arial'; // Używamy Arial, jeśli Roboto nie jest dostępne
} else {
  console.log("✅ Czcionka załadowana:", fontPath);
  registerFont(fontPath, { family: FONT_FAMILY });
}

// Losowe epitafia
const epitaphs = [
  "Tu spoczywa kod, który działał za dobrze.",
  "Niech jego bugi odpoczywają w pokoju.",
  "return null;",
  "Zginął debugując potwora.",
  "Przeszedł na drugi serwer.",
  "Nie zdążył zapisać gry.",
  "Przekroczył limit czasu życia obiektu.",
];

// Funkcja losująca epitafium
function getRandomEpitaph() {
  return epitaphs[Math.floor(Math.random() * epitaphs.length)];
}

// Funkcja do rysowania tekstu z efektem wykucia
function drawEngravedText(ctx, text, x, y, font) {
  ctx.font = font;
  ctx.textAlign = 'center';

  // Cień 1 (ciemniejszy)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillText(text, x, y + 2);

  // Cień 2 (jaśniejszy)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(text, x, y - 2);

  // Główny tekst (wycięty)
  ctx.fillStyle = '#444';
  ctx.fillText(text, x, y);
}

// Funkcja do łamania tekstu na linie (na potrzeby dużych cytatów)
function wrapEngravedText(ctx, text, x, y, maxWidth, lineHeight, font) {
  ctx.font = font;
  const words = text.split(' ');
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      drawEngravedText(ctx, line.trim(), x, y, font);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line.trim()) {
    drawEngravedText(ctx, line.trim(), x, y, font);
  }
}

async function generateTombstone({ name = 'Stanisław Mordarski', birthYear = '2000', deathYear = '2034', cause = 'zabity przez sopatę', quote = '„Życie jest piękne, ale trzeba je dobrze wykorzystać z kobietą.”', savePath = './output/tombstone.png' }) {
  // Utwórz folder, jeśli nie istnieje
  const outputDir = path.dirname(savePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const canvas = createCanvas(1024, 768);
  const ctx = canvas.getContext('2d');

  const background = await loadImage(path.join(__dirname, 'tombstone_base.png'));
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;

  try {
    // Dodajemy napis z informacjami
    drawEngravedText(ctx, 'Ś.P.', centerX, 180, `bold 42px "${FONT_FAMILY}"`);
    drawEngravedText(ctx, name.toUpperCase(), centerX, 240, `bold 50px "${FONT_FAMILY}"`);

    const dateLine = birthYear ? `${birthYear}–${deathYear}` : `${deathYear}`;
    drawEngravedText(ctx, dateLine, centerX, 290, `36px "${FONT_FAMILY}"`);

    // Przyczyna śmierci
    if (cause) {
      drawEngravedText(ctx, `☠ ${cause}`, centerX, 340, `italic 26px "${FONT_FAMILY}"`);
    }

    // Cytat
    const finalQuote = quote?.trim() || getRandomEpitaph();
    const quoteFont = finalQuote.length > 60 ? `24px "${FONT_FAMILY}"` : `28px "${FONT_FAMILY}"`;
    wrapEngravedText(ctx, finalQuote, centerX, 420, 800, 32, quoteFont);

    // Zapisz obrazek na dysku
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(savePath, buffer); // Asynchroniczny zapis
    console.log(`✅ Plik zapisany: ${savePath}`);

    return buffer; // Zwracamy buffer
  } catch (err) {
    console.error("❌ Błąd podczas generowania nagrobka:", err);
  }
}

module.exports = { generateTombstone };
