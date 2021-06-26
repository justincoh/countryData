import { useState } from "react";

const Typeahead = ({ options, selectedCountry, setSelectedCountry }) => {
  const [inputVal, setInputVal] = useState(selectedCountry);

  const onChange = (e) => {
    setInputVal(e.target.value);
  };

  const onKeyPress = (e) => {
    if (e.key !== "Enter") return;
    setSelectedCountry(inputVal);
  }

  return (
    <input
      type="text"
      placeholder="enter here"
      value={inputVal}
      onChange={onChange}
      onKeyPress={onKeyPress}
    ></input>
  );
};

export default Typeahead;
