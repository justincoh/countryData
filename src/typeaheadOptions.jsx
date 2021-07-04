// Uses filter value to display only the options that match
const TypeaheadOptions = ({options, filterValue}) => {
  const filterOptions = () => {
    if (!filterValue) return options;

    // easy way to strip things that break regex
    let filterStr = filterValue.replaceAll("(", "").replaceAll(")", "");
    return options.filter(opt => RegExp(filterStr, 'i').test(opt))
  };

  return (
    <>
      {filterOptions().map(opt => (
        <p value={opt} key={opt} className="country-dropdown-option">{opt}</p>
      ))}
    </>
  );
};

export default TypeaheadOptions;
