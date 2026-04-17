import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, 
  CheckCircle2, Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// ============================================================
// CONFIGURACIÓN DE ESTILOS (FIX LÍNEAS MÓVIL Y TEMAS)
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color 0.3s, color 0.3s; }
  .leaflet-container { background-color: #aad3df !important; }
  
  /* FIX LÍNEAS EN MÓVIL: Escalado mínimo para solapar piezas */
  .leaflet-tile { 
    margin: 0 !important; 
    padding: 0 !important; 
    outline: 1px solid transparent;
    transform: scale(1.005) !important;
    -webkit-backface-visibility: hidden;
  }
  
  .leaflet-container img { max-width: none !important; max-height: none !important; }
  
  .dark-theme { background-color: #020617; color: white; }
  .light-theme { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  @keyframes admin-pulse {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.1); color: #ef4444; }
    100% { transform: scale(1); color: #818cf8; }
  }
  .pulse-admin { animation: admin-pulse 2s infinite; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); map.setView([40.4167, -3.7037], 6); }, 500);
  }, [map]);
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
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favs')) || []);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCity, setSelectedCity] = useState('TODAS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ title: '', city: '', localidad: '', address: '', time: '21:00', date: '', image_url: '' });

  useEffect(() => {
    fetchEvents();
    localStorage.setItem('favs', JSON.stringify(favorites));
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        if (session.user.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      } else { setUser(null); setProfile(null); }
    });
  }, [favorites]);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (data) setEvents(data);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const needsUpper = ['title', 'city', 'localidad'];
    const val = needsUpper.includes(name) ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  const openGoogleMaps = (ev) => {
    const query = encodeURIComponent(`${ev.address}, ${ev.localidad || ''}, ${ev.city}, España`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  
  // LÓGICA DE CIUDADES PARA EL FILTRO
  const availableCities = ['TODAS', ...new Set(publicEvents.map(e => e.city))];
  const filteredEvents = selectedCity === 'TODAS' ? publicEvents : publicEvents.filter(e => e.city === selectedCity);
  
  const pendingCount = events.filter(e => e.status === 'pending').length;

  return (
    <div className={isDark ? "dark-theme" : "light-theme"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      
      <div style={{ position: 'relative', zIndex: 10, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* NAVBAR */}
        <nav style={{ 
          height: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '0 24px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)',
          background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)'
        }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck size={28} className={pendingCount > 0 ? 'pulse-admin' : ''} style={{ cursor: 'pointer', color: pendingCount > 0 ? '#ef4444' : '#6366f1' }} onClick={() => setView('admin')} />
            )}
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
               {isDark ? <Sun size={24} color="#facc15" /> : <Moon size={24} color="#4f46e5" />}
            </button>
            <Sparkles size={24} color="#6366f1" style={{ cursor: 'pointer' }} onClick={() => setView('profile')} />
          </div>
        </nav>

        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          
          {/* VISTA HOME */}
          {view === 'home' && !selectedEvent && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* FILTRO DE CIUDADES */}
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, padding: '15px 20px', overflowX: 'auto', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                {availableCities.map(city => (
                  <button key={city} onClick={() => setSelectedCity(city)} style={{ padding: '8px 18px', borderRadius: 20, border: 'none', background: selectedCity === city ? '#2563eb' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCity === city ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}>{city}</button>
                ))}
              </div>

              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 150 }}>
                {filteredEvents.map(ev => (
                  <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 32, overflow: 'hidden', marginBottom: 20 }}>
                    <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: 200, objectFit: 'cover' }} alt="" />
                    <div style={{ padding: 20, textAlign: 'center' }}>
                      <h3 style={{ fontWeight: 900, fontSize: 18 }}>{ev.title}</h3>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', letterSpacing: 2, marginBottom: 15 }}>{ev.city}</p>
                      <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 14, borderRadius: 16, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>DETALLES</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA DETALLES */}
          {selectedEvent && (
            <div style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 15 }}><ArrowLeft size={20}/> VOLVER</button>
              <div className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 30, overflow: 'hidden' }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} />
                <div style={{ padding: 25 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 10 }}><Calendar color="#6366f1"/> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 10 }}><Clock color="#6366f1"/> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => openGoogleMaps(selectedEvent)} style={{ display: 'flex', gap: 10, cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 15 }}>
                      <MapPin color="#6366f1"/> <b>{selectedEvent.address}, {selectedEvent.localidad && selectedEvent.localidad + ','} {selectedEvent.city}<br/><span style={{fontSize:10, color:'#2563eb'}}>COMO LLEGAR (GPS)</span></b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA MAPA */}
          {view === 'map' && (
            <div style={{ width: "100%", height: "100%", position: 'absolute', top: 0, left: 0 }}>
              <MapContainer center={[40.4167, -3.7037]} zoom={6} style={{ height: "100%", width: "100%" }} zoomSnap={1}>
                <SpainMapController />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; España' />
                {publicEvents.map(ev => ev.lat && ev.lng && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup className="text-center text-indigo-600 font-bold uppercase text-xs">{ev.title}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {/* PERFIL */}
          {view === 'profile' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className={isDark ? "card-dark" : "card-light"} style={{ padding: 30, borderRadius: 45, width: '100%', maxWidth: 350, textAlign: 'center' }}>
                <h2 style={{ fontWeight: 900, marginBottom: 20 }}>SOPORTE</h2>
                <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                   <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>APOYAR EN KO-FI</a>
                   <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>APOYAR EN PAYPAL</a>
                </div>
                {!user ? (
                  <button onClick={() => { const e = prompt("Email Admin:"); if(e) supabase.auth.signInWithOtp({email:e}) }} style={{ opacity: 0.2, fontSize: 10 }}>Acceso Admin</button>
                ) : (
                  <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 900 }}>CERRAR SESIÓN</button>
                )}
              </div>
            </div>
          )}

          {/* CREAR */}
          {view === 'create' && (
            <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 150 }}>
              <div className={isDark ? "card-dark" : "card-light"} style={{ padding: 25, borderRadius: 30, gap: 10, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 10 }}>AÑADIR EVENTO</h2>
                <input name="title" placeholder="TÍTULO" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.title} onChange={handleInputChange} />
                <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.city} onChange={handleInputChange} />
                <input name="localidad" placeholder="LOCALIDAD" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.localidad} onChange={handleInputChange} />
                <input name="address" placeholder="DIRECCIÓN" style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.address} onChange={handleInputChange} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                   <input name="date" type="date" style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.date} onChange={handleInputChange} />
                   <input name="time" type="time" style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.time} onChange={handleInputChange} />
                </div>
                <button style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 18, borderRadius: 15, border: 'none', fontWeight: 900, marginTop: 10 }}>ENVIAR REVISIÓN</button>
              </div>
            </div>
          )}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-4 text-slate-500">
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'home' ? '#2563eb' : '#64748b', cursor: 'pointer' }}><LayoutList size={26}/></button>
          <button onClick={() => {setView('create'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'create' ? '#2563eb' : '#64748b', cursor: 'pointer' }}><PlusCircle size={26}/></button>
          <button onClick={() => {setView('map'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'map' ? '#2563eb' : '#64748b', cursor: 'pointer' }}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
