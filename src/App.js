
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart,
  MapPin,
  Calendar,
  Sun,
  Moon,
  PlusCircle,
  Trash2,
  Map as MapIcon,
  Clock,
  LayoutList,
  ShieldCheck,
  Sparkles,
  Loader2,
  ArrowLeft,
  Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// ============================================================
// CONFIGURACIÓN DE ESTILOS (MAPA SIN BORDE Y SIN LÍNEAS)
// ============================================================
const globalStyles = `
  html, body, #root, #__next {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: inherit;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    transition: background-color 0.3s, color 0.3s;
  }

  .leaflet-container {
    background-color: #aad3df !important;
    height: 100% !important;
    width: 100% !important;
    border: 0 !important;
    outline: 0 !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  .leaflet-map-clean {
    border: 0 !important;
    outline: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }

  /* Evita líneas blancas entre tiles */
  .leaflet-tile {
    border: 0 !important;
    outline: 0 !important;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .leaflet-pane,
  .leaflet-tile-pane,
  .leaflet-overlay-pane,
  .leaflet-marker-pane,
  .leaflet-shadow-pane,
  .leaflet-popup-pane {
    overflow: hidden !important;
  }

  .leaflet-tile-pane {
    transform: translateZ(0);
  }

  .leaflet-container img {
    max-width: none !important;
    max-height: none !important;
  }

  .leaflet-control-container .leaflet-control {
    box-shadow: none !important;
    border: 0 !important;
  }

  .leaflet-control-attribution {
    background: rgba(255,255,255,0.75) !important;
    border: 0 !important;
    box-shadow: none !important;
    border-radius: 8px !important;
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .dark-theme { background-color: #020617; color: white; }
  .light-theme { background-color: #f8fafc; color: #0f172a; }

  .card-dark {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    color: white;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }

  .card-light {
    background-color: white;
    border: 1px solid #e2e8f0;
    color: #0f172a;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  @keyframes admin-pulse {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.15); color: #ef4444; }
    100% { transform: scale(1); color: #818cf8; }
  }

  .pulse-admin { animation: admin-pulse 2s infinite; }
`;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// CONTROLADOR DE MAPA: RECALCULA TAMAÑO Y CENTRO
function MapResizer({ center }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize(true);

      if (center) {
        map.flyTo(center, 13, { animate: true });
      } else {
        map.flyTo([40.4167, -3.7037], 6, { animate: true });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [map, center]);

  return null;
}

