const { firefox } = require('playwright');
const { getForecast } = require('./weather');
const { getCurrentWeather } = require('./weather_command');
const { getRandomMeme } = require('./mem');
const https = require('https');
const { exec, execSync } = require('child_process');
const rules = require('./rules');
const { getGroupInfo } = require('./info');
const { getHelpMessage } = require('./pomoc');
const { handleParaCommand } = require('./parahandler.js');
const { getRandomPair, getMatchPercentage, generateShipName, loadUsersFromFile } = require('./paraUtils.js');
const path = require('path');
const fs = require("fs-extra");
const { getUserName, saveUserData, loadUserData, updateUserNames } = require('./userUtils');
const { runCommand, checkForExpiredKicks } = require('./ostrzezenia.js');
const { handleJokeCommand } = require('./zart.js');
const { handleLosujCommand } = require('./losuj.js');
const { handleTimeCommand } = require('./czas');
const { handleDiceRollCommand, handleDiceHistoryCommand } = require('./kostka');
const { handleCommand, handleCurrencyCommand, handleGoldCommand, handleHistoryCommand } = require('./ceny');
const { handleCoinFlipCommand, handleCoinFlipHistoryCommand } = require('./moneta');
const { handleTriviaCommand, fetchTrivia, getQuestionsHistory, addQuestionToHistory } = require('./zagadka');
const { getCorrectAnswer, loadOdpData, saveOdpData, setCorrectAnswer, clearAnswer, getLastAnswers, waitForUserAnswer } = require('./odp');
const { handleCryptoCommand } = require('./crypto.js');
const tmp = require('tmp-promise');
const { generateTombstone } = require('./generateTombstone');
const { handleOcenKomenda } = require('./oceny');

rules.init();

let userData = {}; // User data object
let lastMemeTime = 0;
let isBusy = false;
let lastProcessedMessageId = null;
let lastCommand = '';
let lastCommandTime = 0;
let globalTimeSetting = "1m";
let previousResponse = "";
let isActiveAnswer = false;

function isNewCommand(text) {
    const now = Date.now();
    if (text === lastCommand && now - lastCommandTime < 3000) return false;
    lastCommand = text;
    lastCommandTime = now;
    return true;
}

