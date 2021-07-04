const Country = ({country}) => {
  console.log(country);
  window.country = country;
  if (!country) return null;

  // things to care about:
  // name, capital, population, demonym, subregion, languages
  const infoToDisplay = [
    "capital",
    "demonym",
    "languages",
    "latlng",
    "name",
    "population",
    "subregion",
  ];

  return (
    Object.entries(country).map(([k, v]) => {
      if (infoToDisplay.includes(k)) {
        return <p key={k}>{k}: {JSON.stringify(v)}</p>
      } else { return null; }
    })
  );
};

export default Country;
