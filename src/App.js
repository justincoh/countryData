import "./App.css";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "./constants";
import Country from "./country";
import Typeahead from "./typeahead";

function App() {
  // const [countries, setCountries] = useState([]); // for dev
  const [countryMap, setCountryMap] = useState({});
  const [selectedCountry, _setSelectedCountry] = useState(null);
  const [countryNameList, setNameList] = useState([]); // for display with proper case
  // Simple wrapper so we don't have to care about string case
  const setSelectedCountry = (countryName) => _setSelectedCountry(countryName.toLowerCase());

  useEffect(() => {
    fetchCountryList()
      .then((countryList) => {
        window.countries = countryList; // for dev
        buildInitialState(countryList)
      });
  }, []);

  useEffect(() => {
    console.log("selected changed: ", selectedCountry)
  }, [selectedCountry])

  const fetchCountryList = async () => {
    const res = await fetch(`${API_BASE_URL}/all`);
    const json = await res.json();
    return json;
  }

  const chooseRandomCountry = (countryList) => {
    const len = countryList.length;
    const idx = Math.round(Math.random() * len);
    const selected = countryList[idx]
    setSelectedCountry(selected.name);
  };

  const buildInitialState = (countryList) => {
    const mapObj = {};
    const nameList = [];

    countryList.forEach(country => {
      mapObj[country.name.toLowerCase()] = country;
      nameList.push(country.name);
    });

    setCountryMap(mapObj);
    setNameList(nameList);
    chooseRandomCountry(countryList);
  };

  return (
    <div className="App">
      <div className="column country-list">
        <Typeahead
          options={countryNameList}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
        />
        { countryNameList.map((countryName) => (
          <p onClick={() => setSelectedCountry(countryName)} >{countryName}</p>
        ))}
      </div>
      <div className="column flag-display">
        <img id="flag" width="250" src={countryMap[selectedCountry]?.flag} />
        <Country country={countryMap[selectedCountry]} />
      </div>
    </div>
  );
}

export default App;
