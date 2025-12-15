import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L, { type Icon, type LatLngExpression } from 'leaflet';
import type { GymHall, Section } from '../../types/catalog';

const markerIcon: Icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  Київ: { lat: 50.4501, lng: 30.5234 },
  Львів: { lat: 49.8397, lng: 24.0297 },
  Одеса: { lat: 46.4825, lng: 30.7233 },
  Харків: { lat: 49.9935, lng: 36.2304 },
  Дніпро: { lat: 48.4647, lng: 35.0462 },
};

type SectionMapProps = {
  halls: GymHall[];
  sections: Section[];
};

const SectionMap = ({ halls, sections }: SectionMapProps) => {
  const markers = halls
    .map((hall) => {
      const city = hall.center.city;
      const coordinates = cityCoordinates[city];
      if (!coordinates) {
        return null;
      }
      const hallSections = sections.filter((section) => section.hall_name === hall.name);
      return {
        id: hall.id,
        hall,
        coordinates,
        sectionCount: hallSections.length,
      };
    })
    .filter(Boolean) as Array<{
    id: number;
    hall: GymHall;
    coordinates: { lat: number; lng: number };
    sectionCount: number;
  }>;

  if (markers.length === 0) {
    return <div className="empty-state">Немає геоданих для відображення на мапі.</div>;
  }

  const [firstMarker] = markers;

  const mapCenter: LatLngExpression = [firstMarker.coordinates.lat, firstMarker.coordinates.lng];

  return (
    <div className="map-container">
      <MapContainer
        center={mapCenter}
        zoom={6}
        style={{ height: '480px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => {
          const position: LatLngExpression = [marker.coordinates.lat, marker.coordinates.lng];
          return (
            <Marker key={marker.id} position={position} icon={markerIcon}>
            <Popup>
              <strong>{marker.hall.center.name}</strong>
              <br />
              Зал: {marker.hall.name}
              <br />
              Секцій: {marker.sectionCount}
            </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default SectionMap;