async function ensureFirefoxInstalled() {
    const browserPath = '/opt/render/.cache/ms-playwright/firefox-1482/firefox/firefox';
    if (!fs.existsSync(browserPath)) {
        console.log('🔥 Firefox nie znaleziony, instaluję...');
        try {
            execSync('npx playwright install firefox', { stdio: 'inherit' });
        } catch (err) {
            console.error('❌ Błąd podczas instalacji Firefoxa:', err);
        }
    } else {
        console.log('✅ Firefox już zainstalowany.');
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBot() {
    if (isBusy) {
        console.log("[⏳] Ignoruję komendę, bo trwa wcześniejsze przetwarzanie.");
        return;
    }

    isBusy = true; // Zmienna kontrolująca stan bota
    let browser;
    let page;

    try {
        browser = await firefox.launch({ headless: true });  // Uruchomienie w trybie headless
        page = await browser.newPage();

        // Załadowanie ciasteczek, jeśli istnieją
        if (fs.existsSync('cookies.json')) {
            const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
            const targetUrl = 'https://www.facebook.com/messages/t/9873340259342833';
	console.log(`🌐 Wchodzę na stronę: ${targetUrl} ...`);
	await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
	console.log("✅ Strona załadowana!");
            await page.context().addCookies(cookies);
            await page.reload();  // Konieczne po dodaniu ciasteczek
            console.log("[🍪] Załadowano zapisane ciasteczka.");
        } else {
            console.log("[🔐] Brak ciasteczek, logowanie...");
            await login(page); // Funkcja login do zaimplementowania
        }


        // Pętla nasłuchująca nowe wiadomości
        while (true) {
            try {
                const messageNodes = await page.$$('div[dir="auto"]');
                if (messageNodes.length === 0) {
                    await delay(1000);  // Czekaj chwilę przed kolejnym sprawdzeniem
                    continue;
                }

                const last = messageNodes[messageNodes.length - 1];
                const currentText = await last.innerText();
                const currentMessageId = await last.evaluate(node => node?.outerHTML);

                if (!currentText || currentMessageId === lastProcessedMessageId) {
                    await delay(1000);
                    continue;
                }

                lastProcessedMessageId = currentMessageId;  // Zapamiętujemy ID ostatniej przetworzonej wiadomości
                const userName = await getUserName(last);

                // Jeśli użytkownik nie istnieje w userData, dodajemy go
                if (!userData[userName]) {
                    userData[userName] = { warnings: 0, messages: 0 };
                }
                userData[userName].messages += 1;  // Zwiększamy licznik wiadomości użytkownika

                console.log(`[📥] Nowa wiadomość od: ${userName} | Treść: ${currentText}`);

                // General reactions
                if (/xd|xD|XD|siemka|hej|yo/i.test(currentText)) {
                    await sendMessage(page, "Siema! Co tam? 😄");
                }

                // Obsługa komendy !pomoc
                if (/^!pomoc/i.test(currentText)) {
                    console.log("[❓] Komenda !pomoc wykryta");
                    const helpMessage = await getHelpMessage(last);
                    await sendMessage(page, helpMessage);
                }

                // Obsługa komendy !prognoza
                if (/^!prognoza\s+/i.test(currentText)) {
                    const city = currentText.split(" ").slice(1).join(" ");
                    console.log(`[🌦️] Komenda pogodowa wykryta dla: ${city}`);
                    const forecast = await getForecast(city);
                    await sendMessage(page, forecast);
                }

                // Obsługa komendy !pogoda
                if (/^!pogoda\s+/i.test(currentText)) {
                    const city = currentText.split(" ").slice(1).join(" ");
                    console.log(`[📅] Komenda !pogoda wykryta dla: ${city}`);
                    const currentWeather = await getCurrentWeather(city);
                    await sendMessage(page, currentWeather);
                }

                // Obsługa komendy !info
                if (/^!info/i.test(currentText)) {
                    try {
                        console.log("[ℹ️] Komenda !info wykryta");
                        const infoMessage = await getGroupInfo();
                        await sendMessage(page, infoMessage);
                    } catch (err) {
                        console.error('[⚠️] Błąd przy !info:', err);
                        await sendMessage(page, '❌ Wystąpił błąd przy pobieraniu informacji.');
                    }
                }

if (/^!czas/i.test(currentText)) {
    console.log('[⏰] Komenda !czas wykryta od użytkownika: ${currentText}');

    try {
        // Obsługuje komendę !czas i zwraca odpowiedź
        const timeResponse = await handleTimeCommand(currentText);

        // Jeśli odpowiedź została poprawnie wygenerowana, wysyłamy ją użytkownikowi
        await sendMessage(page, timeResponse);

        // Zapisujemy poprzednie zapytanie w zmiennej (jeśli jest wykorzystywane w innym kontekście)
        previousResponse = currentText;

    } catch (error) {
        // Logowanie błędu z pełną informacją o szczegółach problemu
        console.error("[❌] Błąd podczas przetwarzania komendy !czas:", error);

        // Wysyłamy użytkownikowi wiadomość z opisem błędu
        const errorMessage = error instanceof Error ? error.message : "❌ Wystąpił nieoczekiwany błąd.";
        await sendMessage(page, `❌ Wystąpił błąd podczas przetwarzania komendy !czas: ${errorMessage}`);
    }
}

if (/^!kurs/i.test(currentText)) {
    console.log('[💱] Komenda !kurs wykryta od użytkownika: ${currentText}');

    try {
        // Obsługuje komendę !kurs i zwraca odpowiedź
        const currencyResponse = await handleCurrencyCommand(currentText);

        // Jeśli odpowiedź została poprawnie wygenerowana, wysyłamy ją użytkownikowi
        await sendMessage(page, currencyResponse);

        // Zapisujemy poprzednie zapytanie w zmiennej (jeśli jest wykorzystywane w innym kontekście)
        previousResponse = currentText;

    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !kurs:", error);
        const errorMessage = error instanceof Error ? error.message : "❌ Wystąpił nieoczekiwany błąd.";
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !kurs: ${errorMessage}');
    }
}

// Obsługuje komendę !rzućkostką
if (/^!rzućkostką/i.test(currentText)) {
    console.log('[🎲] Komenda !rzućkostką wykryta od użytkownika: ${currentText}');

    try {
        // Obsługuje komendę !rzućkostką i zwraca odpowiedź z wynikiem rzutu
        const diceRollResponse = await handleDiceRollCommand(currentText);

        // Wysyłamy wygenerowaną odpowiedź do użytkownika
        await sendMessage(page, diceRollResponse);

        // Zapisujemy poprzednie zapytanie (jeśli potrzebne w dalszym kontekście)
        previousResponse = currentText;

    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !rzućkostką:", error);
        const errorMessage = error instanceof Error ? error.message : "❌ Wystąpił nieoczekiwany błąd.";
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !rzućkostką: ${errorMessage}');
    }
}

// Obsługuje komendę !historiakostki
if (/^!historiakostki/i.test(currentText)) {
    console.log('[📜] Komenda !historiakostki wykryta od użytkownika: ${currentText}');

    try {
        // Obsługuje komendę !historiakostki i zwraca odpowiedź z historią rzutów
        const diceHistoryResponse = await handleDiceHistoryCommand(currentText);

        // Wysyłamy wygenerowaną odpowiedź do użytkownika
        await sendMessage(page, diceHistoryResponse);

        // Zapisujemy poprzednie zapytanie (jeśli potrzebne w dalszym kontekście)
        previousResponse = currentText;

    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !historiakostki:", error);
        const errorMessage = error instanceof Error ? error.message : "❌ Wystąpił nieoczekiwany błąd.";
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !historiakostki: ${errorMessage}');
    }
}

// Obsługa komendy !zagadka
// Obsługa komendy !zagadka
if (/^!zagadka/i.test(currentText)) {
    console.log('[🎲] Komenda !zagadka wykryta od użytkownika: ${currentText}');

    isBusy = true;

    try {
	const [_, category, difficulty] = currentText.split(" ");
	if (!category || !difficulty) {
	    throw new Error("❌ Musisz podać kategorię i poziom trudności, Przykład: !zagadka 9 easy.");
	}

        const { question, correctAnswer } = await fetchTrivia(category, difficulty);

        if (!question || !correctAnswer) {
            throw new Error("❌ Wystąpił problem z pobraniem zagadki.");
        }

        console.log('[BOT] → Pytanie: ${question}');
        console.log('[BOT] → Poprawna odpowiedź: ${correctAnswer}');

        await addQuestionToHistory(question, correctAnswer);
        await setCorrectAnswer("zagadka", question, correctAnswer);
        await sendMessage('page, 🎲 Pytanie: ${question}\nPodaj swoją odpowiedź! (komenda !odp zagadka <odpowiedź>)');

        // Timeout - zmiana wartości na 45 sekund
        const timeoutDuration = 45 * 1000; // Timeout 45 seconds
        let userAnswerReceived = false;

        const timeout = setTimeout(async () => {
            if (!userAnswerReceived) {
                await sendMessage(page, "❌ Czas oczekiwania na odpowiedź minął!");
                isBusy = false;
                console.log("[✅] Bot gotowy na kolejną komendę !zagadka");
            }
        }, timeoutDuration);

        try {
            const userAnswer = await waitForUserAnswer(page);
            userAnswerReceived = true;
            clearTimeout(timeout); // Stop the timeout if we get an answer

            const result = await checkAnswer(userAnswer, correctAnswer);
            await sendMessage(page, result);
        } catch (error) {
            console.error("[❌] Błąd przy oczekiwaniu na odpowiedź użytkownika:", error);
        }

    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !zagadka:", error);
        const errorMessage = error instanceof Error ? error.message : "❌ Wystąpił nieoczekiwany błąd.";
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !zagadka: ${errorMessage}');
    } finally {
        isBusy = false;
        console.log("[✅] Bot gotowy na kolejną komendę !zagadka");
    }
}

// Obsługa komendy !odp
if (/^!odp /i.test(currentText)) {
    try {
        isBusy = true;

        const [_, rawCommandName, ...userAnswerArr] = currentText.trim().split(" ");
        const commandName = rawCommandName.toLowerCase();
        const userAnswer = userAnswerArr.join(" ").trim();

        if (!commandName || !userAnswer) {
            await sendMessage(page, "❌ Poprawne użycie: !odp <komenda> <odpowiedź>, np. !odp zagadka Pies");
            return;
        }

        const data = getCorrectAnswer(commandName);

        if (!data) {
            await sendMessage(page, "❌ Brak pytania dla komendy " + commandName + ". Najpierw użyj np. !" + commandName + " 9 easy");
            return;
        }

        const poprawna = data.correctAnswer.trim().toLowerCase();
        const uzytkownika = userAnswer.trim().toLowerCase();

        const odpowiedz = isCorrect
	    ? "✅ Brawo! Odpowiedź jest poprawna!"
	    : `❌ Niestety, zła odpowiedź. Poprawna to: ${data.correctAnswer}`;

        await sendMessage(page, odpowiedz);
    } catch (err) {
        console.error("[❌] Błąd w obsłudze !odp:", err);
	await sendMessage(page, `❌ Wystąpił błąd podczas przetwarzania komendy !odp: ${err.message}`);
    } finally {
        isBusy = false;
        console.log("[✅] Bot gotowy na kolejną komendę !odp");
    }
}

if (/^!crypto/i.test(currentText)) {
    console.log('[📊] Komenda !crypto wykryta od użytkownika: ${currentText}');

    try {
        // Obsługuje komendę !crypto i zwraca odpowiedź z danymi o kryptowalucie
        const cryptoResponse = await handleCryptoCommand(currentText, page, sendMessage);

        // Wysyłamy wygenerowaną odpowiedź do użytkownika
        await sendMessage(page, cryptoResponse);

        // Zapisujemy poprzednie zapytanie (jeśli potrzebne w dalszym kontekście)
        previousResponse = currentText;

    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !crypto:", error);
        const errorMessage = error instanceof Error ? error.message : "❌ Wystąpił nieoczekiwany błąd.";
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !crypto: ${errorMessage}');
    }
}

// Obsługuje komendę !historia
if (/^!historia/i.test(currentText) && !/^!historiakostki/i.test(currentText) && !/^!historiamoneta/i.test(currentText)) {
    console.log('[📈] Komenda !historia wykryta od użytkownika: ${currentText}');

    try {
        // Obsługuje komendę !historia i zwraca odpowiedź z danymi historycznymi
        const historyResponse = await handleHistoryCommand(currentText);

        // Wysyłamy wygenerowaną odpowiedź do użytkownika
        await sendMessage(page, historyResponse);

        // Zapisujemy poprzednie zapytanie (jeśli potrzebne w dalszym kontekście)
        previousResponse = currentText;

    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !historia:", error);
        const errorMessage = error instanceof Error ? error.message : "❌ Wystąpił nieoczekiwany błąd.";
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !historia: ${errorMessage}');
    }
}

if (/^!coinflip/i.test(currentText)) {
    console.log('[🎲] Komenda !coinflip wykryta od użytkownika: ${currentText}');
    try {
        const coinFlipResponse = await handleCoinFlipCommand(currentText);
        await sendMessage(page, coinFlipResponse);
        previousResponse = currentText;
    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !coinflip:", error);
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !coinflip: ${error.message}');
    }
} else if (/^!historiamoneta/i.test(currentText)) {
    console.log('[📜] Komenda !historiamoneta wykryta od użytkownika: ${currentText}');
    try {
        const historyResponse = await handleCoinFlipHistoryCommand(currentText);
        await sendMessage(page, historyResponse);
        previousResponse = currentText;
    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !historiamoneta:", error);
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !historiamoneta: ${error.message}');
    }
}

if (/^!złoto/i.test(currentText)) {
    console.log('[💰] Komenda !złoto wykryta od użytkownika: ${currentText}');

    try {
        // Obsługuje komendę !złoto i zwraca odpowiedź
        const goldPriceResponse = await handleGoldCommand();

        // Jeśli odpowiedź została poprawnie wygenerowana, wysyłamy ją użytkownikowi
        await sendMessage(page, goldPriceResponse);

        // Zapisujemy poprzednie zapytanie w zmiennej (jeśli jest wykorzystywane w innym kontekście)
        previousResponse = currentText;

    } catch (error) {
        console.error("[❌] Błąd podczas przetwarzania komendy !złoto:", error);
        const errorMessage = error instanceof Error ? error.message : "❌ Wystąpił nieoczekiwany błąd.";
        await sendMessage('page, ❌ Wystąpił błąd podczas przetwarzania komendy !złoto: ${errorMessage');
    }
}

            // Obsługa komendy !zasady
            if (/^!zasady\s*/i.test(currentText)) {
                const command = currentText.split(" ")[1];
                const args = currentText.split(" ").slice(2).join(" ");

                if (!command || command === "pokaz") {
                    const rulesList = rules.showRules();
                    await sendMessage(page, rulesList);
                } else if (command === "dodaj") {
                    if (args) {
                        const result = rules.addRule(args);
                        await sendMessage(page, result);
                    } else {
                        await sendMessage(page, "❌ Proszę podać treść zasady do dodania.");
                    }
                } else if (command === "edytuj") {
                    const [index, ...rest] = args.split(" ");
                    const newRule = rest.join(" ");
                    if (index && newRule) {
                        await sendMessage(page, rules.editRule(parseInt(index) - 1, newRule));
                    } else {
                        await sendMessage(page, "❌ Proszę podać numer zasady i nową treść.");
                    }
                } else if (command === "usuń") {
                    const index = parseInt(args) - 1;
                    if (index >= 0) {
                        await sendMessage(page, rules.removeRule(index));
                    } else {
                        await sendMessage(page, "❌ Proszę podać numer zasady do usunięcia.");
                    }
                } else {
                    await sendMessage(page, "❌ Komenda nieznana. Spróbuj !zasady <pokaz|dodaj|edytuj|usuń>.");
                }
            }

            // Obsługa ostrzeżeń za wulgaryzmy
            if (rules.checkForSwearWords(currentText)) {
                userData[userName].warnings += 1;
                await sendMessage(page, `⚠️ ${userName} otrzymał ostrzeżenie! (łącznie: ${userData[userName].warnings})`);
            }

// Obsługa komendy !para
if (/^!para/i.test(currentText)) {
    console.log("[❤️] Komenda !para wykryta");

    // Jeśli bot jest zajęty, po prostu wykonaj komendę bez czekania
    if (isBusy) {
        console.log("[⏳] Bot jest zajęty, ale teraz wykona komendę");
    }

    // Bot nie jest zajęty, możemy zacząć przetwarzać komendę
    isBusy = true;

    try {
        const messageText = currentText?.trim();
        const allUsers = loadUsersFromFile();
        console.log("[DEBUG] Załadowani użytkownicy:", allUsers);

        if (allUsers.length < 2) {
	    console.error("[ERROR] Za mało użytkowników do losowania pary.");
	    await sendMessage(page, "❌ Za mało użytkowników, aby znaleźć parę.");
            isBusy = false;
            return;
        }

        const match = messageText.match(/@([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9_ ]+)/);
        console.log("[DEBUG] Wynik regex match:", match);

        if (match) {
            const userToPair = match[1].trim();
            console.log("[DEBUG] Wyodrębniony użytkownik do parowania:", userToPair);

            const targetUser = allUsers.find(user => user.toLowerCase() === userToPair.toLowerCase());
            if (!targetUser) {
                console.error("[ERROR] Użytkownik nie istnieje w systemie.");
               await sendMessage(page, `❌ Użytkownik @${userToPair} nie znajduje się w systemie.`);
                isBusy = false;
                return;
            }

            const remainingUsers = allUsers.filter(user => user.toLowerCase() !== userToPair.toLowerCase());
            if (remainingUsers.length === 0) {
                await sendMessage('page, ❌ Brak innych użytkowników do sparowania z @${userToPair}.');
                isBusy = false;
                return;
            }

            const randomPartner = remainingUsers[Math.floor(Math.random() * remainingUsers.length)];
            const matchPercentage = getMatchPercentage();
            const shipName = generateShipName(targetUser, randomPartner);

            const finalMsg = `👫 Oto propozycja pary dla @${userToPair}: ${targetUser} i ${randomPartner}
		❤️ Procent dopasowania: ${matchPercentage}%
		🚢 Nazwa statku: ${shipName}`;
            console.log("[DEBUG] Przekazywany text:", finalMsg);
            await sendMessage(page, finalMsg);
        } else {
            // --- Jeżeli nie ma oznaczenia, losuj parę z całej listy ---
            console.log("[DEBUG] Losowanie pary bez oznaczenia");

            const shuffled = [...allUsers].sort(() => 0.5 - Math.random());
            const [userA, userB] = shuffled.slice(0, 2);

            const matchPercentage = getMatchPercentage();
            const shipName = generateShipName(userA, userB);

	const finalMsg = `👫 Propozycja pary: ${userA} i ${userB}
	❤️ Procent dopasowania: ${matchPercentage}%
	🚢 Nazwa statku: ${shipName}`;

	console.log("[DEBUG] Przekazywany text:", finalMsg);
	await sendMessage(page, finalMsg);

        }
    } catch (err) {
        console.error("[FATAL] Błąd podczas wykonywania !para:", err);
        await sendMessage(page, "❌ Wystąpił błąd przy próbie utworzenia pary.");
    } finally {
        // Ustaw isBusy na false po zakończeniu operacji
        isBusy = false;
        console.log("[✅] Bot gotowy na kolejną komendę !para");
    }
}

if (/^!ostrzeżenia/i.test(currentText)) {
    console.log("[⚠️] Komenda !ostrzeżenia wykryta");

    if (isBusy) {
        console.log("[⏳] Bot był zajęty, ale teraz przetwarza komendę ostrzeżeń");
    }

    isBusy = true;

    try {
        const messageText = currentText.trim();
        const allUsersData = await loadUsersFromFile(); // Funkcja ładowania danych
        const usersList = Array.isArray(allUsersData) ? allUsersData : allUsersData.members || [];

        console.log("Wczytani użytkownicy:", usersList);

        const match = messageText.match(/!ostrzeżenia\s+@?([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9_ ]+?)(?=\s+(dodaj|usuń|lista|czas|$))/i);
        const actionMatch = messageText.match(/\b(dodaj|usuń|lista|czas)\b/i);
        const user = match ? match[1].trim() : null;
        const action = actionMatch ? actionMatch[1].toLowerCase() : null;

        const { runCommand } = require("./ostrzezenia");

        if (!action) {
            await sendMessage(page, "❌ Nie podano akcji (dodaj, usuń, lista, czas).");
            return;
        }

        // Brak użytkownika przy wymagającej komendzie
        if (["dodaj", "usuń"].includes(action) && !user) {
            await sendMessage(page, "❌ Nie podano użytkownika.");
            return;
        }

        let resultMsg = "";
if (action === "czas") {
    const timeMatch = messageText.match(/czas=([0-9dhms\s]+)/i);
    if (timeMatch) {
        globalTimeSetting = timeMatch[1].trim();
        resultMsg = `✅ Ustawiono globalny czas na ostrzeżenia: ${globalTimeSetting}`;
    } else {
        resultMsg = "❌ Niepoprawny format czasu. Przykład: !ostrzeżenia czas=2d";
    }
} else if (action === "lista") {
    resultMsg = user
        ? await runCommand(`!ostrzeżenia @${user} lista`)
        : await runCommand("!ostrzeżenia wszystkich");
} else if (["dodaj", "usuń"].includes(action) && user) {
    const normalize = str => str.trim().toLowerCase();
    const userExists = usersList.some(u => normalize(u) === normalize(user));

    if (!userExists) {
        await sendMessage(page, `❌ Użytkownik @${user} nie istnieje w systemie.`);
        return;
    }

    let fullCommand = `!ostrzeżenia @${user} ${action}`;

    if (action === "dodaj") {
        const reasonMatch = messageText.match(/dodaj\s+(.+?)(\s+czas=|$)/i);
        const reason = reasonMatch ? reasonMatch[1].trim() : "Brak powodu";
        fullCommand += ` ${reason} czas=${globalTimeSetting}`;
    }

    if (action === "usuń") {
        const warnNumMatch = messageText.match(/usuń\s+(\d+)/i);
        if (warnNumMatch) fullCommand += ` ${warnNumMatch[1]}`;
    }

    resultMsg = await runCommand(fullCommand);
}

//Walidacja odpowiedzi
if (typeof resultMsg !== "string") {
    console.warn("[⚠️] resultMsg nie jest typu string:", resultMsg);
    resultMsg = "❌ Błąd: niepoprawny format odpowiedzi.";
}

console.log("[📤] Wynik:", resultMsg);
await sendMessage(page, resultMsg);
previousResponse = currentText;

    } catch (err) {
        console.error("[FATAL] Błąd przy !ostrzeżenia:", err);
        await sendMessage(page, "❌ Wystąpił błąd podczas obsługi komendy.");
    } finally {
        isBusy = false;
        console.log("[✅] Bot gotowy do kolejnej komendy !ostrzeżenia");
    }
}

// Zakładając, że masz stronę 'page' oraz 'currentText', który zawiera treść wiadomości
if (/^!żart/i.test(currentText)) {
    console.log("[😄] Komenda !żart wykryta");

    // Wywołanie funkcji obsługującej komendę !żart
    const joke = await handleJokeCommand(currentText);

    // Wysłanie wiadomości z żartem
    await sendMessage(page, joke);

    // Zapisanie poprzedniej odpowiedzi (jeśli potrzebne)
    previousResponse = currentText;
}

if (/^!losuj/i.test(currentText)) {
    console.log("[🎲] Komenda !losuj wykryta");

    // Wywołanie funkcji obsługującej komendę !losuj
    const chosenOption = await handleLosujCommand(currentText);

    // Wysłanie wiadomości z wylosowaną opcją
    await sendMessage(page, chosenOption);

    // Zapisanie poprzedniej odpowiedzi (jeśli potrzebne)
    previousResponse = currentText;
}

if (/^!rip/i.test(currentText)) {
    try {
        console.log("[⚰️] Komenda !rip wykryta");

        const args = currentText.trim().slice(4).trim();
        if (!args) {
            await sendMessage(page, "❌ Podaj dane po !rip. Format: !rip imię nazwisko YYYY-YYYY [cytat] [przyczyna]");
            return;
        }

        // Dopasowanie daty
        const dateMatch = args.match(/\b(\d{4})-(\d{4})\b/);
        if (!dateMatch || dateMatch.index === undefined) {
            await sendMessage(page, "❌ Podaj daty w formacie YYYY-YYYY, np. 1990-2023.");
            return;
        }

        const birthYear = dateMatch[1];
        const deathYear = dateMatch[2];

        // Wyciąganie imienia i nazwiska
        const namePart = args.slice(0, dateMatch.index).trim();
        const afterDate = args.slice(dateMatch.index + dateMatch[0].length).trim();
        const name = namePart.length > 0 ? namePart : "Nieznany";

        let quote = "", cause = "";
        // Dopasowanie cytatu
        const quoteMatch = afterDate.match(/"([^"]+)"/);
        if (quoteMatch) {
            quote = quoteMatch[1].trim();
            const remaining = afterDate.slice(quoteMatch.index + quoteMatch[0].length).trim();
            cause = remaining;
        } else {
            // Dopasowanie przyczyny
            const causeSplitKeywords = ["zabił", "zabiła", "zginął", "umarł", "powód", "przyczyna"];
            const keywordRegex = new RegExp(`\\b(${causeSplitKeywords.join("|")})\\b`, "i");

            const splitPoint = afterDate.search(keywordRegex);
            if (splitPoint !== -1) {
                quote = afterDate.slice(0, splitPoint).trim();
                cause = afterDate.slice(splitPoint).trim();
            } else {
                quote = afterDate.trim();
            }
        }

        // Generowanie obrazka nagrobka bez avatara
        const buffer = await generateTombstone({
            name,
            birthYear,
            deathYear,
            cause,
            quote
        });

        const outputFilePath = './output/tombstone.png';
        fs.writeFileSync(outputFilePath, buffer);
        console.log(`✅ Plik zapisany: ${outputFilePath}`);

        // Przygotowanie tekstu wiadomości
        const messageText = `⚰️ **${name}** (*${birthYear}–${deathYear}*)\n` +
            `🪦 *"${quote}"*\n` +
            `📜 ${cause ? `Przyczyna: ${cause}` : 'Przyczyna nieznana.'}\n\n` +
            `✅ Nagrobek został utworzony.`;

        // Wysyłka obrazka i tekstu w jednej wiadomości
        await sendImageInMessenger(page, outputFilePath, messageText);

    } catch (err) {
        console.error("[☠️] Błąd przy !rip:", err);
        await sendMessage(page, "❌ Wystąpił problem przy tworzeniu nagrobka.");
    }
}

if (/^!oceń/i.test(currentText)) {
    console.log("[⭐] Komenda !oceń wykryta");

    try {
        const userName = await getUserName(lastMessage);
        console.log("[DEBUG] Nazwa użytkownika:", userName);

        // Jeśli `getUserName` zwraca poprawną nazwę użytkownika, ale nie ID, zmień:
        const userId = userName; // Jeśli masz oddzielnie ID, zmień to na odpowiednie przypisanie

        // Jeśli masz dostęp do ID użytkownika, przypisz je tu:
        // const userId = await getUserIdFromPlatform(userName); 

        // Sprawdzanie, czy mamy prawidłowe wartości:
        if (!userName || !userId) {
            console.error("[ERROR] Brak nazwy użytkownika lub ID.");
            return;
        }

        // Wywołanie komendy oceń
        await handleOcenKomenda(currentText, userId, userName, sendMessage);

    } catch (err) {
        console.error("[❌] Błąd przy obsłudze komendy !oceń:", err);
    }
}

if (/^!mem/i.test(currentText)) {
    console.log("[🎯] Komenda !mem wykryta");
    try {
        isBusy = true;
        await sendMessage(page, "📸 Szukam dla Ciebie mema...");

        const imageUrl = await getRandomMeme(); // Twoja funkcja do pobierania URL
        console.log("[🖼️] URL mema:", imageUrl);

        const imagePath = './output/mem_image.jpg'; // Upewnij się, że folder 'output' istnieje!

        // Pobieranie obrazu
        await downloadImage(imageUrl, imagePath); // Funkcja pobierająca obraz
        console.log(`✅ Obraz pobrany: ${imagePath}`);

        // Upload obrazu jako załącznik
	        const fileInput = await page.$('input[type="file"]');
	        if (fileInput) {
	            // Używamy Playwright 'setInputFiles' zamiast 'uploadFile'
	            await fileInput.setInputFiles(imagePath);
	            console.log("✅ Obrazek załadowany jako załącznik.");
	            await page.waitForTimeout(2000);  // Opcjonalnie czekamy chwilę
	
	            // Szukamy przycisku do wysyłania
	            const sendBtn = await page.$('button[type="submit"], button.send-button');
		            if (sendBtn) {
		                await sendBtn.click();
		                console.log("✅ Kliknięto przycisk wysyłania.");
		            } else {
		                await page.keyboard.press("Enter");
		                console.log("✅ Wysłano przez Enter.");
		            }
		        } else {
		            console.error("❌ Nie znaleziono inputa do dodania obrazka.");
		            await sendMessage(page, "❌ Nie udało się załadować obrazka. Brak inputa.");
		        }
		    } catch (err) {
		        console.error("[❌] Błąd przy obsłudze !mem:", err);
		        await sendMessage(page, "❌ Wystąpił błąd podczas pobierania/wysyłania mema.");
		    } finally {
		        isBusy = false;
		        await delay(500); // Mała pauza po zakończeniu komendy
		    }
		}
            } catch (err) {
                console.error('[ERROR] Błąd w głównym procesie:', err);
                process.exit(1); // Zakończenie procesu z kodem błędu
            }
        }

    } catch (err) {
        console.error('[ERROR] Błąd w głównym procesie:', err);
        process.exit(1); // Zakończenie procesu z kodem błędu
    } finally {
        isBusy = false;
        // Nie zamykamy przeglądarki, by pozostała otwarta na VPS
        // if (browser) await browser.close();
    }
} 

function downloadImage(url, path) {
    console.log(`[INFO] Rozpoczynamy pobieranie obrazu z URL: ${url}`);
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                console.error(`[ERROR] Błąd podczas pobierania: Status ${response.statusCode}`);
                reject(new Error(`Błąd pobierania: ${response.statusCode}`));
                return;
            }

            console.log(`[INFO] Otrzymano odpowiedź od serwera, zapisujemy obraz do ${path}`);
            response.pipe(file);

            file.on('finish', () => {
                console.log(`[INFO] Zapisano obraz do ${path}`);
                file.close(resolve); // Zakończenie zapisu
            });
        }).on('error', (err) => {
            console.error(`[ERROR] Wystąpił błąd podczas pobierania obrazu: ${err.message}`);
            fs.unlink(path, () => {}); // W przypadku błędu usuwamy plik
            reject(err);
        });
    });
}

