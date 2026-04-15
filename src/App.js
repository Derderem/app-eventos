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
// ESTILOS GLOBALES Y TEMAS (SOL/LUNA)
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; transition: all 0.3s ease; }
  
  .leaflet-container { background-color: #aad3df !important; border: none !important; }
  .leaflet-tile { transform: scale(1.02) !important; outline: 1px solid transparent; }

  /* MODO OSCURO (LUNA) */
  .dark-mode { background-color: #020617; color: white; }
  .dark-mode .card { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
  .dark-mode nav { background: rgba(15, 23, 42, 0.9); border-color: #1e293b; }

  /* MODO CLARO (SOL) */
  .light-mode { background-color: #f8fafc; color: #0f172a; }
  .light-mode .card { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .light-mode nav { background: rgba(255, 255, 255, 0.9); border-color: #e2e8f0; }

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
    setTimeout(() => { map.invalidateSize(); map.setView([40.4167, -3.7037], 6); }, 200);
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
  const [favorites, setFavorites] = useState([]);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ title: '', city: '', time: '21:00', date: '', address: '' });

  useEffect(() => {
    fetchEvents();
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        if (session.user.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      } else { setUser(null); setProfile(null); setFavorites([]); }
    });
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (data) setEvents(data);
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = (name === 'title' || name === 'city') ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  const openGoogleMaps = (ev) => {
    const query = encodeURIComponent(`${ev.address}, ${ev.city}, España`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const favoriteEvents = publicEvents.filter(e => favorites.includes(e.id));
  const pendingCount = events.filter(e => e.status === 'pending').length;

  return (
    <div className={isDark ? "dark-mode" : "light-mode"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      
      {/* CAPA MAPA */}
      {view === 'map' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
          <MapContainer center={[40.4167, -3.7037]} zoom={6} style={{ width: '100%', height: '100%' }}>
            <SpainMapController />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; España' />
            {publicEvents.map(ev => ev.lat && (
              <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                <Popup><div style={{textAlign:'center'}}><b>{ev.title}</b><br/>{ev.city}</div></Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* INTERFAZ PRINCIPAL */}
      <div style={{ 
        position: 'relative', zIndex: 10, width: '100vw', height: '100vh', 
        display: 'flex', flexDirection: 'column', 
        background: view === 'map' ? 'transparent' : undefined 
      }}>
        
        {/* NAV SUPERIOR */}
        <nav style={{ 
          height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '0 20px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)'
        }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck size={26} className={pendingCount > 0 ? 'pulse-admin' : ''} style={{ color: pendingCount > 0 ? '#ef4444' : '#6366f1', cursor: 'pointer' }} onClick={() => setView('admin')} />
            )}
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
               {isDark ? <Sun size={24} color="#facc15" /> : <Moon size={24} color="#4f46e5" />}
            </button>
            <div onClick={() => setView('profile')} style={{ width: 35, height: 35, background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', border: '2px solid white', cursor: 'pointer' }}>
              {user?.email ? user.email[0].toUpperCase() : '?'}
            </div>
          </div>
        </nav>

        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }} className="no-scrollbar">
          
          {/* HOME: LISTA DE EVENTOS */}
          {view === 'home' && !selectedEvent && (
            <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, paddingBottom: 150 }}>
              {publicEvents.map(ev => (
                <div key={ev.id} className="card" style={{ borderRadius: 32, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ position: 'relative', height: 180 }}>
                    <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <button 
                      onClick={() => toggleFavorite(ev.id)}
                      style={{ position: 'absolute', top: 15, right: 15, padding: 10, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}
                    >
                      <Heart size={20} fill={favorites.includes(ev.id) ? "#ef4444" : "none"} />
                    </button>
                  </div>
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <h3 style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>{ev.title}</h3>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', letterSpacing: 2, marginBottom: 15 }}>{ev.city}</p>
                    <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 14, borderRadius: 16, background: '#2563eb', color: 'white', border: 'none', fontWeight: 900, fontSize: 11 }}>VER DETALLES</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VISTA DETALLES */}
          {selectedEvent && (
            <div style={{ padding: 20, paddingBottom: 150, maxWidth: 500, margin: '0 auto' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}><ArrowLeft size={20}/> VOLVER</button>
              <div className="card" style={{ borderRadius: 30, overflow: 'hidden' }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} alt="" />
                <div style={{ padding: 25 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 12 }}><Calendar color="#6366f1"/> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 12 }}><Clock color="#6366f1"/> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => openGoogleMaps(selectedEvent)} style={{ display: 'flex', gap: 12, cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 15 }}>
                      <MapPin color="#6366f1"/> <b>{selectedEvent.address}, {selectedEvent.city}<br/><span style={{fontSize:10, color:'#2563eb'}}>CÓMO LLEGAR (GPS)</span></b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA GUARDADOS */}
          {view === 'favorites' && (
            <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, paddingBottom: 150 }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>MIS GUARDADOS</h2>
              {favoriteEvents.length === 0 ? <p style={{textAlign:'center', opacity:0.5}}>No hay nada guardado</p> : 
                favoriteEvents.map(ev => (
                  <div key={ev.id} className="card" style={{ display: 'flex', gap: 15, padding: 15, borderRadius: 25, marginBottom: 12, alignItems: 'center' }}>
                    <img src={ev.image_url} style={{ width: 65, height: 65, borderRadius: 15, objectFit: 'cover' }} alt="" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 900, fontSize: 15 }}>{ev.title}</p>
                      <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 800 }}>{ev.city}</p>
                    </div>
                    <button onClick={() => toggleFavorite(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444' }}><Trash2 size={22}/></button>
                  </div>
                ))
              }
            </div>
          )}

          {/* PERFIL (PAGOS) */}
          {view === 'profile' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className="card" style={{ padding: 30, borderRadius: 45, width: '100%', maxWidth: 350, textAlign: 'center' }}>
                <div style={{ width: 75, height: 75, background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, margin: '0 auto 25px', color: 'white', border: '3px solid #6366f1' }}>{user?.email?.[0].toUpperCase() || '?'}</div>
                <div style={{ display: 'grid', gap: 12, marginBottom: 25 }}>
                   <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Coffee size={20}/> APOYAR EN KO-FI</a>
                   <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><CreditCard size={20}/> APOYAR EN PAYPAL</a>
                </div>
                {user && <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>CERRAR SESIÓN</button>}
              </div>
            </div>
          )}

          {/* CREAR EVENTO */}
          {view === 'create' && (
            <div className="no-scrollbar" style={{ maxWidth: 450, margin: '0 auto', padding: 20, height: '100%', overflowY: 'auto' }}>
              <div className="card" style={{ padding: 24, borderRadius: 32 }}>
                <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>NUEVO EVENTO</h2>
                <input name="title" placeholder="TÍTULO" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgba(128,128,128,0.1)', border: 'none', marginBottom: 12, color: 'inherit', fontWeight: 700 }} value={form.title} onChange={handleInputChange} />
                <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgba(128,128,128,0.1)', border: 'none', marginBottom: 12, color: 'inherit', fontWeight: 700 }} value={form.city} onChange={handleInputChange} />
                <input name="address" placeholder="DIRECCIÓN" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgba(128,128,128,0.1)', border: 'none', marginBottom: 12, color: 'inherit', fontWeight: 700 }} value={form.address} onChange={handleInputChange} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                   <input name="date" type="date" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgba(128,128,128,0.1)', border: 'none', color: 'inherit' }} value={form.date} onChange={handleInputChange} />
                   <input name="time" type="time" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgba(128,128,128,0.1)', border: 'none', color: 'inherit' }} value={form.time} onChange={handleInputChange} />
                </div>
                <button style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 18, borderRadius: 16, border: 'none', fontWeight: 900, marginTop: 20 }}>ENVIAR REVISIÓN</button>
              </div>
            </div>
          )}
        </main>

        {/* BOTTOM NAV */}
        <nav style={{ 
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', 
          width: '94%', maxWidth: 400, height: 80, borderRadius: 40, display: 'flex', 
          alignItems: 'center', justifyContent: 'space-around',
          boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000
        }}>
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'home' ? '#2563eb' : '#64748b' }}><LayoutList size={26}/></button>
          <button onClick={() => {setView('favorites'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b' }}><Heart size={26} fill={view === 'favorites' ? "#ef4444" : "none"}/></button>
          <button onClick={() => {setView('create'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'create' ? '#2563eb' : '#64748b' }}><PlusCircle size={26}/></button>
          <button onClick={() => {setView('map'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'map' ? '#2563eb' : '#64748b' }}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
