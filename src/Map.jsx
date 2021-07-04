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
  }, [latitude, longitude])

  const TestFunc = () => {
    const map = useMap();
    window.map = map;
    console.log("map IN CHILD: ", map);

    // [lat, lng], zoomLevel, duration in seconds
    map.flyTo([latitude, longitude], 5, { duration: 2 })
    return null;
  };

  // const flyTo = ({lat, lng}) => {
  //   const { current = {}} = mapRef;
  //   if (!current) { return; }
  //
  //   const { leafletElement: map } = current;
  //
  //   map.flyTo([lat, lng], 6, { duration: 2 });
  // };


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