const LogoSVG = () => (
  <img
    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png"
    alt="Eventora"
    style={{ height: 22, width: 'auto' }}
  />
);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function getInitialFavorites() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem('eventora_favs_v4');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(getInitialFavorites);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    city: '',
    localidad: '',
    address: '',
    time: '21:00',
    date: '',
    category: 'MUSICA',
    image_url: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
    }
  }, [favorites]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') {
        setProfile({ role: 'admin' });
      } else {
        setProfile(null);
      }
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const fetchEvents = async () => {
    if (!isSupabaseConfigured) return;

    const { data, error } = await supabase.from('events').select('*');
    if (error) {
      console.error('Error cargando eventos:', error.message);
      return;
    }

    if (data) {
      setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
    }
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const needsUpper = ['title', 'city', 'localidad'];
    const val = needsUpper.includes(name) ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: val }));
  };

  const generateAIImage = () => {
    if (!form.title) return alert('Escribe un título primero');
    setIsGenerating(true);
    const url = `https://image.pollinations.ai/prompt/professional_event_photography_${encodeURIComponent(
      form.title
    )}?width=800&height=600&seed=${Date.now()}`;
    setForm((prev) => ({ ...prev, image_url: url }));
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const handleGalleryUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setForm((prev) => ({ ...prev, image_url: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter((e) => e.status === 'approved' && e.date >= today);
  const filteredEvents = publicEvents.filter(
    (e) => selectedCategory === 'TODOS' || e.category === selectedCategory
  );
  const favoriteEvents = publicEvents.filter((e) => favorites.includes(e.id));
  const citiesList = [...new Set(publicEvents.map((e) => e.city))];

  return (
    <div
      className={isDark ? 'dark-theme' : 'light-theme'}
      style={{
        margin: 0,
        padding: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <style>{globalStyles}</style>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* NAV SUPERIOR */}
        <nav
          style={{
            height: 65,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px',
            zIndex: 2000,
            borderBottom: '1px solid rgba(128,128,128,0.2)',
            background: isDark ? '#0f172a' : '#fff'
          }}
        >
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setView('home');
              setSelectedEvent(null);
            }}
          >
            <LogoSVG />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck
                size={28}
                className={events.filter((e) => e.status === 'pending').length > 0 ? 'pulse-admin' : ''}
                style={{ color: '#6366f1', cursor: 'pointer' }}
                onClick={() => setView('admin')}
              />
            )}

            <button
              onClick={() => setIsDark(!isDark)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              {isDark ? <Sun size={24} color="#facc15" /> : <Moon size={24} color="#4f46e5" />}
            </button>

            <Sparkles
              size={24}
              color="#6366f1"
              style={{ cursor: 'pointer' }}
              onClick={() => setView('profile')}
            />
          </div>
        </nav>

        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* VISTA MAPA */}
          {view === 'map' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                background: '#aad3df',
                overflow: 'hidden',
                margin: 0,
                padding: 0
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1000,
                  width: '85%',
                  maxWidth: 320
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 15,
                    padding: '5px 15px',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    border: 'none'
                  }}
                >
                  <Search size={18} color="#6366f1" />
                  <select
                    onChange={(e) => {
                      const city = e.target.value;
                      if (city === 'ESPAÑA') {
                        setMapCenter(null);
                      } else {
                        fetch(
                          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                            city + ', Spain'
                          )}`
                        )
                          .then((r) => r.json())
                          .then((d) =>
                            d[0] &&
                            setMapCenter([parseFloat(d[0].lat), parseFloat(d[0].lon)])
                          );
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 12,
                      border: 'none',
                      outline: 'none',
                      fontWeight: 900,
                      fontSize: 12,
                      color: '#0f172a',
                      background: 'transparent'
                    }}
                  >
                    <option value="ESPAÑA">📍 BUSCAR CIUDAD...</option>
                    {citiesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <MapContainer
                className="leaflet-map-clean"
                center={[40.41, -3.7]}
                zoom={6}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  margin: 0,
                  padding: 0,
                  border: 0,
                  outline: 0,
                  boxShadow: 'none'
                }}
                zoomSnap={1}
                zoomControl={false}
              >
                <MapResizer center={mapCenter} />

                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                  maxZoom={19}
                  keepBuffer={2}
                  updateWhenIdle
                />

                {publicEvents.map((ev) =>
                  ev.lat != null && ev.lng != null ? (
                    <Marker
                      key={ev.id}
                      position={[Number(ev.lat), Number(ev.lng)]}
                    >
                      <Popup>
                        <b>{ev.title}</b>
                        <br />
                        {ev.city}
                      </Popup>
                    </Marker>
                  ) : null
                )}
              </MapContainer>
            </div>
          )}

          {/* HOME */}
          {view === 'home' && !selectedEvent && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div
                className="no-scrollbar"
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '15px 20px',
                  overflowX: 'auto',
                  background: isDark ? '#020617' : '#f8fafc',
                  borderBottom: '1px solid rgba(128,128,128,0.1)'
                }}
              >
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '10px 22px',
                        borderRadius: 25,
                        border: 'none',
                        background:
                          selectedCategory === cat
                            ? '#4f46e5'
                            : isDark
                            ? '#1e293b'
                            : '#e2e8f0',
                        color: selectedCategory === cat ? 'white' : 'inherit',
                        fontSize: 10,
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              <div
                className="no-scrollbar"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 20,
                  paddingBottom: 150
                }}
              >
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={isDark ? 'card-dark' : 'card-light'}
                    style={{
                      borderRadius: 32,
                      overflow: 'hidden',
                      marginBottom: 20
                    }}
                  >
                    <div style={{ position: 'relative', height: 180 }}>
                      <img
                        src={
                          ev.image_url ||
                          'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'
                        }
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        alt=""
                      />

                      <button
                        onClick={() => toggleFavorite(ev.id)}
                        style={{
                          position: 'absolute',
                          top: 15,
                          right: 15,
                          padding: 10,
                          background: 'white',
                          borderRadius: '50%',
                          border: 'none',
                          color: '#ef4444',
                          display: 'flex'
                        }}
                      >
                        <Heart size={20} fill={favorites.includes(ev.id) ? 'red' : 'none'} />
                      </button>
                    </div>

                    <div style={{ padding: 20, textAlign: 'center' }}>
                      <h3 style={{ fontWeight: 900, fontSize: 18 }}>{ev.title}</h3>
                      <p
                        style={{
                          fontSize: 10,
                          color: '#6366f1',
                          fontWeight: 800,
                          letterSpacing: 1,
                          marginBottom: 15
                        }}
                      >
                        {ev.city} | {ev.date}
                      </p>
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        style={{
                          width: '100%',
                          padding: 14,
                          borderRadius: 16,
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: 11
                        }}
                      >
                        DETALLES
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETALLES */}
          {selectedEvent && (
            <div
              className="no-scrollbar"
              style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}
            >
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontWeight: 900,
                  display: 'flex',
                  gap: 8,
                  marginBottom: 20
                }}
              >
                <ArrowLeft /> VOLVER
              </button>

              <div
                className={isDark ? 'card-dark' : 'card-light'}
                style={{ borderRadius: 30, overflow: 'hidden', padding: 0 }}
              >
                <img
                  src={selectedEvent.image_url}
                  style={{ width: '100%', height: 250, objectFit: 'cover' }}
                  alt=""
                />

                <div style={{ padding: 25 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 15 }}>
                    {selectedEvent.title}
                  </h2>

                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Calendar color="#6366f1" /> <b>{selectedEvent.date}</b>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <Clock color="#6366f1" /> <b>{selectedEvent.time}H</b>
                    </div>

                    <div
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            selectedEvent.address +
                              ' ' +
                              selectedEvent.localidad +
                              ' ' +
                              selectedEvent.city
                          )}`
                        )
                      }
                      style={{
                        background: 'rgba(99,102,241,0.1)',
                        padding: 20,
                        borderRadius: 15,
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: '1px dashed #6366f1'
                      }}
                    >
                      <MapPin color="#6366f1" style={{ margin: '0 auto 5px' }} />
                      <br />
                      <b>
                        {selectedEvent.address}, {selectedEvent.localidad} - {selectedEvent.city}
                      </b>
                      <br />
                      <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 900 }}>
                        INICIAR GPS (GOOGLE MAPS)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CREAR EVENTO */}
          {view === 'create' && (
            <div
              className="no-scrollbar"
              style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 150 }}
            >
              <div
                className={isDark ? 'card-dark' : 'card-light'}
                style={{
                  padding: 20,
                  borderRadius: 30,
                  gap: 10,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 16 }}>
                  AÑADIR EVENTO
                </h2>

                <input
                  name="title"
                  placeholder="TÍTULO"
                  style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 10,
                    border: 'none',
                    background: 'rgba(128,128,128,0.1)',
                    color: 'inherit',
                    fontWeight: 700
                  }}
                  value={form.title}
                  onChange={handleInputChange}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                  <input
                    name="city"
                    placeholder="CIUDAD"
                    style={{
                      width: '100%',
                      padding: 14,
                      borderRadius: 10,
                      border: 'none',
                      background: 'rgba(128,128,128,0.1)',
                      color: 'inherit',
                      fontWeight: 700
                    }}
                    value={form.city}
                    onChange={handleInputChange}
                  />

                  <select
                    name="category"
                    style={{
                      width: '100%',
                      padding: 14,
                      borderRadius: 10,
                      border: 'none',
                      background: 'rgba(128,128,128,0.1)',
                      color: 'inherit',
                      fontWeight: 700
                    }}
                    value={form.category}
                    onChange={handleInputChange}
                  >
                    <option value="MUSICA">MÚSICA</option>
                    <option value="GASTRONOMIA">GASTRONOMÍA</option>
                    <option value="TAURINO">TAURINO</option>
                    <option value="FIESTAS PATRONALES">FIESTAS</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                </div>

                <input
                  name="localidad"
                  placeholder="LOCALIDAD"
                  style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 10,
                    border: 'none',
                    background: 'rgba(128,128,128,0.1)',
                    color: 'inherit',
                    fontWeight: 700
                  }}
                  value={form.localidad}
                  onChange={handleInputChange}
                />

                <input
                  name="address"
                  placeholder="DIRECCIÓN"
                  style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 10,
                    border: 'none',
                    background: 'rgba(128,128,128,0.1)',
                    color: 'inherit',
                    fontWeight: 700
                  }}
                  value={form.address}
                  onChange={handleInputChange}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    name="date"
                    type="date"
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 10,
                      border: 'none',
                      background: 'rgba(128,128,128,0.1)',
                      color: 'inherit'
                    }}
                    value={form.date}
                    onChange={handleInputChange}
                  />
                  <input
                    name="time"
                    type="time"
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 10,
                      border: 'none',
                      background: 'rgba(128,128,128,0.1)',
                      color: 'inherit'
                    }}
                    value={form.time}
                    onChange={handleInputChange}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    onClick={generateAIImage}
                    style={{
                      padding: 12,
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 9,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5
                    }}
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    IA FOTO
                  </button>

                  <label
                    style={{
                      padding: 12,
                      background: '#1e293b',
                      color: 'white',
                      textAlign: 'center',
                      borderRadius: 10,
                      fontSize: 9,
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    GALERÍA
                    <input type="file" style={{ display: 'none' }} onChange={handleGalleryUpload} />
                  </label>
                </div>

                {form.image_url && (
                  <img
                    src={form.image_url}
                    style={{
                      width: '100%',
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: 15
                    }}
                    alt=""
                  />
                )}

                <button
                  style={{
                    width: '100%',
                    background: '#4f46e5',
                    color: 'white',
                    padding: 15,
                    borderRadius: 12,
                    border: 'none',
                    fontWeight: 900
                  }}
                >
                  ENVIAR REVISIÓN
                </button>
              </div>
            </div>
          )}

          {/* GUARDADOS */}
          {view === 'favorites' && (
            <div
              className="no-scrollbar"
              style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}
            >
              <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>
                MIS GUARDADOS
              </h2>

              {favoriteEvents.length === 0 ? (
                <p
                  style={{
                    textAlign: 'center',
                    opacity: 0.7,
                    marginTop: 50,
                    fontWeight: 700,
                    padding: 40
                  }}
                >
                  EN ESTOS MOMENTOS NO HAY NINGÚN EVENTO GUARDADO
                </p>
              ) : (
                favoriteEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={isDark ? 'card-dark' : 'card-light'}
                    style={{
                      display: 'flex',
                      gap: 15,
                      padding: 15,
                      borderRadius: 25,
                      marginBottom: 12,
                      alignItems: 'center'
                    }}
                  >
                    <img
                      src={ev.image_url}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 15,
                        objectFit: 'cover'
                      }}
                      alt=""
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 900 }}>{ev.title}</p>
                      <p style={{ fontSize: 10, color: '#6366f1' }}>{ev.city}</p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(ev.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444' }}
                    >
                      <Trash2 size={22} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SOPORTE */}
          {view === 'profile' && (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
              }}
            >
              <div
                className={isDark ? 'card-dark' : 'card-light'}
                style={{
                  padding: 30,
                  borderRadius: 45,
                  width: '100%',
                  maxWidth: 350,
                  textAlign: 'center'
                }}
              >
                <h2 style={{ fontWeight: 900, marginBottom: 20 }}>SOPORTE</h2>

                <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                  <a
                    href="https://ko-fi.com/eventora"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#29abe0',
                      color: 'white',
                      padding: 18,
                      borderRadius: 18,
                      textDecoration: 'none',
                      fontWeight: 900,
                      fontSize: 12
                    }}
                  >
                    APOYAR EN KO-FI
                  </a>

                  <a
                    href="https://www.paypal.com/paypalme/jacobogarbas"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#003087',
                      color: 'white',
                      padding: 18,
                      borderRadius: 18,
                      textDecoration: 'none',
                      fontWeight: 900,
                      fontSize: 12
                    }}
                  >
                    APOYAR EN PAYPAL
                  </a>
                </div>

                <button
                  onClick={() => {
                    const e = prompt('Email Admin:');
                    if (e && isSupabaseConfigured) supabase.auth.signInWithOtp({ email: e });
                  }}
                  style={{ opacity: 0.1, fontSize: 10 }}
                >
                  Admin Login
                </button>
              </div>
            </div>
          )}
        </main>

        {/* NAV INFERIOR */}
        <nav
          style={{
            position: 'fixed',
            bottom: 15,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            maxWidth: 400,
            height: 75,
            borderRadius: 35,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
            zIndex: 3000,
            background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'
          }}
        >
          <button
            onClick={() => {
              setView('home');
              setSelectedEvent(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'home' ? '#4f46e5' : '#64748b'
            }}
          >
            <LayoutList size={26} />
          </button>

          <button
            onClick={() => {
              setView('favorites');
              setSelectedEvent(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'favorites' ? '#ef4444' : '#64748b'
            }}
          >
            <Heart size={26} fill={view === 'favorites' ? '#ef4444' : 'none'} />
          </button>

          <button
            onClick={() => {
              setView('create');
              setSelectedEvent(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'create' ? '#4f46e5' : '#64748b'
            }}
          >
            <PlusCircle size={26} />
          </button>

          <button
            onClick={() => {
              setView('map');
              setSelectedEvent(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'map' ? '#4f46e5' : '#64748b'
            }}
          >
            <MapIcon size={26} />
          </button>
        </nav>
      </div>
    </div>
  );
}
