import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, 
  CheckCircle2, Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft, Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// ============================================================
// CONFIGURACIÓN DE ESTILOS
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color 0.3s, color 0.3s; }
  .leaflet-container { background-color: #aad3df !important; height: 100% !important; width: 100% !important; border: none !important; }
  .leaflet-tile { transform: scale(1.02) !important; outline: 1px solid transparent; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .dark-mode { background-color: #020617; color: white; }
  .light-mode { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  @keyframes admin-pulse {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.1); color: #ef4444; }
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

// CONTROLADOR DE MOVIMIENTO DEL MAPA
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13, { animate: true });
    } else {
      map.setView([40.4167, -3.7037], 6);
    }
    setTimeout(() => map.invalidateSize(), 400);
  }, [center, map]);
  return null;
}

const LogoSVG = () => (
  <img 
    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" 
    alt="Eventora" 
    style={{ height: 22, width: 'auto' }}
  />
);

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favs')) || []);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCity, setSelectedCity] = useState('TODAS');
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [form, setForm] = useState({ title: '', city: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' });

  useEffect(() => {
    fetchEvents();
    localStorage.setItem('favs', JSON.stringify(favorites));
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
    });
  }, [favorites]);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*');
    if (data) {
      // ORDENAR: Más próximos primero
      const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(sorted);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = (name === 'title' || name === 'city') ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const jumpToCity = async (city) => {
    if (city === 'ESPAÑA') return setMapCenter([40.4167, -3.7037]);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Spain')}`);
    const data = await res.json();
    if (data[0]) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const filteredEvents = publicEvents.filter(e => 
    (selectedCity === 'TODAS' || e.city === selectedCity) &&
    (activeCategory === 'TODOS' || e.category === activeCategory)
  );
  
  const citiesList = ['TODOS', ...new Set(publicEvents.map(e => e.city))];
  const categoriesList = ['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'];

  return (
    <div className={isDark ? "dark-mode" : "light-mode"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>

      <div style={{ position: 'relative', zIndex: 10, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* NAV SUPERIOR */}
        <nav style={{ height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck size={28} className={events.filter(e => e.status === 'pending').length > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1', cursor: 'pointer' }} onClick={() => setView('admin')} />
            )}
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
               {isDark ? <Sun size={24} color="#facc15" /> : <Moon size={24} color="#4f46e5" />}
            </button>
            <Sparkles size={24} color="#6366f1" style={{ cursor: 'pointer' }} onClick={() => setView('profile')} />
          </div>
        </nav>

        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          
          {/* MAPA CON BUSCADOR CIUDAD */}
          {view === 'map' && (
            <div style={{ width: '100%', height: '100%', position: 'relative', background: '#aad3df' }}>
              <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 320 }}>
                <select 
                  onChange={(e) => jumpToCity(e.target.value)}
                  style={{ width: '100%', padding: 14, borderRadius: 15, border: 'none', fontWeight: 900, fontSize: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', outline: 'none' }}
                >
                  <option value="ESPAÑA">📍 IR A CIUDAD...</option>
                  {[...new Set(publicEvents.map(e => e.city))].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <MapContainer key="mapa-v4" center={[40.41, -3.70]} zoom={6} style={{ width: '100%', height: '100%' }}>
                <MapController center={mapCenter} />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; España' />
                {publicEvents.map(ev => ev.lat && <Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><b>{ev.title}</b></Popup></Marker>)}
              </MapContainer>
            </div>
          )}

          {/* HOME CON CIUDADES Y CATEGORÍAS */}
          {view === 'home' && !selectedEvent && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* FILTRO CIUDADES */}
              <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                {citiesList.map(city => (
                  <button key={city} onClick={() => setSelectedCity(city)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: selectedCity === city ? '#2563eb' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCity === city ? 'white' : 'inherit', fontSize: 9, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}>{city}</button>
                ))}
              </div>
              {/* FILTRO CATEGORÍAS */}
              <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc' }}>
                {categoriesList.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid rgba(128,128,128,0.2)', background: activeCategory === cat ? '#4f46e5' : 'transparent', color: activeCategory === cat ? 'white' : 'inherit', fontSize: 8, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}>{cat}</button>
                ))}
              </div>
              
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 150 }}>
                {filteredEvents.map(ev => (
                  <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 30, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ position: 'relative', height: 160 }}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <button onClick={() => toggleFavorite(ev.id)} style={{ position: 'absolute', top: 12, right: 12, padding: 8, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444' }}>
                        <Heart size={18} fill={favorites.includes(ev.id) ? "red" : "none"} />
                      </button>
                    </div>
                    <div style={{ padding: 16, textAlign: 'center' }}>
                      <h3 style={{ fontWeight: 900, fontSize: 16 }}>{ev.title}</h3>
                      <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>{ev.city} | {ev.date}</p>
                      <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 12, borderRadius: 12, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 10 }}>DETALLES</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETALLES */}
          {selectedEvent && (
            <div className="no-scrollbar" style={{ padding: 16, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 16, fontSize: 12 }}><ArrowLeft size={18}/> VOLVER</button>
              <div className="card" style={{ borderRadius: 28, overflow: 'hidden', padding: 0 }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                <div style={{ padding: 20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 10 }}><Calendar color="#6366f1"/> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 10 }}><Clock color="#6366f1"/> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`)} style={{ background: 'rgba(99,102,241,0.1)', padding: 18, borderRadius: 15, cursor: 'pointer', textAlign: 'center' }}>
                      <MapPin color="#6366f1" style={{margin:'0 auto 5px'}}/> <br/> <b>{selectedEvent.address}, {selectedEvent.city}</b> <br/>
                      <span style={{fontSize:10, color:'#2563eb', fontWeight: 900}}>IR CON GOOGLE MAPS (GPS)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORMULARIO CREAR */}
          {view === 'create' && (
            <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 150 }}>
              <div className="card" style={{ padding: 20, borderRadius: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 16, marginBottom: 5 }}>AÑADIR EVENTO</h2>
                <input name="title" placeholder="TÍTULO" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700, fontSize: 12 }} value={form.title} onChange={handleInputChange} />
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                  <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700, fontSize: 12 }} value={form.city} onChange={handleInputChange} />
                  <select name="category" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700, fontSize: 12 }} value={form.category} onChange={handleInputChange}>
                    <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS</option><option value="OTROS">OTROS</option>
                  </select>
                </div>
                <input name="address" placeholder="DIRECCIÓN" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700, fontSize: 12 }} value={form.address} onChange={handleInputChange} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                   <input name="date" type="date" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontSize: 12 }} value={form.date} onChange={handleInputChange} />
                   <input name="time" type="time" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontSize: 12 }} value={form.time} onChange={handleInputChange} />
                </div>
                <button style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 16, borderRadius: 14, border: 'none', fontWeight: 900, fontSize: 12, marginTop: 5 }}>ENVIAR REVISIÓN</button>
              </div>
            </div>
          )}

          {/* SOPORTE */}
          {view === 'profile' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className="card" style={{ padding: 25, borderRadius: 35, width: '100%', maxWidth: 320, textAlign: 'center' }}>
                <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 20 }}>SOPORTE</h2>
                <div style={{ display: 'grid', gap: 10, marginBottom: 15 }}>
                   <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 16, borderRadius: 14, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>APOYAR EN KO-FI</a>
                   <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 16, borderRadius: 14, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>APOYAR EN PAYPAL</a>
                </div>
                {profile && <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 900, fontSize: 10 }}>CERRAR SESIÓN ADMIN</button>}
              </div>
            </div>
          )}
        </main>

        {/* BOT NAV */}
        <nav style={{ position: 'fixed', bottom: 15, left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: 400, height: 70, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'home' ? '#2563eb' : '#64748b' }}><LayoutList size={24}/></button>
          <button onClick={() => {setView('favorites'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b' }}><Heart size={24} fill={view === 'favorites' ? "#ef4444" : "none"}/></button>
          <button onClick={() => {setView('create'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'create' ? '#2563eb' : '#64748b' }}><PlusCircle size={24}/></button>
          <button onClick={() => {setView('map'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'map' ? '#2563eb' : '#64748b' }}><MapIcon size={24}/></button>
        </nav>
      </div>
    </div>
  );
}
