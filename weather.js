const axios = require('axios');

const API_KEY = "12b8db2791119ee41c7bd331128a4c35";

function get_weather_emoji(description) {
    const desc = description.toLowerCase();
    if (desc.includes("clear")) return "☀️";
    if (desc.includes("cloud")) return "☁️";
    if (desc.includes("rain")) return "🌧️";
    if (desc.includes("snow")) return "❄️";
    if (desc.includes("storm") || desc.includes("thunder")) return "⛈️";
    return "🌈";
}

function get_temperature_emoji(temp) {
    if (temp < 0) return "🥶";
    if (temp < 10) return "🧤";
    if (temp < 18) return "🙂";
    if (temp < 26) return "😊";
    return "🥵";
}

async function getForecast(city) {
    try {
        const url = `http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&lang=pl&units=metric`;
        const res = await axios.get(url);
        const data = res.data;

        if (data.cod !== "200") {
            return "❌ Nie udało się pobrać prognozy. Sprawdź nazwę miasta.";
        }

        const forecast = {};
        for (const entry of data.list) {
            const date = entry.dt_txt.split(" ")[0];
            if (!forecast[date]) {
                forecast[date] = { temp: [], humidity: [], wind: [], description: [] };
            }
            forecast[date].temp.push(entry.main.temp);
            forecast[date].humidity.push(entry.main.humidity);
            forecast[date].wind.push(entry.wind.speed);
            forecast[date].description.push(entry.weather[0].description);
        }

        let result = `📍 Prognoza pogody na najbliższe dni dla **${city}**\n`;
        result += "------------------------\n";

        const days = Object.entries(forecast).slice(0, 3);
        for (const [date, info] of days) {
            const avg_temp = (info.temp.reduce((a, b) => a + b) / info.temp.length).toFixed(1);
            const avg_hum = Math.round(info.humidity.reduce((a, b) => a + b) / info.humidity.length);
            const avg_wind = (info.wind.reduce((a, b) => a + b) / info.wind.length).toFixed(1);
            const desc = info.description.sort((a, b) =>
                info.description.filter(v => v === b).length - info.description.filter(v => v === a).length
            )[0];
            const emoji = get_weather_emoji(desc);
            const tempEmoji = get_temperature_emoji(avg_temp);

            // Elegancki komentarz o pogodzie
            let comment = "";
            if (avg_temp < 0) comment = "🧊 Będzie mroźno, jak w lodówce – czas na puchaty płaszcz!";
            else if (avg_temp < 10) comment = "🧥 Chłodno, więc nie zapomnij o kurtce i szaliku!";
            else if (avg_temp > 30) comment = "🔥 Gorąco jak w piekarniku! Lód i wiatrak wskazane!";
            else comment = "✅ Temperatura idealna do spędzenia czasu na świeżym powietrzu!";

            result += `📅 ${date}\n${emoji} ${desc}\n🌡️ ${avg_temp}°C ${tempEmoji}, 💧 ${avg_hum}%, 💨 ${avg_wind} m/s\n`;
            result += `💬 ${comment}\n\n`;
        }

        return result.trim();
    } catch (e) {
        return `❌ Błąd pobierania prognozy: ${e.message}`;
    }
}

module.exports = { getForecast };
