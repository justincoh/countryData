import "./App.css";
import { useEffect, useState } from "react";
import { COUNTRY_API_BASE_URL } from "./constants";
import Country from "./country";
import Typeahead from "./typeahead";
import Loader from "./loader";
import useFetch from "./hooks/useFetch";
import useWindowSize from "./hooks/useWindowSize";
import Map from "./Map";
import Weather from "./weather";

function App() {
  const [countryMap, setCountryMap] = useState({});
  const [selectedCountryName, _setSelectedCountryName] = useState(null);
  const [countryNameList, setNameList] = useState([]); // for display with proper case
  const {isFetching, get: getCountries} = useFetch(`${COUNTRY_API_BASE_URL}`);
  const windowSize = useWindowSize();

  // Simple wrapper so we don't have to care about string case
  const setSelectedCountryName = (countryName) => _setSelectedCountryName(countryName.toLowerCase());

  useEffect(() => {
    fetchCountryList()
      .then((countryList) => {
        window.countries = countryList; // for dev
        buildInitialState(countryList)
      });
  }, []);

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

  const selectedCountryObj = countryMap[selectedCountryName] || null;
  let center = null;
  if (selectedCountryObj) {
    center = selectedCountryObj.latlng;
  }

  return (
    <div className="App">
      { isFetching&& <Loader />}
      { !isFetching&& (
        <>
          <div className="flex-container">
            <div className="column country-list">
              <Typeahead
                options={countryNameList}
                selectedCountryName={selectedCountryName}
                setSelectedCountryName={setSelectedCountryName}
              />
            </div>
            {center && <Map
              country={selectedCountryObj}
              latitude={center[0]}
              longitude={center[1]}
            /> }
            <div className="column flag-display">
              {selectedCountryObj && (
                <>
                <img id="flag" width="250" src={selectedCountryObj.flag} />
                <Country country={selectedCountryObj} />
                <Weather
                  lat={selectedCountryObj.latlng[0]}
                  lng={selectedCountryObj.latlng[1]}
                />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
