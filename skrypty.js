const { firefox } = require('playwright');
const { getForecast } = require('./weather');
const { getCurrentWeather } = require('./weather_command');
const { getRandomMeme } = require('./mem');
const https = require('https');
const robot = require('robotjs'); // Add robotjs for clipboard handling
const { exec, execSync } = require('child_process');
const rules = require('./rules');
const { getGroupInfo } = require('./info'); // Import the function from info.js
const { getHelpMessage } = require('./pomoc');
const { handleParaCommand } = require('./parahandler.js');  // Zaimportowanie funkcji
const { getRandomPair, getMatchPercentage, generateShipName, loadUsersFromFile } = require('./paraUtils.js');
const path = require('path');
let userData = {}; // User data object
let lastMemeTime = 0;
let isBusy = false;
let lastProcessedMessageId = null;
let lastCommand = '';
let lastCommandTime = 0;
const { getUserName, saveUserData, loadUserData, updateUserNames } = require('./userUtils');
let globalTimeSetting = "1m";
const { runCommand, checkForExpiredKicks } = require('./ostrzezenia.js');
let previousResponse = "";
const { handleJokeCommand } = require('./zart.js');
const { handleLosujCommand } = require('./losuj.js');
const { handleTimeCommand } = require('./czas');
const { handleDiceRollCommand, handleDiceHistoryCommand } = require('./kostka');
const { handleCommand, handleCurrencyCommand, handleGoldCommand, handleHistoryCommand } = require('./ceny');
const { handleCoinFlipCommand, handleCoinFlipHistoryCommand } = require('./moneta');
const { handleTriviaCommand, fetchTrivia, getQuestionsHistory, addQuestionToHistory } = require('./zagadka');
const { getCorrectAnswer, loadOdpData, saveOdpData,setCorrectAnswer, clearAnswer, getLastAnswers, waitForUserAnswer } = require('./odp');
let isActiveAnswer = false;
const { handleCryptoCommand } = require('./crypto.js');
const tmp = require('tmp-promise');
const { generateTombstone } = require('./generateTombstone');
const fs = require("fs-extra");

async function getGroupMembers(page) {
    try {
        console.log("[🔍] Szukam przycisku 'Chat members'...");
        const chatMembersButton = await page.locator('span:has-text("Chat members")').first();

        console.log("[⏳] Oczekiwanie na widoczność przycisku 'Chat members'...");
        await chatMembersButton.waitFor({ state: 'visible' });
        console.log("[✅] Klikam w 'Chat members'...");
        await chatMembersButton.click();

        console.log("[✅] Otworzono panel członków grupy.");
        console.log("[⏳] Czekam na załadowanie listy członków...");
        await page.waitForSelector('[role="listitem"]');

        console.log("[✅] Lista członków załadowana!");

        const members = await page.$$eval('[role="listitem"]', listItems => {
            return listItems.map(item => {
                let text = item.innerText?.trim();
                if (!text) return null;

	const junkKeywords = [
	    'chat members',
	    'media, files and links',
	    'customise chat',
	    'group options',
	    'chat info',
	    'add people',
	    'invite',
	    'message ',
	    'privacy and support',
	    'search',
	    'notifications',
	    'shared',
	];

                const lower = text.toLowerCase();
                if (junkKeywords.some(j => lower.includes(j))) return null;

                // Jeśli imię ma np. "Jan Ceból\nGroup creator", bierzemy tylko pierwszą linię
                const name = text.split('\n')[0].trim();

                return name.length > 0 ? name : null;
            }).filter(name => name !== null);
        });

        if (members.length === 0) {
            console.warn("[⚠️] Lista członków jest pusta.");
        } else {
            console.log(`[👥] Zebrano ${members.length} członków:`);
            console.table(members);
        }

        return members;

    } catch (err) {
        console.error("[❌] Błąd podczas zbierania członków grupy:", err);
        return [];
    }
}


copyImageToClipboard(imagePath) {
  if (!fs.existsSync(imagePath)) return console.error("❌ Brak pliku:", imagePath);
  const stats = fs.statSync(imagePath);
  if (stats.size < 1024) return console.error("❌ Plik za mały:", stats.size);

  try {
    execSync(nircmd clipboard setimage "${imagePath}");
    console.log("✅ Skopiowano obraz do schowka przez nircmd");
  } catch (err) {
    console.error("❌ Błąd nircmd:", err);
  }
}

async function pasteImageWithRobot(page) {
  console.log("🕒 Czekam na focus...");
  await new Promise((r) => setTimeout(r, 3000));
  robot.setKeyboardDelay(100);
  robot.keyTap("v", ["control"]);
  await new Promise((r) => setTimeout(r, 500));
  robot.keyTap("enter");
  console.log("✅ Wklejono i wysłano przez robotjs");
}

 function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Sprawdzanie wygasłych ostrzeżeń
setInterval(() => {
    const kickedUsers = checkForExpiredKicks();
    if (kickedUsers.length > 0) {
        console.log(`Usunięto użytkowników: ${kickedUsers.join(", ")}`);
    }
}, 60000);

async function saveGroupMembersToFile(page) {
    try {
        console.log("[📋] Pobieram członków grupy...");
        const members = await getGroupMembers(page);
        
        if (!members || members.length === 0) {
            console.warn("[⚠️] Nie udało się pobrać członków grupy lub lista jest pusta.");
        } else {
            console.log(`[👥] Liczba członków w grupie: ${members.length}`);
            console.log("[💾] Zapisuję członków do data.json...");

            const data = { members };
            fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
            console.log('[✅] Członkowie zapisani do data.json!');
        }
    } catch (err) {
        console.error("[❌] Błąd podczas pobierania lub zapisywania członków grupy:", err);
    }
}  

async function sendMessage(page, text) {
    console.log("[DEBUG] Przekazywany text:", text);

    if (typeof text !== 'string') {
        console.error("[⚠️] Błąd: Argument 'text' musi być łańcuchem znaków!");
        return;
    }

    const input = await page.$('[contenteditable="true"]');
    if (!input) {
        console.error("[ERROR] Nie znaleziono pola do wpisania wiadomości.");
        return;
    }

    const lines = text.split('\n');  // Podziel tekst na linie

    for (let i = 0; i < lines.length; i++) {
        await input.type(lines[i]);  // Wpisz aktualną linię tekstu
        if (i < lines.length - 1) {
            // Naciśnij Shift+Enter, aby przejść do nowej linii
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
        }
    }

    // Po zakończeniu wszystkich linii, wyślij wiadomość (Enter)
    await page.keyboard.press('Enter');
    console.log("✅ Wiadomość wysłana przez bota.");
}

module.exports = {
    getGroupMembers,
    copyImageToClipboard,
    pasteImageWithRobot,
    delay,
    saveGroupMembersToFile,
    sendMessage
};