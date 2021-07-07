import { getLocalTime } from "./util";

const yieldSelf = n => n;

// only mapping things I care about displaying
const displayFuncs = {
  "area": n => n? n.toLocaleString() + " km²" : "--",
  "capital": yieldSelf,
  "demonym": yieldSelf,
  "languages": (langArr) => {
    const langs = langArr.map(l => l.name);
    return langs.join(", ");
  },
  "name": yieldSelf,
  "nativeName": yieldSelf,
  "population": n => n ? n.toLocaleString() : "unknown",
  "subregion": yieldSelf,
  "timezones": (zoneArray) => {
    if (!zoneArray.length) return "Unknown";
    return getLocalTime(zoneArray[0]);
  },
};

const keyDisplayNames = {
  "area": "Area",
  "capital": "Capital",
  "demonym": "Demonym",
  "languages": "Languages",
  "name": "Name",
  "nativeName": "Native Name",
  "population": "Population",
  "subregion": "Region",
  "timezones": "Local Time"
};

const keyDisplayOrder = [
  "name",
  "nativeName",
  "subregion",
  "languages",
  "population",
  "capital",
  "demonym",
  "area",
  "timezones",
];


const Country = ({country}) => {
  window.country = country;
  if (!country) return null;

  return (
    keyDisplayOrder.map((k) => (
      <p key={k}>{keyDisplayNames[k]}: {displayFuncs[k](country[k])}</p>
    ))
  );
};

export default Country;
