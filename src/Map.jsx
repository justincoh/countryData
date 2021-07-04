import { useEffect, createRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css"


const Map = ({latitude, longitude}) => {
  const mapRef = createRef();

  useEffect(() => {
    console.log("Use effect lat lng: ", latitude, longitude);
    // if (latitude && longitude) {
    //   flyTo({ lat: latitude, lng: longitude});
    // }
  }, [latitude, longitude])

  const TestFunc = (props) => {
    const map = useMap();
    console.log("map IN CHILD: ", map);
    return null;
  };

  const flyTo = ({lat, lng}) => {
    const { current = {}} = mapRef;
    if (!current) { return; }

    const { leafletElement: map } = current;

    // [lat, lng], zoomLevel, duration in seconds
    map.flyTo([lat, lng], 6, { duration: 2 });
  };


  console.log("lat at render: ", latitude);
  console.log("lng at render: ", longitude);
  return (
    <MapContainer
      center={[latitude || 10, longitude || 10]}
      zoom={8}
      ref={mapRef}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <TestFunc />
      {/*<Marker position={[lat, lng]}>*/}
      {/*  <Popup>*/}
      {/*    A pretty CSS3 popup. <br/> Easily customizable.*/}
      {/*  </Popup>*/}
      {/*</Marker>*/}
    </MapContainer>
  );
};

export default Map;
