export default function ({ weatherObj }) {
  if (!weatherObj) return null;

  const { weather, main } = weatherObj;
  const temp = `${Math.round(main.temp)}ºF`;
  const desc = weather[0].main;
  const feelsLike = `${Math.round(main.feels_like)}ºF`;

  return (
    <p>Weather: {temp} and {desc}, feels like {feelsLike}</p>
  )
};

/*
{
  "coord": {
    "lon": -176.2,
    "lat": -13.3
  },
  "weather": [
    {
      "id": 804,
      "main": "Clouds",
      "description": "overcast clouds",
      "icon": "04n"
    }
  ],
  "base": "stations",
  "main": {
    "temp": 80.76,
    "feels_like": 86.07,
    "temp_min": 80.76,
    "temp_max": 80.76,
    "pressure": 1011,
    "humidity": 81,
    "sea_level": 1011,
    "grnd_level": 1009
  },
  "visibility": 10000,
  "wind": {
    "speed": 18.45,
    "deg": 102,
    "gust": 19.33
  },
  "clouds": {
    "all": 94
  },
  "dt": 1625614938,
  "sys": {
    "country": "WF",
    "sunrise": 1625681303,
    "sunset": 1625722250
  },
  "timezone": 43200,
  "id": 4034749,
  "name": "Wallis et Futuna",
  "cod": 200
}
 */