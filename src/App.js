import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, 
  CheckCircle2, Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft, Search, List
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
  .card-light { background-color: white; border: 1px solid #e2e8f0; }

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

function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => { 
      map.invalidateSize(); 
      map.setView([40.4167, -3.7037], 6); 
    }, 400);
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
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favs')) || []);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCity, setSelectedCity] = useState('TODAS');
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
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

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const filteredEvents = publicEvents.filter(e => 
    (selectedCity === 'TODAS' || e.city === selectedCity) &&
    (activeCategory === 'TODOS' || e.category === activeCategory)
  );
  
  const cities = ['TODAS', ...new Set(publicEvents.map(e => e.city))];
  const adminEvents = events.filter(e => e.status === 'pending');
  const favoriteEvents = publicEvents.filter(e => favorites.includes(e.id));

  return (
    <div className={isDark ? "dark-mode" : "light-mode"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      
      <div style={{ position: 'relative', zIndex: 10, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* NAV SUPERIOR */}
        <nav style={{ height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck size={26} className={adminEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: adminEvents.length > 0 ? '#ef4444' : '#6366f1', cursor: 'pointer' }} onClick={() => setView('admin')} />
            )}
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
               {isDark ? <Sun size={22} color="#facc15" /> : <Moon size={22} color="#4f46e5" />}
            </button>
            <Sparkles size={22} color="#6366f1" style={{ cursor: 'pointer' }} onClick={() => setView('profile')} />
          </div>
        </nav>

        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          
          {/* VISTA MAPA */}
          {view === 'map' && (
            <div style={{ width: '100%', height: '100%', background: '#aad3df' }}>
              <MapContainer center={[40.4167, -3.7037]} zoom={6} style={{ width: '100%', height: '100%' }} zoomSnap={1}>
                <SpainMapController />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; España' />
                {publicEvents.map(ev => ev.lat && ev.lng && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup><div style={{textAlign:'center'}}><b>{ev.title}</b><br/>{ev.city}</div></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {/* HOME CON CATEGORÍAS */}
          {view === 'home' && !selectedEvent && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc' }}>
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: activeCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: activeCategory === cat ? 'white' : 'inherit', fontSize: 9, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}>{cat}</button>
                ))}
              </div>
              
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 150 }}>
                {filteredEvents.map(ev => (
                  <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 30, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ position: 'relative', height: 160 }}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <button onClick={() => setFavorites(f => f.includes(ev.id) ? f.filter(x => x !== ev.id) : [...f, ev.id])} style={{ position: 'absolute', top: 12, right: 12, padding: 8, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444' }}>
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
              <div className="card" style={{ borderRadius: 28, overflow: 'hidden' }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                <div style={{ padding: 20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, fontSize: 13 }}><Calendar size={18} color="#6366f1"/> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 13 }}><Clock size={18} color="#6366f1"/> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`)} style={{ background: 'rgba(99,102,241,0.1)', padding: 16, borderRadius: 16, cursor: 'pointer' }}>
                      <MapPin size={18} color="#6366f1"/> <b>{selectedEvent.address}, {selectedEvent.city}<br/><span style={{fontSize:9, color:'#2563eb'}}>COMO LLEGAR (GPS)</span></b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CREAR EVENTO - OPTIMIZADO PARA MÓVIL */}
          {view === 'create' && (
            <div className="no-scrollbar" style={{ padding: 16, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
              <div className="card" style={{ padding: 20, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 16 }}>AÑADIR EVENTO</h2>
                
                <input name="title" placeholder="TÍTULO" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700, fontSize: 12 }} value={form.title} onChange={handleInputChange} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700, fontSize: 12 }} value={form.city} onChange={handleInputChange} />
                  <select name="category" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700, fontSize: 12 }} value={form.category} onChange={handleInputChange}>
                    <option value="MUSICA">MÚSICA</option>
                    <option value="GASTRONOMIA">GASTRONOMÍA</option>
                    <option value="TAURINO">TAURINO</option>
                    <option value="FIESTAS PATRONALES">FIESTAS</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                </div>

                <input name="address" placeholder="DIRECCIÓN" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700, fontSize: 12 }} value={form.address} onChange={handleInputChange} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                   <input name="date" type="date" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontSize: 12 }} value={form.date} onChange={handleInputChange} />
                   <input name="time" type="time" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontSize: 12 }} value={form.time} onChange={handleInputChange} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                   <button onClick={() => { if (!form.title) return alert("Título!"); setIsGenerating(true); setForm({...form, image_url: `https://image.pollinations.ai/prompt/professional_event_photography_${form.title}?width=800&height=600&seed=${Date.now()}`}); setTimeout(()=>setIsGenerating(false),1500); }} style={{ padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900 }}>{isGenerating ? 'GENERANDO...' : 'IA FOTO'}</button>
                   <label style={{ padding: 12, background: '#1e293b', color: 'white', textAlign:'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>GALERÍA <input type="file" style={{display:'none'}} onChange={(e)=>{ const r = new FileReader(); r.onload=(ev)=>setForm({...form, image_url: ev.target.result}); r.readAsDataURL(e.target.files[0]); }}/></label>
                </div>

                {form.image_url && <img src={form.image_url} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10 }} />}

                <button style={{ width: '100%', background: '#16a34a', color: 'white', padding: 15, borderRadius: 14, border: 'none', fontWeight: 900, fontSize: 12, marginTop: 5 }}>ENVIAR REVISIÓN</button>
              </div>
            </div>
          )}

          {/* GUARDADOS */}
          {view === 'favorites' && (
            <div className="no-scrollbar" style={{ padding: 16, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>MIS GUARDADOS</h2>
              {favoriteEvents.length === 0 ? <p style={{textAlign:'center', opacity:0.5}}>Vacío</p> : 
                favoriteEvents.map(ev => (
                  <div key={ev.id} className="card" style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 20, marginBottom: 10, alignItems: 'center' }}>
                    <img src={ev.image_url} style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}><p style={{ fontWeight: 900, fontSize: 14 }}>{ev.title}</p><p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city}</p></div>
                    <button onClick={() => toggleFavorite(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444' }}><Trash2 size={20}/></button>
                  </div>
                ))
              }
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
