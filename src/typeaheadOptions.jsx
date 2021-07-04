// Uses filter value to display only the options that match
const TypeaheadOptions = ({options, filterValue}) => {
  const filterOptions = () => {
    if (!filterValue) return options;

    return options.filter(opt => RegExp(filterValue, 'i').test(opt))
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
