import useFetch from "./hooks/useFetch";
import { useEffect, useState } from "react";
import { buildWeatherUrl } from "./util";

const Weather = ({ lat, lng }) => {
  const [weather, setWeather] = useState(null);
  const { isFetching, get } = useFetch("");

  useEffect(() => {
    if (!lat || !lng) return null;

    get(buildWeatherUrl(lat, lng))
      .then(setWeather)
      .catch(console.error);
  }, [lat, lng])

  if(!weather || isFetching) return <p>Weather: --</p>

  const { weather: currentWeather, main } = weather;
  const temp = `${Math.round(main.temp)}ºF`;
  const desc = currentWeather[0].main;
  const feelsLike = `${Math.round(main.feels_like)}ºF`;

  return (
    <p>Weather: {temp} and {desc}, feels like {feelsLike}</p>
  )
};

export default Weather;
