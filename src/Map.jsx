import { useEffect, useState } from "react";
import {MapContainer, Marker, Popup, TileLayer} from "react-leaflet";
import "leaflet/dist/leaflet.css"


const Map = ({latitude, longitude}) => {
  const [lat, setLat] = useState(latitude);
  const [lng, setLng] = useState(longitude);

  useEffect(() => {
    console.log("Use effect lat lng: ", latitude, longitude);
    setLat(latitude);
    setLng(longitude);
  }, [latitude, longitude])


  if (!lat || !lng) { return null; }

  console.log("lat at render: ", lat);
  console.log("lng at render: ", lng);
  return (
    <MapContainer center={{lat, lng}} zoom={8} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]}>
        <Popup>
          A pretty CSS3 popup. <br/> Easily customizable.
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default Map;
