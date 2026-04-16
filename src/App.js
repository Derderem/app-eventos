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
// CONFIGURACIÓN DE ESTILOS (SISTEMA DE TEMAS)
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; transition: all 0.3s ease; }
  
  .leaflet-container { background-color: #aad3df !important; border: none !important; }
  .leaflet-tile { transform: scale(1.02) !important; outline: 1px solid transparent; }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* TEMAS */
  .dark { background-color: #020617; color: white; }
  .light { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

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
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favs')) || []);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [form, setForm] = useState({ title: '', city: '', time: '21:00', date: '', address: '', image_url: '' });

  useEffect(() => {
    fetchEvents();
    localStorage.setItem('favs', JSON.stringify(favorites));
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      else setProfile(null);
    });
  }, [favorites]);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (data) setEvents(data);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = (name === 'title' || name === 'city') ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const generateAIImage = () => {
    if (!form.title) return alert("Escribe primero un título");
    setIsGenerating(true);
    const url = `https://image.pollinations.ai/prompt/professional_event_photography_of_${encodeURIComponent(form.title)}?width=800&height=600&seed=${Date.now()}`;
    setForm({ ...form, image_url: url });
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const handleGalleryUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setForm({ ...form, image_url: readerEvent.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const adminEvents = events.filter(e => e.status === 'pending');
  const favoriteEvents = publicEvents.filter(e => favorites.includes(e.id));

  return (
    <div className={isDark ? "dark" : "light"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      
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

      <div style={{ position: 'relative', zIndex: 10, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: view === 'map' ? 'transparent' : undefined }}>
        
        {/* NAV SUPERIOR: SOL/LUNA Y ESCUDO A LA DERECHA */}
        <nav style={{ 
          height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '0 20px', borderBottom: '1px solid rgba(128,128,128,0.2)', backdropFilter: 'blur(10px)'
        }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            {profile?.role === 'admin' && (
              <ShieldCheck size={26} className={adminEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: adminEvents.length > 0 ? '#ef4444' : '#6366f1', cursor: 'pointer' }} onClick={() => setView('admin')} />
            )}
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
               {isDark ? <Sun size={24} color="#facc15" /> : <Moon size={24} color="#4f46e5" />}
            </button>
            <Sparkles size={24} color="#6366f1" style={{ cursor: 'pointer' }} onClick={() => setView('profile')} />
          </div>
        </nav>

        <main style={{ flex: 1, overflowY: 'auto' }} className="no-scrollbar">
          
          {view === 'home' && !selectedEvent && (
            <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, paddingBottom: 150 }}>
              {publicEvents.map(ev => (
                <div key={ev.id} className="card" style={{ borderRadius: 32, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ position: 'relative', height: 180 }}>
                    <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <button onClick={() => toggleFavorite(ev.id)} style={{ position: 'absolute', top: 15, right: 15, padding: 10, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex' }}>
                      <Heart size={20} fill={favorites.includes(ev.id) ? "#ef4444" : "none"} />
                    </button>
                  </div>
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <h3 style={{ fontWeight: 900, fontSize: 18 }}>{ev.title}</h3>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', letterSpacing: 2, marginBottom: 15 }}>{ev.city}</p>
                    <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 14, borderRadius: 16, background: '#2563eb', color: 'white', border: 'none', fontWeight: 900, fontSize: 11 }}>DETALLES</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedEvent && (
            <div style={{ padding: 20, paddingBottom: 150, maxWidth: 500, margin: '0 auto' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 15 }}><ArrowLeft size={20}/> VOLVER</button>
              <div className="card" style={{ borderRadius: 30, overflow: 'hidden' }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} />
                <div style={{ padding: 25 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 12 }}><Calendar color="#6366f1"/> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 12 }}><Clock color="#6366f1"/> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`, '_blank')} style={{ display: 'flex', gap: 12, cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 15 }}>
                      <MapPin color="#6366f1"/> <b>{selectedEvent.address}, {selectedEvent.city}<br/><span style={{fontSize:10, color:'#2563eb'}}>CÓMO LLEGAR (GPS)</span></b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="no-scrollbar" style={{ maxWidth: 450, margin: '0 auto', padding: 20, paddingBottom: 150 }}>
              <div className="card" style={{ padding: 24, borderRadius: 32, spaceY: 16 }}>
                <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>NUEVO EVENTO</h2>
                <input name="title" placeholder="TÍTULO (EJ: CONCIERTO)" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgba(128,128,128,0.1)', border: 'none', marginBottom: 12, color: 'inherit', fontWeight: 700 }} value={form.title} onChange={handleInputChange} />
                <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgba(128,128,128,0.1)', border: 'none', marginBottom: 12, color: 'inherit', fontWeight: 700 }} value={form.city} onChange={handleInputChange} />
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 900, opacity: 0.5, marginBottom: 8, display: 'block' }}>FOTO DEL EVENTO</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={generateAIImage} style={{ background: '#4f46e5', color: 'white', padding: 12, borderRadius: 12, border: 'none', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      {isGenerating ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} IA GENERAR
                    </button>
                    <label style={{ background: '#1e293b', color: 'white', padding: 12, borderRadius: 12, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                      <Camera size={14}/> GALERÍA
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGalleryUpload} />
                    </label>
                  </div>
                </div>

                {form.image_url && <img src={form.image_url} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 16, marginBottom: 16 }} alt="Preview" />}

                <button style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 18, borderRadius: 16, border: 'none', fontWeight: 900 }}>ENVIAR REVISIÓN</button>
              </div>
            </div>
          )}

          {view === 'favorites' && (
            <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, paddingBottom: 150 }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>MIS GUARDADOS</h2>
              {favoriteEvents.length === 0 ? <p style={{textAlign:'center', opacity:0.5}}>No hay nada guardado</p> : 
                favoriteEvents.map(ev => (
                  <div key={ev.id} className="card" style={{ display: 'flex', gap: 15, padding: 15, borderRadius: 25, marginBottom: 12, alignItems: 'center' }}>
                    <img src={ev.image_url} style={{ width: 65, height: 65, borderRadius: 15, objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}><p style={{ fontWeight: 900 }}>{ev.title}</p><p style={{ fontSize: 10, color: '#6366f1' }}>{ev.city}</p></div>
                    <button onClick={() => toggleFavorite(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444' }}><Trash2 size={22}/></button>
                  </div>
                ))
              }
            </div>
          )}

          {view === 'profile' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className="card" style={{ padding: 30, borderRadius: 45, width: '100%', maxWidth: 350, textAlign: 'center' }}>
                <h2 style={{ fontWeight: 900, marginBottom: 20 }}>SOPORTE</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                   <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Coffee size={20}/> KO-FI</a>
                   <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><CreditCard size={20}/> PAYPAL</a>
                </div>
              </div>
            </div>
          )}
        </main>

        <nav style={{ 
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', 
          width: '94%', maxWidth: 400, height: 75, borderRadius: 35, display: 'flex', 
          alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000
        }}>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: view === 'home' ? '#2563eb' : '#64748b' }}><LayoutList size={26}/></button>
          <button onClick={() => setView('favorites')} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b' }}><Heart size={26} fill={view === 'favorites' ? "#ef4444" : "none"}/></button>
          <button onClick={() => setView('create')} style={{ background: 'none', border: 'none', color: view === 'create' ? '#2563eb' : '#64748b' }}><PlusCircle size={26}/></button>
          <button onClick={() => setView('map')} style={{ background: 'none', border: 'none', color: view === 'map' ? '#2563eb' : '#64748b' }}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
