import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Marcadores (igual que original)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// -------------  AÑADIDO: Eliminar líneas entre teselas  -------------
// Extendemos L.GridLayer para que cada tesela tenga +1px en ancho/alto (evita gaps)
const origInitTile = L.GridLayer.prototype._initTile;
L.GridLayer.include({
  _initTile: function(tile) {
    origInitTile.call(this, tile);
    const tileSize = this.getTileSize();
    // Agrandar 1px para tapar la línea
    tile.style.width  = `${tileSize.x + 1}px`;
    tile.style.height = `${tileSize.y + 1}px`;
  }
});
// ------------------------------------------------------------------

// SpainMapController igual que original (centra España tras render)
function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6);
    }, 600);
  }, [map]);
  return null;
}

export default function App() {
  // (estado, fetch, etc., igual que original...)
  const [events, setEvents] = useState([]);
  useEffect(() => { fetchEvents(); /* manejar auth... */ }, []);
  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.date >= today);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#020617] text-white overflow-hidden ...">
      {/* Estilos globales (sin cambios importantes) */}
      <style>{globalStyles}</style>

      {/* Contenido principal (sección 'map') */}
      {view === 'map' && (
        <div className="absolute inset-0 z-0 bg-[#aad3df]">
          <MapContainer center={[40.4167, -3.7037]} zoom={6} className="h-full w-full">
            <SpainMapController />
            {/* TileLayer EN ESPAÑOL: MapTiler con language=es */}
            <TileLayer
              url="https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=TU_API_KEY&language=es"
              attribution='Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contribs, <a href="https://maptiler.com">MapTiler</a>'
            />
            {/* Marcadores de eventos */}
            {publicEvents.map(ev => ev.lat && (
              <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                <Popup className="text-center text-indigo-600 font-bold uppercase text-xs">{ev.title}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
      {/* (Otros views: home, profile, etc., sin cambios en este contexto) */}
    </div>
  );
}
