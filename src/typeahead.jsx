import { useState } from "react";
import TypeaheadOptions from "./typeaheadOptions";

const Typeahead = ({ options, selectedCountry, setSelectedCountry }) => {
  const [inputVal, setInputVal] = useState(selectedCountry);
  const [focused, setFocused] = useState(false);

  const onOptionSelection = (countryName) => {
    console.log("seelcted")
    setInputVal(countryName);
    setSelectedCountry(countryName);
    setFocused(false);
  };

  const onChange = (e) => {
    setInputVal(e.target.value);
  };

  const onKeyPress = (e) => {
    if (e.key !== "Enter") return;
    onOptionSelection(inputVal);
  }

  return (
    // <div className="typeahead-container" onBlur={() => setFocused(false)}>
    <div className="typeahead-container">
      <input
        type="text"
        className="typeahead-input width-100"
        placeholder="Choose a country"
        value={inputVal}
        onChange={onChange}
        onKeyPress={onKeyPress}
        onFocus={() => setFocused(true)}
      ></input>
      { focused && (
        <div
          className="country-dropdown width-100"
          onClick={(e) => onOptionSelection(e.target.innerText)}
        >
          <TypeaheadOptions options={options} filterValue={inputVal} />
        </div>
      )}
    </div>
  );
};

export default Typeahead;
