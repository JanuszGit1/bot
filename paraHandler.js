const fs = require('fs');
const path = require('path');
const { getRandomPair, getMatchPercentage, generateShipName } = require('./paraUtils.js');

// Ścieżki do plików
const usersPath = path.join(__dirname, 'data.json');
const historyPath = path.join(__dirname, 'paraHistory.json');

let activeStories = {}; // Trzyma kontynuacje fabuł
let historyCache = {}; // Cache historii w pamięci

// Funkcja do wczytania użytkowników z pliku
function loadUsersFromFile() {
  if (!fs.existsSync(usersPath)) {
    console.log("[ERROR] Plik data.json nie istnieje.");
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    if (data && Array.isArray(data.members)) {
      return data.members;  // Zakładając, że członkowie są zapisani pod kluczem 'members'
    } else {
      console.log("[ERROR] Plik data.json ma nieprawidłową strukturę.");
      return [];
    }
  } catch (error) {
    console.error("[ERROR] Błąd podczas wczytywania pliku data.json:", error);
    return [];
  }
}

// Funkcja do wyboru innego użytkownika z listy
function getRandomOtherUser(users, excludeUser) {
  const filteredUsers = users.filter(u => u.toLowerCase() !== excludeUser.toLowerCase());
  if (filteredUsers.length === 0) return null;
  return filteredUsers[Math.floor(Math.random() * filteredUsers.length)];
}

// Główna funkcja obsługująca komendę !para
async function handleParaCommand(messageText, sender, sendMessage) {
  if (!messageText || typeof messageText !== 'string') {
    console.error("[ERROR] Argument 'text' musi być łańcuchem znaków!");
    return;
  }

  let nsfw = false;
  let target = null;
  const cleanText = messageText.toLowerCase();

  if (cleanText.includes('+18')) nsfw = true;

  const mentionMatch = messageText.match(/@([^\n]+)/);  // <--- Nowe: pełna nazwa po @
  if (mentionMatch) {
    target = mentionMatch[1].trim();
  }

  const allUsers = loadUsersFromFile();
  if (allUsers.length < 2) {
    await sendMessage("❌ Za mało użytkowników, żeby stworzyć parę!");
    return;
  }

  let person1, person2;

  if (target && (target.toLowerCase() === 'ja' || target.toLowerCase() === sender.toLowerCase())) {
    person1 = sender;
    person2 = getRandomOtherUser(allUsers, sender);
  } else if (target) {
    const targetUser = allUsers.find(u => u.toLowerCase().trim() === target.toLowerCase().trim());
    if (!targetUser) {
      await sendMessage(`❌ Użytkownik "@${target}" nie znajduje się w systemie.`);
      return;
    }
    person1 = targetUser;
    person2 = getRandomOtherUser(allUsers, targetUser);
  } else {
    [person1, person2] = getRandomPair(allUsers.filter(u => u !== sender));
  }

  if (!person1 || !person2) {
    await sendMessage("❌ Nie udało się dobrać pary.");
    return;
  }

  const storyId = `${person1.toLowerCase()}-${person2.toLowerCase()}`;
  if (activeStories[storyId]) {
    await sendMessage("❌ Ta para już rozpoczęła swoją historię!");
    return;
  }

  const pastHistory = loadHistory();
  if (pastHistory[storyId]) {
    await sendMessage("❌ Ta para ma już zakończoną historię.");
    return;
  }

  const percent = getMatchPercentage();
  const shipName = generateShipName(person1, person2);
  const reaction = paraTexts.getReaction(percent, nsfw);
  const intro = paraTexts.getIntro(nsfw);

  activeStories[storyId] = {
    step: 0,
    pair: [person1, person2],
    nsfw,
    percent,
    shipName
  };

  await sendMessage(`❤️ Dopasowanie: *${person1} + ${person2} = ${shipName}* (${percent}%)\n${reaction}\n${intro}`);
  await sendStorySegment(storyId, sendMessage);
}

// Funkcja obsługująca kontynuację historii
async function handleStoryContinuation(sender, messageText, sendMessage) {
  const story = Object.entries(activeStories).find(([_, s]) => s.pair.includes(sender));
  if (!story) return;

  const [storyId, data] = story;
  const options = paraTexts.getStoryStep(data.step, data.nsfw);
  if (!options) return;

  const lowerMsg = messageText.toLowerCase();
  const matched = options.choices.find(c => lowerMsg.includes(c.key));
  if (!matched) return;

  data.step++;
  await sendMessage(`📖 ${matched.result}`);

  if (data.step >= paraTexts.totalSteps()) {
    await sendMessage("🎉 Historia tej pary dobiegła końca... może kiedyś wróci?\nZapisuję do historii ❤️");
    saveToHistory(data);
    delete activeStories[storyId];
  } else {
    await sendStorySegment(storyId, sendMessage);
  }
}

// Funkcja do wysyłania segmentu fabuły
async function sendStorySegment(storyId, sendMessage) {
  const story = activeStories[storyId];
  const options = paraTexts.getStoryStep(story.step, story.nsfw);
  if (!options) return;

  let msg = `\n${options.text}\nWybierz:`;
  options.choices.forEach(c => msg += `\n- ${c.label}`);
  await sendMessage(msg);
}

// Funkcja zapisująca historię pary
function saveToHistory(data) {
  let db = loadHistory();  // Załaduj historię bezpośrednio przed zapisaniem

  const key = `${data.pair[0]} & ${data.pair[1]}`;
  db[key] = {
    percent: data.percent,
    shipName: data.shipName,
    timestamp: new Date().toISOString(),
    steps: data.step
  };

  try {
    fs.writeFileSync(historyPath, JSON.stringify(db, null, 2));
    historyCache = db; // Aktualizacja cache
  } catch (error) {
    console.error("Błąd podczas zapisywania historii:", error);
    // Dodatkowe próby zapisu, np. z opóźnieniem:
    let attempts = 0;
    while (attempts < 3) {
      try {
        fs.writeFileSync(historyPath, JSON.stringify(db, null, 2));
        historyCache = db;
        break;
      } catch (error) {
        attempts++;
        if (attempts === 3) {
          console.error("Błąd zapisu historii po trzech próbach:", error);
        }
      }
    }
  }
}

// Funkcja do ładowania historii z pliku
function loadHistory() {
  // Sprawdzanie pamięci cache
  if (Object.keys(historyCache).length > 0) {
    return historyCache;
  }

  try {
    if (fs.existsSync(historyPath)) {
      const raw = fs.readFileSync(historyPath, 'utf8');
	if (!raw.trim()) return {}; // jeśli plik pusty
	return JSON.parse(raw);
    }
    return {};  // Jeśli plik nie istnieje, zwróć pusty obiekt
  } catch (error) {
    console.error("Błąd podczas ładowania historii:", error);
    return {};  // Zwróć pusty obiekt w przypadku błędu
  }
}

// Nowa funkcja do przeglądania historii par
async function viewHistory(sender, sendMessage) {
  let db = loadHistory();
  const userHistory = Object.entries(db).filter(([key, _]) => key.includes(sender.toLowerCase()));

  if (userHistory.length === 0) {
    await sendMessage("❌ Brak historii dla tego użytkownika.");
    return;
  }

  let msg = `📜 Historia dla ${sender}:\n`;
  userHistory.forEach(([key, value]) => {
    msg += `\n- ${key} (${value.shipName}) - ${value.percent}% dopasowanie - ${new Date(value.timestamp).toLocaleString()}`;
  });

  await sendMessage(msg);
}

module.exports = {
  handleParaCommand,
  handleStoryContinuation,
  viewHistory
};