async function sendImageInMessenger(page, imagePath, messageText = '') {
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
        // Wysyłanie obrazka
        await fileInput.setInputFiles(imagePath);
        console.log("✅ Obrazek załadowany jako załącznik.");
        await page.waitForTimeout(2000);

        const sendBtn = await page.$('button[type="submit"], button.send-button');
        if (sendBtn) {
            await sendBtn.click();
            console.log("✅ Kliknięto przycisk wysyłania.");
        } else {
            await page.keyboard.press("Enter");
            console.log("✅ Wysłano przez Enter.");
        }

      // Teraz wysyłamy wiadomość tekstową
        if (messageText) {
            await sendMessage(page, messageText);  // Używamy funkcji sendMessage, by wysłać tekst
        }

    } else {
        console.error("❌ Nie znaleziono inputa do dodania obrazka.");
    }
}

// Sprawdzanie wygasłych ostrzeżeń
setInterval(() => {
    const kickedUsers = checkForExpiredKicks();
    if (kickedUsers.length > 0) {
        console.log(`Usunięto użytkowników: ${kickedUsers.join(", ")}`);
    }
}, 60000); 

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

    // Wklej tekst
    await input.focus();  // Upewniamy się, że pole jest aktywne
    await page.keyboard.insertText(text);  // Wklejamy cały tekst od razu
    console.log("✅ Tekst wklejony.");

    // Naciśnij Enter, aby wysłać wiadomość
    await page.keyboard.press('Enter');
    console.log("✅ Wiadomość wysłana przez bota.");
}

