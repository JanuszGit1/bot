const fetch = require('node-fetch');

const apiBaseUrl = 'https://api.nbp.pl/api/exchangerates/rates';
const goldBaseUrl = 'https://api.nbp.pl/api/cenyzlota';

// Pobieranie kursu walutowego (uwzględnia PLN jako bazę)
async function fetchCurrencyRate(fromCurrency, toCurrency) {
    try {
        if (fromCurrency === "PLN" && toCurrency !== "PLN") {
            const res = await fetch(`${apiBaseUrl}/a/${toCurrency.toLowerCase()}/?format=json`);
            if (!res.ok) throw new Error(`Błąd podczas pobierania kursu: ${res.statusText}`);
            const data = await res.json();
            return 1 / data.rates[0].mid;
        }

        if (toCurrency === "PLN" && fromCurrency !== "PLN") {
            const res = await fetch(`${apiBaseUrl}/a/${fromCurrency.toLowerCase()}/?format=json`);
            if (!res.ok) throw new Error(`Błąd podczas pobierania kursu: ${res.statusText}`);
            const data = await res.json();
            return data.rates[0].mid;
        }

        if (fromCurrency !== "PLN" && toCurrency !== "PLN") {
            const resFrom = await fetch(`${apiBaseUrl}/a/${fromCurrency.toLowerCase()}/?format=json`);
            const resTo = await fetch(`${apiBaseUrl}/a/${toCurrency.toLowerCase()}/?format=json`);
            if (!resFrom.ok || !resTo.ok) throw new Error(`Błąd podczas pobierania danych`);
            const dataFrom = await resFrom.json();
            const dataTo = await resTo.json();
            return dataFrom.rates[0].mid / dataTo.rates[0].mid;
        }

        throw new Error("Nieprawidłowa para walut.");
    } catch (error) {
        console.error("[🚨] Błąd podczas pobierania kursu walut:", error);
        return null;
    }
}

// Pobieranie aktualnej ceny złota
async function fetchGoldPrice() {
    const url = `${goldBaseUrl}/?format=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Błąd podczas pobierania ceny złota: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data) || !data[0]?.cena) {
            throw new Error('Nie udało się pobrać ceny złota.');
        }

        return data[0].cena;
    } catch (error) {
        console.error("[🚨] Błąd podczas pobierania ceny złota:", error);
        return null;
    }
}

// Pobieranie historii kursów waluty względem PLN
async function fetchCurrencyHistory(currency, startDate, endDate) {
    const url = `${apiBaseUrl}/a/${currency.toLowerCase()}/${startDate}/${endDate}/?format=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Błąd pobierania: ${response.statusText}`);

        const data = await response.json();
        if (!data?.rates?.length) {
            throw new Error("Brak danych kursowych.");
        }

        return data.rates.map(rate => ({
            date: rate.effectiveDate,
            value: rate.mid
        }));
    } catch (error) {
        console.error("[🚨] Błąd podczas pobierania historii kursów:", error);
        return null;
    }
}

// Obsługa komendy !kurs
async function handleCurrencyCommand(command) {
    const args = command.trim().split(' ');
    if (args.length !== 3) {
        return "❌ Podaj poprawny format komendy, np. `!kurs PLN USD`";
    }

    const fromCurrency = args[1].toUpperCase();
    const toCurrency = args[2].toUpperCase();
    const rate = await fetchCurrencyRate(fromCurrency, toCurrency);

    if (rate === null) {
        return `❌ Nie udało się pobrać kursu wymiany dla walut: ${fromCurrency} -> ${toCurrency}`;
    }

    return `💰 Kurs wymiany ${fromCurrency} -> ${toCurrency}: ${rate.toFixed(4)}`;
}

// Obsługa komendy !złoto
async function handleGoldCommand() {
    const price = await fetchGoldPrice();

    if (price === null) {
        return `❌ Nie udało się pobrać ceny złota.`;
    }

    return `💰 Aktualna cena złota za 1 gram: ${price.toFixed(2)} PLN`;
}

// Obsługa komendy !historia WALUTA DATA1 DATA2
async function handleHistoryCommand(command) {
    const args = command.trim().split(' ');
    if (args.length !== 4) {
        return "❌ Użycie: `!historia WALUTA RRRR-MM-DD RRRR-MM-DD`, np. `!historia EUR 2024-01-01 2024-01-10`";
    }

    const currency = args[1].toUpperCase();
    const startDate = args[2];
    const endDate = args[3];

    const history = await fetchCurrencyHistory(currency, startDate, endDate);

    if (!history) {
        return `❌ Nie udało się pobrać danych dla ${currency} w okresie ${startDate} - ${endDate}`;
    }

    const formatted = history.map(entry => `📅 ${entry.date}: ${entry.value.toFixed(4)} PLN`).join('\n');
    return `📊 Historia kursów ${currency} względem PLN:\n${formatted}`;
}

// Główna obsługa komend
async function handleCommand(command) {
    if (/^!kurs/i.test(command)) {
        return handleCurrencyCommand(command);
    }

    if (command === '!złoto') {
        return handleGoldCommand();
    }

    if (/^!historia/i.test(command)) {
        return handleHistoryCommand(command);
    }

    return "❌ Nieznana komenda. Spróbuj `!kurs`, `!złoto` lub `!historia`.";
}

module.exports = {
    handleCommand,
    handleCurrencyCommand,
    handleGoldCommand,
    handleHistoryCommand
};
