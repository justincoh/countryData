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
};

const keyDisplayNames = {
  "area": "Area",
  "capital": "Capital",
  "demonym": "Demonym",
  "languages": "Languages",
  "name": "Name",
  "nativeName": "Native Name",
  "population": "Population",
  "subregion": "Sub-region",
};


const Country = ({country}) => {
  console.log(country);
  window.country = country;
  if (!country) return null;

  return (
    Object.entries(country).map(([k, v]) => {
      if (k in displayFuncs) {
        return <p key={k}>{keyDisplayNames[k]}: {displayFuncs[k](v)}</p>
      } else { return null; }
    })
  );
};

export default Country;
