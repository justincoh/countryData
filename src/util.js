import {WEATHER_API_BASE_URL, WEATHER_APP_ID} from "./constants";

export const buildWeatherUrl = (lat, lng) =>
  `${WEATHER_API_BASE_URL}?lat=${lat}&lon=${lng}&appid=${WEATHER_APP_ID}&units=imperial`

const getOffsetFloat = (tzString) => {
  // where tzstring looks like "UTC+05:30"
  const result = tzString.match(/(\+|-)(\d+):(\d+)/);

  // This means we're in "UTC"
  if (result === null) return 0;

  // sign is + or -
  const [_, sign, hours, minutes] = result;

  let halfHours = 0.0;

  if (minutes !== "00") {
    halfHours = .5;
  }

  return parseFloat(`${sign}${parseFloat(hours) + halfHours}`)
};

// pretty much just pasted from here
// https://stackoverflow.com/questions/8207655/get-time-of-specific-timezone
export const getLocalTime = (tzString) => {
  // create Date object for current location
  const date = new Date();

  // convert to ms
  // subtract local time zone offset
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);

  // create new Date object for different country
  // using supplied offset
  const offset = getOffsetFloat(tzString);
  const dateWithOffset = new Date(utc + (3600000 * offset));

  // return time as a string, "short" means "no seconds"
  return dateWithOffset.toLocaleTimeString([], { timeStyle: "short" });
};

export const throttle = (func, limit) => {
  let blocked;
  return function() {
    if (!blocked) {
      func();
      blocked = true
      setTimeout(() => blocked = false, limit)
    }
  }
};

export const debounce = (func, wait) => {
  let timeout
  return function() {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(), wait)
  }
}
