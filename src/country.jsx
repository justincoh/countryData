const Country = ({country}) => {
  console.log(country);
  window.country = country;
  if (!country) return null;

  return (
    Object.entries(country).map(([k, v]) => (
      <p>{k}: {JSON.stringify(v)}</p>
    ))
  );
};

export default Country;
