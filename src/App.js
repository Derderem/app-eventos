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
// CONFIGURACIÓN VISUAL Y ANIMACIONES
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; transition: all 0.3s ease; }
  
  /* FIX MAPA: Sin bordes y sin líneas */
  .leaflet-container { background-color: #aad3df !important; border: none !important; outline: none !important; }
  .leaflet-tile { transform: scale(1.02) !important; outline: 1px solid transparent; }

  @keyframes admin-pulse {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.1); color: #ef4444; }
    100% { transform: scale(1); color: #818cf8; }
  }
  .pulse-admin { animation: admin-pulse 2s infinite; }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Temas */
  .dark { background-color: #020617; color: white; }
  .light { background-color: #f8fafc; color: #0f172a; }
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
  const [favorites, setFavorites] = useState([]); // Array de IDs
  const [pendingCount, setPendingCount] = useState(0);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ title: '', city: '', time: '21:00', date: '', address: '', image_url: '' });

  useEffect(() => {
    fetchEvents();
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        if (session.user.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      } else { setUser(null); setProfile(null); }
    });
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (data) {
      setEvents(data);
      setPendingCount(data.filter(e => e.status === 'pending').length);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = (name === 'title' || name === 'city') ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const openInGoogleMaps = (event) => {
    const query = encodeURIComponent(`${event.address}, ${event.city}, España`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const favoriteEvents = publicEvents.filter(e => favorites.includes(e.id));

  return (
    <div className={isDark ? "dark" : "light"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      
      {/* MAPA DE FONDO */}
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

      <div style={{ 
        position: 'relative', zIndex: 10, width: '100vw', height: '100vh', 
        display: 'flex', flexDirection: 'column', 
        background: view === 'map' ? 'transparent' : (isDark ? '#020617' : '#f8fafc'),
        pointerEvents: 'auto'
      }}>
        
        {/* NAVBAR */}
        <nav style={{ 
          height: 65, background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(128,128,128,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', zIndex: 2000
        }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck size={26} className={pendingCount > 0 ? 'pulse-admin' : ''} style={{ color: pendingCount > 0 ? '#ef4444' : '#6366f1' }} onClick={() => setView('admin')} />
            )}
            <button onClick={() => setIsDark(!isDark)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
               {isDark ? <Sun size={22} style={{ color: '#facc15' }} /> : <Moon size={22} style={{ color: '#4f46e5' }} />}
            </button>
            <div onClick={() => setView('profile')} style={{ width: 34, height: 34, background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', border: '2px solid white' }}>{user ? user.email[0].toUpperCase() : '?'}</div>
          </div>
        </nav>

        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }} className="no-scrollbar">
          
          {/* INICIO */}
          {view === 'home' && !selectedEvent && (
            <div style={{ maxWidth: 500, margin: '0 auto', padding: 16, paddingBottom: 120 }}>
              {publicEvents.map(ev => (
                <div key={ev.id} style={{ background: isDark ? '#0f172a' : 'white', borderRadius: 28, overflow: 'hidden', marginBottom: 20, border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
                  <div style={{ position: 'relative', height: 180 }}>
                    <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <button 
                      onClick={() => toggleFavorite(ev.id)}
                      style={{ position: 'absolute', top: 15, right: 15, padding: 10, background: 'white', borderRadius: '50%', border: 'none', color: favorites.includes(ev.id) ? '#ef4444' : '#ccc', cursor: 'pointer', display: 'flex' }}
                    >
                      <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <h3 style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>{ev.title}</h3>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', letterSpacing: 2, marginBottom: 12 }}>{ev.city}</p>
                    <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 12, borderRadius: 12, background: isDark ? '#1e293b' : '#f1f5f9', border: 'none', fontWeight: 900, color: isDark ? 'white' : '#0f172a', cursor: 'pointer', fontSize: 11 }}>VER DETALLES</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GUARDADOS */}
          {view === 'favorites' && (
            <div style={{ maxWidth: 500, margin: '0 auto', padding: 16, paddingBottom: 120 }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>MIS GUARDADOS</h2>
              {favoriteEvents.length === 0 ? <p style={{textAlign:'center', opacity:0.5}}>No tienes eventos guardados</p> : 
                favoriteEvents.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', gap: 12, background: isDark ? '#0f172a' : 'white', padding: 12, borderRadius: 20, marginBottom: 12, alignItems: 'center' }}>
                    <img src={ev.image_url} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 900, fontSize: 14 }}>{ev.title}</p>
                      <p style={{ fontSize: 10, color: '#6366f1' }}>{ev.city}</p>
                    </div>
                    <button onClick={() => toggleFavorite(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444' }}><Trash2 size={20}/></button>
                  </div>
                ))
              }
            </div>
          )}

          {/* DETALLES */}
          {selectedEvent && (
            <div style={{ padding: 20, paddingBottom: 120 }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><ArrowLeft size={20}/> VOLVER</button>
              <div style={{ background: isDark ? '#0f172a' : 'white', borderRadius: 28, overflow: 'hidden' }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                <div style={{ padding: 20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10 }}><Calendar size={18} color="#6366f1" /> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 10 }}><Clock size={18} color="#6366f1" /> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => openInGoogleMaps(selectedEvent)} style={{ display: 'flex', gap: 10, cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', padding: 12, borderRadius: 12 }}>
                      <MapPin size={18} color="#6366f1" /> <b>{selectedEvent.address}, {selectedEvent.city} (IR AHORA)</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PERFIL */}
          {view === 'profile' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: isDark ? '#0f172a' : 'white', padding: 24, borderRadius: 32, width: '100%', maxWidth: 320, textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, margin: '0 auto 20px', color: 'white' }}>{user?.email?.[0].toUpperCase() || '?'}</div>
                <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                   <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>KO-FI (Eventora)</a>
                   <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>PAYPAL</a>
                </div>
                <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 900, fontSize: 11 }}>CERRAR SESIÓN</button>
              </div>
            </div>
          )}
        </main>

        {/* BARRA INFERIOR */}
        <nav style={{ 
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', 
          width: '94%', maxWidth: 400, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
          height: 75, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          border: '1px solid rgba(128,128,128,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 3000
        }}>
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'home' ? '#2563eb' : '#64748b' }}><LayoutList size={26}/></button>
          <button onClick={() => setView('favorites')} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b' }}><Heart size={26} fill={view === 'favorites' ? "#ef4444" : "none"}/></button>
          <button onClick={() => setView('create')} style={{ background: 'none', border: 'none', color: view === 'create' ? '#2563eb' : '#64748b' }}><PlusCircle size={26}/></button>
          <button onClick={() => setView('map')} style={{ background: 'none', border: 'none', color: view === 'map' ? '#2563eb' : '#64748b' }}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
