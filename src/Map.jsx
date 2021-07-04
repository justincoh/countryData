import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css"


const Map = ({latitude, longitude, country}) => {
  const FlyTo = () => {
    const map = useMap();
    const zoomLevel = zoomSwitcher(country.area);

    // [lat, lng], zoomLevel, duration in seconds
    map.flyTo([latitude, longitude], zoomLevel, { duration: 2 })

    return null;
  };

  const zoomSwitcher = (area) => {
    if (!area) { return 6; }
    if (area < 1) { return 12; }
    if (area < 1000) { return 10; }
    if (area < 100000) { return 8; }
    if (area < 1000000) { return 6; }
    if (area <= 10000000) { return 4; }
    if (area > 10000000) { return 2; }
  }

  return (
    <MapContainer
      center={[latitude || 10, longitude || 10]}
      zoom={4}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo />
      {/*<Marker position={[lat, lng]}>*/}
      {/*  <Popup>*/}
      {/*    A pretty CSS3 popup. <br/> Easily customizable.*/}
      {/*  </Popup>*/}
      {/*</Marker>*/}
    </MapContainer>
  );
};

export default Map;
