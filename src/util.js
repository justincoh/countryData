import {WEATHER_API_BASE_URL, WEATHER_APP_ID} from "./constants";

export const buildWeatherUrl = (lat, lng) =>
  `${WEATHER_API_BASE_URL}?lat=${lat}&lon=${lng}&appid=${WEATHER_APP_ID}&units=imperial`
