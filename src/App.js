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
// CONFIGURACIÓN DE ESTILOS (FIX LÍNEAS Y TEMAS)
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color 0.3s, color 0.3s; }
  
  .leaflet-container { background-color: #aad3df !important; border: none !important; }
  .leaflet-tile { transform: scale(1.02) !important; outline: 1px solid transparent; }

  @keyframes admin-pulse {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.15); color: #ef4444; }
    100% { transform: scale(1); color: #818cf8; }
  }
  .pulse-admin { animation: admin-pulse 2s infinite; }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Colores del Modo Claro y Oscuro */
  .dark-theme { background-color: #020617; color: white; }
  .light-theme { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; }
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
    setTimeout(() => { map.invalidateSize(); map.setView([40.4167, -3.7037], 6); }, 300);
  }, [map]);
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
    <div className={isDark ? "dark-theme" : "light-theme"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      
      {/* MAPA DE FONDO */}
      {view === 'map' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
          <MapContainer center={[40.4167, -3.7037]} zoom={6} style={{ width: '100%', height: '100%' }}>
            <SpainMapController />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {publicEvents.map(ev => ev.lat && (
              <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                <Popup><div style={{textAlign:'center'}}><b>{ev.title}</b><br/>{ev.city}</div></Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* INTERFAZ */}
      <div style={{ 
        position: 'relative', zIndex: 10, width: '100vw', height: '100vh', 
        display: 'flex', flexDirection: 'column', 
        background: view === 'map' ? 'transparent' : (isDark ? '#020617' : '#f8fafc')
      }}>
        
        {/* NAV SUPERIOR */}
        <nav style={{ 
          height: 65, background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(128,128,128,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', zIndex: 2000
        }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck size={26} className={pendingCount > 0 ? 'pulse-admin' : ''} style={{ color: pendingCount > 0 ? '#ef4444' : '#6366f1', cursor: 'pointer' }} onClick={() => setView('admin')} />
            )}
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
               {isDark ? <Sun size={24} color="#facc15" /> : <Moon size={24} color="#4f46e5" />}
            </button>
            <div onClick={() => setView('profile')} style={{ width: 35, height: 35, background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', border: '2px solid white', cursor: 'pointer' }}>{user?.email?.[0].toUpperCase() || '?'}</div>
          </div>
        </nav>

        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }} className="no-scrollbar">
          
          {/* VISTA HOME */}
          {view === 'home' && !selectedEvent && (
            <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, paddingBottom: 150 }}>
              {publicEvents.map(ev => (
                <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 35, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ position: 'relative', height: 180 }}>
                    <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <button onClick={() => toggleFavorite(ev.id)} style={{ position: 'absolute', top: 15, right: 15, padding: 10, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                      <Heart size={20} fill={favorites.includes(ev.id) ? "#ef4444" : "none"} />
                    </button>
                  </div>
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <h3 style={{ fontWeight: 900, fontSize: 19, marginBottom: 4 }}>{ev.title}</h3>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', letterSpacing: 2, marginBottom: 15 }}>{ev.city}</p>
                    <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 14, borderRadius: 16, background: '#2563eb', color: 'white', border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>VER DETALLES</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VISTA DETALLES */}
          {selectedEvent && (
            <div style={{ padding: 20, paddingBottom: 150, maxWidth: 500, margin: '0 auto' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15, cursor: 'pointer' }}><ArrowLeft size={20}/> VOLVER</button>
              <div className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 30, overflow: 'hidden' }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} alt="" />
                <div style={{ padding: 25 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 12 }}><Calendar color="#6366f1"/> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 12 }}><Clock color="#6366f1"/> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => openGoogleMaps(selectedEvent)} style={{ display: 'flex', gap: 12, cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 15 }}>
                      <MapPin color="#6366f1"/> <b>{selectedEvent.address}, {selectedEvent.city}<br/><span style={{fontSize:10, color:'#2563eb'}}>TOCA PARA IR (GOOGLE MAPS)</span></b>
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
                  <div key={ev.id} style={{ display: 'flex', gap: 15, background: isDark ? '#0f172a' : 'white', padding: 15, borderRadius: 25, marginBottom: 12, alignItems: 'center', border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
                    <img src={ev.image_url} style={{ width: 65, height: 65, borderRadius: 15, objectFit: 'cover' }} alt="" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 900, fontSize: 15 }}>{ev.title}</p>
                      <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 800 }}>{ev.city}</p>
                    </div>
                    <button onClick={() => toggleFavorite(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={22}/></button>
                  </div>
                ))
              }
            </div>
          )}

          {/* PERFIL */}
          {view === 'profile' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className={isDark ? "card-dark" : "card-light"} style={{ padding: 30, borderRadius: 45, width: '100%', maxWidth: 350, textAlign: 'center' }}>
                <div style={{ width: 75, height: 75, background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, margin: '0 auto 25px', color: 'white', border: '3px solid #6366f1' }}>{user?.email?.[0].toUpperCase() || '?'}</div>
                <div style={{ display: 'grid', gap: 12, marginBottom: 25 }}>
                   <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Coffee size={20}/> KO-FI (Apoyo)</a>
                   <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><CreditCard size={20}/> PAYPAL</a>
                </div>
                {user && <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 1 }}>CERRAR SESIÓN</button>}
              </div>
            </div>
          )}
        </main>

        {/* BOTTOM NAV */}
        <nav style={{ 
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', 
          width: '94%', maxWidth: 400, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
          height: 80, borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          border: '1px solid rgba(128,128,128,0.2)', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000
        }}>
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'home' ? '#2563eb' : '#64748b', cursor: 'pointer' }}><LayoutList size={26}/></button>
          <button onClick={() => {setView('favorites'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer' }}><Heart size={26} fill={view === 'favorites' ? "#ef4444" : "none"}/></button>
          <button onClick={() => {setView('create'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'create' ? '#2563eb' : '#64748b', cursor: 'pointer' }}><PlusCircle size={26}/></button>
          <button onClick={() => {setView('map'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'map' ? '#2563eb' : '#64748b', cursor: 'pointer' }}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