async function login(page) {
    try {
        console.log("[🌐] Przechodzę na stronę Facebook Messenger...");
        await page.goto('https://www.facebook.com/messages', {
            waitUntil: 'domcontentloaded',
            timeout: 60000  // Można skrócić, jeśli net szybki
        });

        console.log("[⏳] Czekam na załadowanie interfejsu wiadomości...");
        await page.waitForSelector('div[aria-label="Wiadomości"]', {
            timeout: 90000
        });

        console.log("[✅] Zalogowano do Facebooka!");

        const cookies = await page.context().cookies();
        fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
        console.log("[💾] Ciasteczka zapisane do cookies.json!");

    } catch (err) {
        console.error("[❌] Błąd podczas logowania:", err.message || err);
    }
}

async function getGroupMembers(page) {
    try {
        const chatMembersButton = await page.locator('span:has-text("Chat members")').first();
        await chatMembersButton.waitFor({ state: 'visible', timeout: 10000 });
        await chatMembersButton.click();

        await page.waitForSelector('[role="listitem"]', { timeout: 10000 });

        const members = await page.$$eval('[role="listitem"]', listItems => {
            return listItems.map(item => {
                let text = item.innerText?.trim();
                if (!text) return null;

                const junkKeywords = [
                    'chat members', 'media, files and links', 'customise chat',
                    'group options', 'chat info', 'add people', 'invite',
                    'message ', 'privacy and support', 'search', 'notifications', 'shared'
                ];

                const lower = text.toLowerCase();
                if (junkKeywords.some(j => lower.includes(j))) return null;

                const name = text.split('\n')[0].trim();
                return name.length > 0 ? name : null;
            }).filter(name => name !== null);
        });

        return members;

    } catch (err) {
        console.error("[❌] Błąd przy getGroupMembers:", err.message);
        return [];
    }
}

async function saveGroupMembersToFile(page) {
    const members = await getGroupMembers(page);

    if (!members.length) {
        console.warn("[⚠️] Brak członków do zapisania.");
        return;
    }

    const timestamp = new Date().toISOString();
    const data = { timestamp, members };

    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    console.log(`[✅] Zapisano ${members.length} członków do data.json o ${timestamp}`);

}(async () => {
    await ensureFirefoxInstalled();
    await runBot();
})().catch(err => {
    console.error('[ERROR] Błąd w głównym procesie:', err);
    process.exit(1); // Zakończenie procesu z kodem błędu
});

const http = require('http');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot działa ✔️\n');
}).listen(PORT, () => {
  console.log(`Serwer nasłuchuje na porcie ${PORT}`);
});