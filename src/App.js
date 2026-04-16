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

const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; transition: all 0.3s ease; }
  .leaflet-container { background-color: #aad3df !important; border: none !important; }
  .leaflet-tile { transform: scale(1.02) !important; outline: 1px solid transparent; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .dark { background-color: #020617; color: white; }
  .light { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; }
`;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// CONTROLADOR DEL MAPA PARA SALTOS A CIUDADES
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13, { animate: true });
    } else {
      map.setView([40.4167, -3.7037], 6);
    }
    setTimeout(() => map.invalidateSize(), 500);
  }, [center, map]);
  return null;
}

const LogoSVG = () => (
  <img 
    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" 
    alt="Eventora" 
    style={{ height: 24, width: 'auto' }}
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
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
      const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(sorted);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = (name === 'title' || name === 'city') ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  const generateAIImage = () => {
    if (!form.title) return alert("Escribe un título primero");
    setIsGenerating(true);
    const url = `https://image.pollinations.ai/prompt/professional_photography_of_${encodeURIComponent(form.title)}?width=800&height=600&seed=${Date.now()}`;
    setForm({ ...form, image_url: url });
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const handleCitySearch = async (city) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Spain')}`);
    const data = await res.json();
    if (data[0]) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const filteredEvents = publicEvents.filter(e => activeCategory === 'TODOS' || e.category === activeCategory);
  const adminEvents = events.filter(e => e.status === 'pending');

  return (
    <div className={isDark ? "dark" : "light"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>

      <div style={{ position: 'relative', zIndex: 10, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* NAV SUPERIOR */}
        <nav style={{ height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck size={28} className={adminEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: adminEvents.length > 0 ? '#ef4444' : '#6366f1', cursor: 'pointer' }} onClick={() => setView('admin')} />
            )}
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
               {isDark ? <Sun size={24} color="#facc15" /> : <Moon size={24} color="#4f46e5" />}
            </button>
            <Sparkles size={24} color="#6366f1" style={{ cursor: 'pointer' }} onClick={() => setView('profile')} />
          </div>
        </nav>

        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          
          {/* VISTA MAPA CON BUSCADOR */}
          {view === 'map' && (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '80%', maxWidth: 300 }}>
                 <select 
                  onChange={(e) => handleCitySearch(e.target.value)}
                  style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#fff', boxShadow: '0 10px 15px rgba(0,0,0,0.2)', fontWeight: 800 }}
                 >
                   <option>BUSCAR CIUDAD...</option>
                   {[...new Set(publicEvents.map(e => e.city))].map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              <MapContainer key="main-map" center={[40.41, -3.70]} zoom={6} style={{ width: '100%', height: '100%' }}>
                <MapController center={mapCenter} />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {publicEvents.map(ev => ev.lat && <Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><b>{ev.title}</b></Popup></Marker>)}
              </MapContainer>
            </div>
          )}

          {/* HOME CON CATEGORÍAS */}
          {view === 'home' && !selectedEvent && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, padding: '15px 20px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc' }}>
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '10px 20px', borderRadius: 20, border: 'none', background: activeCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: activeCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}>{cat}</button>
                ))}
              </div>
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 150 }}>
                {filteredEvents.map(ev => (
                  <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 32, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ position: 'relative', height: 180 }}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <button onClick={() => setFavorites(f => f.includes(ev.id) ? f.filter(x => x !== ev.id) : [...f, ev.id])} style={{ position: 'absolute', top: 15, right: 15, padding: 10, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444' }}>
                        <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                      </button>
                    </div>
                    <div style={{ padding: 20, textAlign: 'center' }}>
                      <h3 style={{ fontWeight: 900, fontSize: 18 }}>{ev.title}</h3>
                      <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 12 }}>{ev.city} | {ev.date}</p>
                      <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 12, borderRadius: 12, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 11 }}>DETALLES</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETALLES */}
          {selectedEvent && (
            <div style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 20 }}><ArrowLeft/> VOLVER</button>
              <div className="card" style={{ borderRadius: 30, overflow: 'hidden', padding: 0 }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} />
                <div style={{ padding: 25 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 10 }}><Calendar color="#6366f1"/> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 10 }}><Clock color="#6366f1"/> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`)} style={{ background: 'rgba(99,102,241,0.1)', padding: 15, borderRadius: 15, cursor: 'pointer' }}>
                      <MapPin color="#6366f1"/> <b>{selectedEvent.address}, {selectedEvent.city} (CÓMO LLEGAR)</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORMULARIO CREAR */}
          {view === 'create' && (
            <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 150 }}>
              <div className="card" style={{ padding: 25, borderRadius: 30 }}>
                <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>AÑADIR EVENTO</h2>
                <input name="title" placeholder="TÍTULO" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', marginBottom: 10, color: 'inherit', fontWeight: 700 }} value={form.title} onChange={handleInputChange} />
                <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', marginBottom: 10, color: 'inherit', fontWeight: 700 }} value={form.city} onChange={handleInputChange} />
                <input name="address" placeholder="DIRECCIÓN" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', marginBottom: 10, color: 'inherit', fontWeight: 700 }} value={form.address} onChange={handleInputChange} />
                <select name="category" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', marginBottom: 10, color: 'inherit', fontWeight: 700 }} value={form.category} onChange={handleInputChange}>
                   <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option>
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                   <input name="date" type="date" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.date} onChange={handleInputChange} />
                   <input name="time" type="time" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.time} onChange={handleInputChange} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                   <button onClick={generateAIImage} style={{ padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 10, fontWeight: 900 }}>{isGenerating ? 'GENERANDO...' : 'IA FOTO'}</button>
                   <label style={{ padding: 12, background: '#1e293b', color: 'white', textAlign:'center', borderRadius: 10, fontSize: 10, fontWeight: 900, cursor: 'pointer' }}>GALERÍA <input type="file" style={{display:'none'}} /></label>
                </div>
                <button style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 18, borderRadius: 15, border: 'none', fontWeight: 900 }}>ENVIAR REVISIÓN</button>
              </div>
            </div>
          )}

          {/* PERFIL (PAGOS) */}
          {view === 'profile' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className="card" style={{ padding: 30, borderRadius: 40, width: '100%', maxWidth: 350, textAlign: 'center' }}>
                <h2 style={{ fontWeight: 900, marginBottom: 20 }}>SOPORTE</h2>
                <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                   <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 16, borderRadius: 16, textDecoration: 'none', fontWeight: 900 }}>APOYAR EN KO-FI</a>
                   <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 16, borderRadius: 16, textDecoration: 'none', fontWeight: 900 }}>APOYAR EN PAYPAL</a>
                </div>
                <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 900 }}>CERRAR SESIÓN ADMIN</button>
              </div>
            </div>
          )}
        </main>

        {/* BOTTOM NAV */}
        <nav style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: 400, height: 75, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: view === 'home' ? '#2563eb' : '#64748b' }}><LayoutList size={26}/></button>
          <button onClick={() => setView('favorites')} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b' }}><Heart size={26} fill={view === 'favorites' ? "#ef4444" : "none"}/></button>
          <button onClick={() => setView('create')} style={{ background: 'none', border: 'none', color: view === 'create' ? '#2563eb' : '#64748b' }}><PlusCircle size={26}/></button>
          <button onClick={() => setView('map')} style={{ background: 'none', border: 'none', color: view === 'map' ? '#2563eb' : '#64748b' }}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
