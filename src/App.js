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
// ESTILOS GLOBALES
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  html, body, #root {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }

  .leaflet-container { 
    background: #aad3df !important; 
    height: 100% !important; 
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    outline: none !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
  }

  .leaflet-control-attribution {
    font-size: 9px !important;
    background: rgba(255,255,255,0.7) !important;
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .dark-theme { background-color: #020617; color: white; }
  .light-theme { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  @keyframes admin-pulse {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.15); color: #ef4444; }
    100% { transform: scale(1); color: #818cf8; }
  }
  .pulse-admin { animation: admin-pulse 2s infinite; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin { animation: spin 1s linear infinite; }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  .fade-in { animation: fadeIn 0.4s ease-out; }

  @keyframes shimmerAnim {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .shimmer-bg {
    background: linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%);
    background-size: 1000px 100%;
    animation: shimmerAnim 1.5s infinite linear;
  }

  .ia-card {
    transition: all 0.3s ease;
    cursor: pointer;
    border: 3px solid transparent;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    background: #1e293b;
    min-height: 200px;
  }
  .ia-card:hover {
    transform: scale(1.02);
    border-color: #6366f1;
  }
  .ia-card.selected {
    border-color: #4f46e5;
    box-shadow: 0 0 25px rgba(79, 70, 229, 0.6);
  }
`;

// FIX ICONOS LEAFLET
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapResizer({ center }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (center) {
        map.setView(center, 13, { animate: true });
      } else {
        map.setView([40.4167, -3.7037], 6);
      }
    }, 300);
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

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('eventora_favs_v4');
    return saved ? JSON.parse(saved) : [];
  });
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  
  // ⭐ ESTADO IA - cada foto independiente
  const [showIaModal, setShowIaModal] = useState(false);
  const [iaUrl1, setIaUrl1] = useState('');
  const [iaUrl2, setIaUrl2] = useState('');
  const [iaLoaded1, setIaLoaded1] = useState(false);
  const [iaLoaded2, setIaLoaded2] = useState(false);
  const [iaError1, setIaError1] = useState(false);
  const [iaError2, setIaError2] = useState(false);

  const [form, setForm] = useState({ title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' });

  useEffect(() => {
    fetchEvents();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') {
        setProfile({ role: 'admin' });
      } else {
        setProfile(null);
      }
    });
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
  }, [favorites]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*');
      if (error) {
        console.error('Error fetching events:', error);
        return;
      }
      if (data) setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const needsUpper = ['title', 'city', 'localidad'];
    const val = needsUpper.includes(name) ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  // ⭐ GENERAR 2 IMÁGENES IA - Versión robusta
  const generateAIImages = () => {
    if (!form.title) {
      alert("Escribe un título primero");
      return;
    }
    
    // Resetear estados
    setIaLoaded1(false);
    setIaLoaded2(false);
    setIaError1(false);
    setIaError2(false);
    setIaUrl1('');
    setIaUrl2('');
    
    setShowIaModal(true);
    
    // Pequeño delay para que el modal se monte antes de poner las URLs
    setTimeout(() => {
      const cat = (form.category || 'event').toLowerCase().replace(/\s+/g, '-');
      const title = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
      
      // Seeds totalmente aleatorios
      const seed1 = Math.floor(Math.random() * 999999999);
      const seed2 = Math.floor(Math.random() * 999999999);
      
      // PROMPTS MUY DIFERENTES para garantizar imágenes distintas
      const prompt1 = encodeURIComponent(`professional photography of ${title} ${cat} event, realistic, high quality, 8k`);
      const prompt2 = encodeURIComponent(`artistic cinematic poster of ${title} ${cat}, vibrant colors, dramatic lighting, illustration`);
      
      // URLs con seeds únicos y nologo
      const url1 = `https://image.pollinations.ai/prompt/${prompt1}?width=800&height=600&seed=${seed1}&nologo=true&model=flux`;
      const url2 = `https://image.pollinations.ai/prompt/${prompt2}?width=800&height=600&seed=${seed2}&nologo=true&model=flux`;
      
      console.log('Generando IA URL 1:', url1);
      console.log('Generando IA URL 2:', url2);
      
      setIaUrl1(url1);
      setIaUrl2(url2);
    }, 100);
  };

  // ⭐ REGENERAR - resetea todo y vuelve a generar
  const regenerateIaImages = () => {
    setIaLoaded1(false);
    setIaLoaded2(false);
    setIaError1(false);
    setIaError2(false);
    setIaUrl1('');
    setIaUrl2('');
    
    setTimeout(() => {
      const cat = (form.category || 'event').toLowerCase().replace(/\s+/g, '-');
      const title = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
      
      const seed1 = Math.floor(Math.random() * 999999999);
      const seed2 = Math.floor(Math.random() * 999999999);
      
      const prompt1 = encodeURIComponent(`professional photography of ${title} ${cat} event, realistic, high quality, 8k`);
      const prompt2 = encodeURIComponent(`artistic cinematic poster of ${title} ${cat}, vibrant colors, dramatic lighting, illustration`);
      
      const url1 = `https://image.pollinations.ai/prompt/${prompt1}?width=800&height=600&seed=${seed1}&nologo=true&model=flux`;
      const url2 = `https://image.pollinations.ai/prompt/${prompt2}?width=800&height=600&seed=${seed2}&nologo=true&model=flux`;
      
      setIaUrl1(url1);
      setIaUrl2(url2);
    }, 200);
  };

  const selectIaImage = (url) => {
    setForm({ ...form, image_url: url });
    setShowIaModal(false);
  };

  const closeIaModal = () => {
    setShowIaModal(false);
  };

  const handleGalleryUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm({ ...form, image_url: ev.target.result });
      reader.readAsDataURL(file);
    }
  };

  const handleCitySearch = async (city) => {
    if (city === 'ESPAÑA') {
      setMapCenter(null);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=${encodeURIComponent(city + ', España')}`);
      const data = await response.json();
      if (data && data[0]) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (err) {
      console.error('Error buscando ciudad:', err);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const filteredEvents = publicEvents.filter(e => selectedCategory === 'TODOS' || e.category === selectedCategory);
  const favoriteEvents = publicEvents.filter(e => favorites.includes(e.id));
  const citiesList = [...new Set(publicEvents.map(e => e.city))];

  return (
    <div className={isDark ? "dark-theme" : "light-theme"} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>

      <div style={{ position: 'relative', zIndex: 10, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* NAV SUPERIOR */}
        <nav style={{ height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => {setView('home'); setSelectedEvent(null);}}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
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
          
          {/* VISTA MAPA */}
          {view === 'map' && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, background: '#aad3df', margin: 0, padding: 0 }}>
              <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 320 }}>
                <div style={{ background: '#fff', borderRadius: 15, padding: '5px 15px', display: 'flex', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                  <Search size={18} color="#6366f1" />
                  <select onChange={(e) => handleCitySearch(e.target.value)} style={{ width: '100%', padding: 12, border: 'none', outline: 'none', fontWeight: 900, fontSize: 12, color: '#0f172a', background: 'transparent' }}>
                    <option value="ESPAÑA">📍 BUSCAR CIUDAD...</option>
                    {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <MapContainer 
                center={[40.4167, -3.7037]} 
                zoom={6} 
                style={{ width: '100%', height: '100%', margin: 0, padding: 0 }} 
                zoomControl={true}
                scrollWheelZoom={true}
              >
                <MapResizer center={mapCenter} />
                <TileLayer 
                  url="https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}" 
                  attribution='&copy; Google Maps'
                  maxZoom={20}
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                />
                {publicEvents.map(ev => ev.lat && ev.lng && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup><b>{ev.title}</b><br/>{ev.city}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {/* HOME */}
          {view === 'home' && !selectedEvent && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, padding: '15px 20px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '10px 22px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}>{cat}</button>
                ))}
              </div>
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 150 }}>
                {filteredEvents.map(ev => (
                  <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 32, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ position: 'relative', height: 180 }}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <button onClick={() => toggleFavorite(ev.id)} style={{ position: 'absolute', top: 15, right: 15, padding: 10, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' }}>
                        <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                      </button>
                    </div>
                    <div style={{ padding: 20, textAlign: 'center' }}>
                      <h3 style={{ fontWeight: 900, fontSize: 18 }}>{ev.title}</h3>
                      <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 15 }}>{ev.city} | {ev.date}</p>
                      <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 14, borderRadius: 16, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>DETALLES</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETALLES */}
          {selectedEvent && (
            <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 20, cursor: 'pointer' }}><ArrowLeft/> VOLVER</button>
              <div className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 30, overflow: 'hidden', padding: 0 }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} alt="" />
                <div style={{ padding: 25 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 15 }}>{selectedEvent.title}</h2>
                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 10 }}><Calendar color="#6366f1"/> <b>{selectedEvent.date}</b></div>
                    <div style={{ display: 'flex', gap: 10 }}><Clock color="#6366f1"/> <b>{selectedEvent.time}H</b></div>
                    <div onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.localidad + ' ' + selectedEvent.city)}`)} style={{ background: 'rgba(99,102,241,0.1)', padding: 20, borderRadius: 15, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1' }}>
                      <MapPin color="#6366f1" style={{margin:'0 auto 5px'}}/> <br/> <b>{selectedEvent.address}, {selectedEvent.localidad} - {selectedEvent.city}</b> <br/>
                      <span style={{fontSize:10, color:'#2563eb', fontWeight: 900}}>INICIAR GPS (GOOGLE MAPS)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CREAR EVENTO */}
          {view === 'create' && (
            <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 150 }}>
              <div className={isDark ? "card-dark" : "card-light"} style={{ padding: 20, borderRadius: 30, gap: 10, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 16 }}>AÑADIR EVENTO</h2>
                <input name="title" placeholder="TÍTULO" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.title} onChange={handleInputChange} />
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                  <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.city} onChange={handleInputChange} />
                  <select name="category" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.category} onChange={handleInputChange}>
                    <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS</option><option value="OTROS">OTROS</option>
                  </select>
                </div>
                <input name="localidad" placeholder="LOCALIDAD" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.localidad} onChange={handleInputChange} />
                <input name="address" placeholder="DIRECCIÓN" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.address} onChange={handleInputChange} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                   <input name="date" type="date" style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.date} onChange={handleInputChange} />
                   <input name="time" type="time" style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.time} onChange={handleInputChange} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                   <button onClick={generateAIImages} style={{ padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                    <Sparkles size={14}/> IA FOTO
                   </button>
                   <label style={{ padding: 12, background: '#1e293b', color: 'white', textAlign:'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>GALERÍA <input type="file" style={{display:'none'}} onChange={handleGalleryUpload}/></label>
                </div>
                {form.image_url && (
                  <div style={{ position: 'relative' }}>
                    <img src={form.image_url} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 15 }} alt="" />
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(34, 197, 94, 0.9)', color: 'white', padding: '4px 10px', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12}/> SELECCIONADA
                    </div>
                  </div>
                )}

                <button style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 15, borderRadius: 12, border: 'none', fontWeight: 900, cursor: 'pointer' }}>ENVIAR REVISIÓN</button>
              </div>
            </div>
          )}

          {/* GUARDADOS */}
          {view === 'favorites' && (
            <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>MIS GUARDADOS</h2>
              {favoriteEvents.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700, padding: 40 }}>EN ESTOS MOMENTOS NO HAY NINGÚN EVENTO GUARDADO</p>
              ) : (
                favoriteEvents.map(ev => (
                  <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ display: 'flex', gap: 15, padding: 15, borderRadius: 25, marginBottom: 12, alignItems: 'center' }}>
                    <img src={ev.image_url} style={{ width: 60, height: 60, borderRadius: 15, objectFit: 'cover' }} alt="" />
                    <div style={{ flex: 1 }}><p style={{ fontWeight: 900 }}>{ev.title}</p><p style={{ fontSize: 10, color: '#6366f1' }}>{ev.city}</p></div>
                    <button onClick={() => toggleFavorite(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={22}/></button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SOPORTE */}
          {view === 'profile' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className={isDark ? "card-dark" : "card-light"} style={{ padding: 30, borderRadius: 45, width: '100%', maxWidth: 350, textAlign: 'center' }}>
                <h2 style={{ fontWeight: 900, marginBottom: 20 }}>SOPORTE</h2>
                <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                   <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>APOYAR EN KO-FI</a>
                   <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>APOYAR EN PAYPAL</a>
                </div>
                <button onClick={() => { const e = prompt("Email Admin:"); if(e) supabase.auth.signInWithOtp({email:e}) }} style={{ opacity: 0.1, fontSize: 10, background: 'none', border: 'none', cursor: 'pointer' }}>Admin Login</button>
              </div>
            </div>
          )}
        </main>

        {/* ⭐⭐⭐ MODAL IA - VERSIÓN ROBUSTA CON 2 IMÁGENES INDEPENDIENTES ⭐⭐⭐ */}
        {showIaModal && (
          <div style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.85)', 
            zIndex: 5000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(8px)'
          }}>
            <div className="fade-in" style={{ 
              background: isDark ? '#0f172a' : '#fff', 
              borderRadius: 30, 
              padding: 25, 
              width: '100%', 
              maxWidth: 500, 
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 25px 80px rgba(79, 70, 229, 0.4)'
            }}>
              {/* Cerrar */}
              <button 
                onClick={closeIaModal} 
                style={{ 
                  position: 'absolute', 
                  top: 15, 
                  right: 15, 
                  background: isDark ? '#1e293b' : '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: 35, 
                  height: 35, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  color: isDark ? '#fff' : '#0f172a',
                  zIndex: 10
                }}
              >
                <X size={18}/>
              </button>

              {/* Título */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Sparkles size={32} color="#6366f1" style={{ margin: '0 auto 10px' }}/>
                <h2 style={{ fontWeight: 900, fontSize: 18, color: isDark ? '#fff' : '#0f172a', marginBottom: 5 }}>
                  ELIGE TU FOTO FAVORITA
                </h2>
                <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>
                  La IA está generando 2 opciones únicas para ti
                </p>
                <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, marginTop: 5 }}>
                  ⏱️ Puede tardar entre 5-15 segundos
                </p>
              </div>

              {/* IMAGEN 1 */}
              <div 
                className={`ia-card ${form.image_url === iaUrl1 ? 'selected' : ''}`}
                onClick={() => iaLoaded1 && !iaError1 && selectIaImage(iaUrl1)}
                style={{ marginBottom: 15 }}
              >
                {!iaLoaded1 && !iaError1 && iaUrl1 && (
                  <div className="shimmer-bg" style={{ 
                    width: '100%', 
                    height: 200, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 10,
                    position: 'absolute',
                    top: 0, left: 0
                  }}>
                    <Loader2 className="animate-spin" size={30} color="#6366f1"/>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                      Generando OPCIÓN 1...
                    </p>
                  </div>
                )}
                {iaError1 && (
                  <div style={{ 
                    width: '100%', 
                    height: 200, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 10,
                    background: '#1e293b'
                  }}>
                    <X size={30} color="#ef4444"/>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                      Error - Pulsa "Regenerar"
                    </p>
                  </div>
                )}
                {iaUrl1 && (
                  <img 
                    src={iaUrl1}
                    style={{ 
                      width: '100%', 
                      height: 200, 
                      objectFit: 'cover', 
                      display: iaLoaded1 ? 'block' : 'none' 
                    }} 
                    alt="Opción 1"
                    onLoad={() => {
                      console.log('✅ Imagen 1 cargada');
                      setIaLoaded1(true);
                    }}
                    onError={() => {
                      console.log('❌ Error imagen 1');
                      setIaError1(true);
                    }}
                  />
                )}
                {iaLoaded1 && (
                  <>
                    <div style={{ 
                      position: 'absolute', 
                      top: 10, 
                      left: 10, 
                      background: '#4f46e5', 
                      color: 'white', 
                      padding: '6px 12px', 
                      borderRadius: 12, 
                      fontSize: 10, 
                      fontWeight: 900,
                      letterSpacing: 1
                    }}>
                      🎬 OPCIÓN 1 - REALISTA
                    </div>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', 
                      padding: '20px 15px 12px', 
                      color: 'white', 
                      fontSize: 11, 
                      fontWeight: 900,
                      textAlign: 'center'
                    }}>
                      👆 TOCA PARA ELEGIR ESTA
                    </div>
                  </>
                )}
              </div>

              {/* IMAGEN 2 */}
              <div 
                className={`ia-card ${form.image_url === iaUrl2 ? 'selected' : ''}`}
                onClick={() => iaLoaded2 && !iaError2 && selectIaImage(iaUrl2)}
                style={{ marginBottom: 20 }}
              >
                {!iaLoaded2 && !iaError2 && iaUrl2 && (
                  <div className="shimmer-bg" style={{ 
                    width: '100%', 
                    height: 200, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 10,
                    position: 'absolute',
                    top: 0, left: 0
                  }}>
                    <Loader2 className="animate-spin" size={30} color="#ec4899"/>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                      Generando OPCIÓN 2...
                    </p>
                  </div>
                )}
                {iaError2 && (
                  <div style={{ 
                    width: '100%', 
                    height: 200, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 10,
                    background: '#1e293b'
                  }}>
                    <X size={30} color="#ef4444"/>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                      Error - Pulsa "Regenerar"
                    </p>
                  </div>
                )}
                {iaUrl2 && (
                  <img 
                    src={iaUrl2}
                    style={{ 
                      width: '100%', 
                      height: 200, 
                      objectFit: 'cover', 
                      display: iaLoaded2 ? 'block' : 'none' 
                    }} 
                    alt="Opción 2"
                    onLoad={() => {
                      console.log('✅ Imagen 2 cargada');
                      setIaLoaded2(true);
                    }}
                    onError={() => {
                      console.log('❌ Error imagen 2');
                      setIaError2(true);
                    }}
                  />
                )}
                {iaLoaded2 && (
                  <>
                    <div style={{ 
                      position: 'absolute', 
                      top: 10, 
                      left: 10, 
                      background: '#ec4899', 
                      color: 'white', 
                      padding: '6px 12px', 
                      borderRadius: 12, 
                      fontSize: 10, 
                      fontWeight: 900,
                      letterSpacing: 1
                    }}>
                      🎨 OPCIÓN 2 - ARTÍSTICA
                    </div>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', 
                      padding: '20px 15px 12px', 
                      color: 'white', 
                      fontSize: 11, 
                      fontWeight: 900,
                      textAlign: 'center'
                    }}>
                      👆 TOCA PARA ELEGIR ESTA
                    </div>
                  </>
                )}
              </div>

              {/* Botón regenerar */}
              <button 
                onClick={regenerateIaImages}
                style={{ 
                  width: '100%', 
                  padding: 14, 
                  background: 'transparent', 
                  color: '#6366f1', 
                  border: '2px dashed #6366f1', 
                  borderRadius: 12, 
                  fontSize: 11, 
                  fontWeight: 900, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Sparkles size={14}/> GENERAR 2 NUEVAS OPCIONES
              </button>
            </div>
          </div>
        )}

        <nav style={{ position: 'fixed', bottom: 15, left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: 400, height: 75, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'home' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><LayoutList size={26}/></button>
          <button onClick={() => {setView('favorites'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer' }}><Heart size={26} fill={view === 'favorites' ? "#ef4444" : "none"}/></button>
          <button onClick={() => {setView('create'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><PlusCircle size={26}/></button>
          <button onClick={() => {setView('map'); setSelectedEvent(null);}} style={{ background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
   );
}
