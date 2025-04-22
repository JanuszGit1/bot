const fetch = require('node-fetch');

// Twój klucz API z TimeZoneDB
const apiKey = '4VCWHKNZ98HH';

// Mapa popularnych lokalizacji do stref czasowych
const locationMapping = {
    'tokio': 'Asia/Tokyo',
    'warszawa': 'Europe/Warsaw',
    'warsaw': 'Europe/Warsaw',
    'new york': 'America/New_York',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'moskwa': 'Europe/Moscow',
    'berlin': 'Europe/Berlin',
    'sydney': 'Australia/Sydney',
    'los angeles': 'America/Los_Angeles',
    // Możesz dodać więcej popularnych lokalizacji tutaj
};

// Funkcja pobierająca listę dostępnych stref czasowych
async function fetchTimezones() {
    const url = `http://api.timezonedb.com/v2.1/list-time-zone?key=${apiKey}&format=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Błąd podczas pobierania stref czasowych: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error('Nie udało się pobrać listy stref czasowych.');
        }

        return data.zones;  // Zwracamy dostępne strefy czasowe
    } catch (error) {
        console.error("[🚨] Błąd podczas pobierania listy stref czasowych:", error);
        return [];  // Zwracamy pustą tablicę w przypadku błędu
    }
}

// Funkcja mapująca lokalizację na strefę czasową
function mapLocationToTimezone(location, timezones) {
    const normalizedLocation = location.toLowerCase().replace(/\s+/g, '_');

    // Sprawdzamy mapowanie dla popularnych lokalizacji
    if (locationMapping[normalizedLocation]) {
        return locationMapping[normalizedLocation];
    }

    // Przechodzimy przez wszystkie strefy czasowe i szukamy dokładnego dopasowania
    for (let tz of timezones) {
        if (tz.zoneName.toLowerCase().includes(normalizedLocation)) {
            return tz.zoneName;
        }
    }

    return null; // Zwracamy null, jeśli nie znaleziono pasującej strefy
}

// Funkcja pobierająca czas z TimeZoneDB
async function fetchCurrentTimeFromGeoLocation(timezone) {
    const url = `http://api.timezonedb.com/v2.1/get-time-zone?key=${apiKey}&format=json&by=zone&zone=${timezone}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Błąd podczas pobierania czasu: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(data.message);
        }

        return data.formatted;  // Zwróci czas w formacie 'yyyy-MM-dd HH:mm:ss'
    } catch (error) {
        console.error("[🚨] Błąd podczas pobierania czasu:", error);
        return "❌ Wystąpił problem podczas pobierania czasu.";
    }
}

// Główna funkcja obsługująca komendę !czas
async function handleTimeCommand(command) {
    const args = command.trim().split(' ');
    if (args.length < 2) {
        return "❌ Podaj nazwę miasta lub kraju, np. `!czas warszawa`";
    }

    const location = args.slice(1).join(' ');
    const timezones = await fetchTimezones();

    if (timezones.length === 0) {
        return "❌ Nie udało się pobrać listy stref czasowych.";
    }

    const timezone = mapLocationToTimezone(location, timezones);

    if (!timezone) {
        return `❌ Nie znaleziono strefy czasowej dla lokalizacji: "${location}"`;
    }

    const currentTime = await fetchCurrentTimeFromGeoLocation(timezone);
    if (!currentTime) {
        return `❌ Nie udało się pobrać czasu dla lokalizacji: "${location}"`;
    }

    return `🕒 Aktualny czas w ${location}: ${currentTime}`;
}

module.exports = { handleTimeCommand };
