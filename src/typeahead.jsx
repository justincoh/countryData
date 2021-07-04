import { useState } from "react";
import TypeaheadOptions from "./typeaheadOptions";

const Typeahead = ({ options, selectedCountry, setSelectedCountry }) => {
  const [inputVal, setInputVal] = useState(selectedCountry);
  const [focused, setFocused] = useState(false);
  const inputId = "typeahead-input";

  const onOptionSelection = (countryName) => {
    console.log("on option selection")
    setInputVal(countryName);
    setSelectedCountry(countryName);
    setFocused(false);
  };

  const cancel = () => {
    // setInputVal(selectedCountry);
    setFocused(false);
  };

  const onChange = (e) => {
    setInputVal(e.target.value);
  };

  const onKeyDown = (e) => {
    if (e.key !== "Escape") return;
    cancel();
  };

  const onKeyPress = (e) => {
    if (e.key !== "Enter") return;
    onOptionSelection(inputVal);
  }

  // const onBlur = (e) => {
  //   console.log("on blur: ", e.target);
  //   if (e.target.id === inputId) { // doesn't work, still triggers on any click anywhere
  //     return;
  //   }
  //
  //   cancel();
  // }

  return (
    <div className="typeahead-container">
      <input
        tabIndex="1"
        type="text"
        id={inputId}
        className="typeahead-input width-100"
        placeholder="Choose a country"
        value={inputVal}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyPress={onKeyPress}
        // onMouseDown={() => console.log("on mouse down")}
        onFocus={() => setFocused(true)}
        // onBlur={onBlur}  onblur intercepts the on mouse down even?
      />
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
