import "./App.css";
import { useEffect, useState } from "react";
import { COUNTRY_API_BASE_URL } from "./constants";
import { buildWeatherUrl } from "./util";
import Country from "./country";
import Typeahead from "./typeahead";
import Loader from "./loader";
import useFetch from "./hooks/useFetch";
import Map from "./Map";
import WeatherLine from "./weatherLine";

function App() {
  const [countryMap, setCountryMap] = useState({});
  const [selectedCountryName, _setSelectedCountryName] = useState(null);
  const [countryNameList, setNameList] = useState([]); // for display with proper case
  const [weather, setWeather] = useState(null);
  const {
    isFetching: isFetchingCountries,
    get: getCountries,
  } = useFetch(`${COUNTRY_API_BASE_URL}`);
  const {
    isFetching: isFetchingWeather,
    get: getWeather,
  } = useFetch("");

  // Simple wrapper so we don't have to care about string case
  const setSelectedCountryName = (countryName) => _setSelectedCountryName(countryName.toLowerCase());

  useEffect(() => {
    fetchCountryList()
      .then((countryList) => {
        window.countries = countryList; // for dev
        buildInitialState(countryList)
      });
  }, []);

  useEffect(() => {
    if (!selectedCountryName) { return; }

    const { latlng: [lat, lng] } = countryMap[selectedCountryName];
    getWeather(buildWeatherUrl(lat, lng))
      .then(setWeather)
      .catch(console.error);
  }, [selectedCountryName])

  const fetchCountryList = async () => {
    const res = await getCountries("/all")
    return res;
  };

  const chooseRandomCountry = (countryList) => {
    const len = countryList.length;
    const idx = Math.round(Math.random() * len);
    const selected = countryList[idx]
    setSelectedCountryName(selected.name);
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

  const selectedCountryObj = countryMap[selectedCountryName] || {};
  let center = null;
  if (selectedCountryObj) {
    center = selectedCountryObj.latlng;
  }

  return (
    <div className="App">
      { isFetchingCountries && <Loader />}
      { !isFetchingCountries && (
        <>
          <div className="flex-container">
            <div className="column flag-display">
              <>
                <img id="flag" width="250" src={selectedCountryObj?.flag} />
                <Country country={selectedCountryObj} />
                <WeatherLine weatherObj={weather} />
              </>
            </div>
            {center && <Map
              country={selectedCountryObj}
              latitude={center[0]}
              longitude={center[1]}
            /> }
            <div className="column country-list">
              <Typeahead
                options={countryNameList}
                selectedCountryName={selectedCountryName}
                setSelectedCountryName={setSelectedCountryName}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
