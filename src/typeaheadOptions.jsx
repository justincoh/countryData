// Uses filter value to display only the options that match
const TypeaheadOptions = ({options, filterValue}) => {
  const filterOptions = () => {
    if (!filterValue) return options;

    // low-budget string sanitization so '(' don't break the regex
    let filterStr = filterValue.replaceAll("(", "").replaceAll(")", "");
    return options.filter(opt => RegExp(filterStr, 'i').test(opt))
  };

  const filteredOptions = filterOptions();

  if (filteredOptions.length === 0 ) {
    return <p className="country-dropdown-option">No matching countries found</p>
  }

  return (
    <>
      {filteredOptions.slice(0,10).map(opt => (
        <p key={opt} className="country-dropdown-option">{opt}</p>
      ))}
    </>
  );
};

export default TypeaheadOptions;
