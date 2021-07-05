import { useState, createRef } from "react";
import TypeaheadOptions from "./typeaheadOptions";

const Typeahead = ({ options, selectedCountry, setSelectedCountry }) => {
  const [inputVal, setInputVal] = useState(selectedCountry);
  const [focused, setFocused] = useState(false);
  const inputId = "typeahead-input";

  const inputRef = createRef();

  const onOptionSelection = (countryName) => {
    setInputVal(countryName);
    setSelectedCountry(countryName);
    setFocused(false);
  };

  const cancel = () => {
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

  const clearInput = () => {
    setInputVal("");
    inputRef.current.focus();
  }

  return (
    <div className="typeahead-container">
      <input
        tabIndex="1"
        type="text"
        id={inputId}
        className="typeahead-input"
        placeholder="Choose a country"
        value={inputVal}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyPress={onKeyPress}
        onFocus={() => setFocused(true)}
        ref={inputRef}
        // onBlur={onBlur}  onblur intercepts even the onMouseDown?
      />
      {inputVal?.length > 0 && (
        <div
          className="clear-input"
          onClick={clearInput}
        >X</div>
      )}
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
