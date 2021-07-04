import "./App.css";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "./constants";
import Country from "./country";
import Typeahead from "./typeahead";
import Loader from "./loader";
import useFetch from "./hooks/useFetch";
import Map from "./Map";

function App() {
  const [countryMap, setCountryMap] = useState({});
  const [selectedCountry, _setSelectedCountry] = useState(null);
  const [countryNameList, setNameList] = useState([]); // for display with proper case
  const { isFetching, get } = useFetch(`${API_BASE_URL}`);

  // Simple wrapper so we don't have to care about string case
  const setSelectedCountry = (countryName) => _setSelectedCountry(countryName.toLowerCase());

  useEffect(() => {
    fetchCountryList()
      .then((countryList) => {
        window.countries = countryList; // for dev
        buildInitialState(countryList)
      });
  }, []);

  const fetchCountryList = async () => {
    const res = await get("/all")
    return res;
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

  const selectedCountryObj = countryMap[selectedCountry] || {};
  let center = null;
  if (selectedCountryObj) {
    center = selectedCountryObj.latlng;
  }

  return (
    <div className="App">
      { isFetching && <Loader />}
      { !isFetching && (
        <>
          <div className="flex-container">
            <div className="column flag-display">
              <>
                <img id="flag" width="250" src={selectedCountryObj?.flag} />
                <Country country={selectedCountryObj} />
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
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
