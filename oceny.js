const fs = require('fs');
const path = require('path');

// Ścieżka do pliku z ocenami
const ocenyFilePath = path.join(__dirname, 'ocena.json');

// Ładowanie ocen z pliku
function loadOceny() {
  if (fs.existsSync(ocenyFilePath)) {
    const rawData = fs.readFileSync(ocenyFilePath);
    return JSON.parse(rawData);
  } else {
    return {};
  }
}

// Zapisywanie ocen
function saveOceny(oceny) {
  fs.writeFileSync(ocenyFilePath, JSON.stringify(oceny, null, 2));
}

// Obliczanie średniej
function obliczSredniaOcene(komenda) {
  const oceny = loadOceny();

  if (oceny[komenda] && oceny[komenda].length > 0) {
    const sum = oceny[komenda].reduce((total, ocena) => {
      const ocenaNumer = parseInt(ocena.ocena.split('/')[0], 10);
      return total + ocenaNumer;
    }, 0);
    return (sum / oceny[komenda].length).toFixed(2);
  } else {
    return null;
  }
}

// Sprawdzenie czy użytkownik już ocenił
function sprawdzCzyOceniono(komenda, userID) {
  const oceny = loadOceny();
  return oceny[komenda]?.some(o => o.userID === userID) || false;
}

// Dodanie / Usunięcie / Wyświetlenie oceny
async function handleOcenKomenda(currentText, userID, userName, sendMessage) {
  const parts = currentText.trim().split(' ');

  if (parts.length === 3 && /^([1-5])\/5$/.test(parts[2])) {
    // !oceń <komenda> <ocena>
    const komenda = parts[1].replace(/^!/, '');
    const ocena = parts[2];

    if (sprawdzCzyOceniono(komenda, userID)) {
      return await sendMessage(`Już oceniłeś komendę !${komenda}.`);
    }

    const oceny = loadOceny();
    if (!oceny[komenda]) oceny[komenda] = [];

    oceny[komenda].push({
      ocena,
      userID,
      userName,
      data: new Date().toISOString(),
    });

    saveOceny(oceny);
    const srednia = obliczSredniaOcene(komenda);
    return await sendMessage(`Dodano ocenę ${ocena} dla !${komenda} przez ${userName}. Średnia: ${srednia}/5`);

  } else if (parts.length === 3 && parts[1] === 'usuń') {
    // !oceń usuń <komenda>
    const komenda = parts[2].replace(/^!/, '');
    const oceny = loadOceny();

    if (!oceny[komenda]) return await sendMessage(`Brak ocen dla !${komenda}.`);

    const oryginalnaDlugosc = oceny[komenda].length;
    oceny[komenda] = oceny[komenda].filter(o => o.userID !== userID);

    if (oceny[komenda].length === oryginalnaDlugosc) {
      return await sendMessage(`Nie masz oceny dla komendy !${komenda}.`);
    }

    saveOceny(oceny);
    return await sendMessage(`Usunięto Twoją ocenę dla !${komenda}.`);

  } else if (parts.length === 3 && parts[1] === 'pokaż') {
    // !oceń pokaż <komenda>
    const komenda = parts[2].replace(/^!/, '');
    const oceny = loadOceny();

    if (!oceny[komenda] || oceny[komenda].length === 0) {
      return await sendMessage(`Brak ocen dla komendy !${komenda}.`);
    }

    let wynik = `📊 Oceny dla !${komenda}:\n`;
    oceny[komenda].forEach((ocena, i) => {
      wynik += `${i + 1}. ${ocena.ocena} — ${ocena.userName} (${ocena.data})\n`;
    });

    const srednia = obliczSredniaOcene(komenda);
    wynik += `Średnia: ${srednia}/5`;
    return await sendMessage(wynik);
  }

  // Niepoprawny format
  return await sendMessage(`Niepoprawne użycie. Poprawny format:\n` +
    `- !oceń <komenda> <ocena> (np. !oceń prognoza 5/5)\n` +
    `- !oceń usuń <komenda>\n` +
    `- !oceń pokaż <komenda>`);
}

// Eksport
module.exports = { handleOcenKomenda };
