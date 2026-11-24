// 현재 날씨(Open-Meteo, 키 불필요). 실패하면 null — 날씨는 기록에서 직접 고를 수도 있다.

export function weatherKeyFromCode(code) {
  if (code == null) return null;
  if (code <= 1) return 'clear';
  if (code <= 48) return 'cloudy';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  return 'rain'; // 51–67 이슬비·비, 80–82 소나기, 95+ 뇌우
}

export async function currentWeather({ lat, lng }) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,weather_code&timezone=auto`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    return {
      weather: weatherKeyFromCode(j.current?.weather_code),
      temp: j.current?.temperature_2m != null ? Math.round(j.current.temperature_2m) : null,
    };
  } catch {
    return null;
  }
}
