const axios = require('axios');

const API_KEY = "12b8db2791119ee41c7bd331128a4c35";

function getWeatherEmoji(desc) {
    const d = desc.toLowerCase();
    if (d.includes("clear")) return "☀️";
    if (d.includes("cloud")) return "☁️";
    if (d.includes("rain")) return "🌧️";
    if (d.includes("snow")) return "❄️";
    if (d.includes("storm") || d.includes("thunder")) return "⛈️";
    if (d.includes("fog") || d.includes("mist")) return "🌫️";
    return "🌈";
}

function getTemperatureEmoji(temp) {
    if (temp < 0) return "🥶";
    if (temp < 10) return "🧤";
    if (temp < 18) return "🙂";
    if (temp < 26) return "😊";
    return "🥵";
}

function toKMH(ms) {
    return (ms * 3.6).toFixed(2);
}

function getWindDirection(deg) {
    const directions = ["🌬️ N", "↗️ NE", "➡️ E", "↘️ SE", "⬇️ S", "↙️ SW", "⬅️ W", "↖️ NW"];
    return directions[Math.round(deg / 45) % 8];
}

function getWeatherComment(temp, desc, uv) {
    let comment = "";
    
    // Śmieszne komentarze o temperaturze
    if (temp < 0) comment += "🧊 Zimno jak w psiarni. Czapka obowiązkowa, rękawice, a może jeszcze skarpety na głowę?";
    else if (temp < 10) comment += "🧥 Kurtka, szalik i może jeszcze jakieś magiczne zaklęcia, żeby się nie zamrozić!";
    else if (temp > 30) comment += "🔥 Upał jak w piekarniku! Lód, wiatrak, a może najlepsza opcja – woda na głowę!";
    else comment += "✅ W miarę normalna temperatura. Ale nie zapominaj o kawie na zewnątrz.";

    // Komentarze o pogodzie
    if (/deszcz|rain/i.test(desc)) comment += " ☔ Deszcz pada, parasol się przyda. Może nawet podwójny!";
    if (/śnieg|snow/i.test(desc)) comment += " ❄️ Śnieg na ziemi, bałwan w zasięgu wzroku. Czas na narty?";
    
    // Komentarze o UV
    if (uv >= 7) comment += " 🧴 Uwaga! Wysokie UV – Krem SPF 50+ obowiązkowy, chyba że chcesz zrobić sobie przyjemność w postaci przypieczonej skóry!";
    
    // Elegancka zakończenie
    comment += "\n🌟 Ostatecznie – niezależnie od pogody, życie jest piękne, a kawa smakuje zawsze najlepiej w pełnym słońcu!";

    return comment;
}

async function getCurrentWeather(city) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&lang=pl&units=metric`;
        const res = await axios.get(url);
        const data = res.data;

        const {
            main: { temp, feels_like, pressure, humidity, temp_min, temp_max, sea_level, grnd_level },
            wind: { speed, deg },
            visibility,
            clouds: { all: cloudiness },
            sys: { sunrise, sunset },
            weather,
            coord
        } = data;

        const desc = weather[0].description;
        const emoji = getWeatherEmoji(desc);
        const sunriseTime = new Date(sunrise * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
        const sunsetTime = new Date(sunset * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

        const windAlert = speed > 10 ? "⚠️ Silny wiatr!" : "";
        const tempEmoji = getTemperatureEmoji(temp);
        const feelsEmoji = getTemperatureEmoji(feels_like);
        const windDir = getWindDirection(deg);
        const visibilityKm = (visibility / 1000).toFixed(1);

        // 🧴 UV Index (osobny endpoint)
        const uvRes = await axios.get(`https://api.openweathermap.org/data/2.5/uvi?appid=${API_KEY}&lat=${coord.lat}&lon=${coord.lon}`);
        const uvIndex = uvRes.data.value;

        const comment = getWeatherComment(temp, desc, uvIndex);

        let result = `📍 Pogoda teraz dla **${city}**:\n`;
        result += `\n🌐 Współrzędne: ${coord.lat.toFixed(2)}, ${coord.lon.toFixed(2)}`;
        result += `\n🕒 Czas lokalny: ${new Date().toLocaleTimeString("pl-PL")}`;
        result += `\n🌡️ Temperatura: ${temp.toFixed(2)}°C ${tempEmoji}`;
        result += `\n✋🏻 Odczuwalna: ${feels_like.toFixed(2)}°C ${feelsEmoji}`;
        result += `\n📉 Min: ${temp_min.toFixed(1)}°C, 📈 Max: ${temp_max.toFixed(1)}°C`;
        result += `\n🌃 Niebo: ${desc} ${emoji}`;
        result += `\n🎈 Ciśnienie: ${pressure} hPa`;
        if (sea_level) result += `\n🌊 Poziom morza: ${sea_level} hPa`;
        if (grnd_level) result += `\n🏔️ Poziom gruntu: ${grnd_level} hPa`;
        result += `\n💨 Wiatr: ${toKMH(speed)} km/h ${windDir} ${windAlert}`;
        result += `\n💧 Wilgotność: ${humidity}%`;
        result += `\n☁️ Pochmurność: ${cloudiness}%`;
        result += `\n👁️ Widoczność: ${visibilityKm} km`;
        result += `\n🧴 UV Index: ${uvIndex}`;
        result += `\n🌅 Wschód słońca: ${sunriseTime}`;
        result += `\n🌇 Zachód słońca: ${sunsetTime}`;
        result += `\n\n💬 ${comment}`;

        return result;
    } catch (e) {
        return `❌ Nie udało się pobrać danych dla "${city}". Sprawdź nazwę miasta.`;
    }
}

module.exports = { getCurrentWeather };
