import { useState, createRef } from "react";
import TypeaheadOptions from "./typeaheadOptions";

const Typeahead = ({ options, selectedCountryName, setSelectedCountryName }) => {
  const [inputVal, setInputVal] = useState(selectedCountryName);
  const [focused, setFocused] = useState(false);

  const inputRef = createRef();

  const onOptionSelection = (countryName) => {
    setInputVal(countryName);
    setSelectedCountryName(countryName);
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

    // don't select it unless it's valid
    if (options.includes(inputVal)) {
      onOptionSelection(inputVal);
    }
  }

  const clearInput = () => {
    setInputVal("");
    inputRef.current.focus();
  }

  return (
    <div className="typeahead-container">
      <input
        tabIndex="0"
        type="text"
        id="typeahead-input"
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
