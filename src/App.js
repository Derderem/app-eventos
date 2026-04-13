import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2, Upload,
  Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Estilos obligatorios
import 'leaflet/dist/leaflet.css';

// FIX DRÁSTICO PARA ELIMINAR LÍNEAS EN EL MAPA Y ESTILOS
const appStyles = `
  .leaflet-container { background-color: #f4f4f4 !important; }
  .leaflet-tile {
    /* SOLUCIÓN RADICAL A LAS LÍNEAS BLANCAS: Solapamiento forzado */
    width: 258px !important;
    height: 258px !important;
    margin-left: -1px !important;
    margin-top: -1px !important;
    outline: 1px solid transparent;
    filter: brightness(1.03);
  }
  .logo-eventora {
    font-family: 'Arial Black', sans-serif;
    font-weight: 900;
    font-style: italic;
    display: flex;
    align-items: center;
    letter-spacing: -2.5px;
    font-size: 26px;
  }
`;

// Fix Marcadores Leaflet
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
      map.setView([40.4167, -3.7037], 6); // Madrid, Centro de España
    }, 600);
  }, [map]);
  return null;
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]); 
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCoffeeOptions, setShowCoffeeOptions] = useState(false);

  const paypalUrl = "https://paypal.me/jacobogarver"; 
  const kofiUrl = "https://ko-fi.com/jacobogarver";

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
      else { setUser(null); setProfile(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (id) => {
    if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
    else {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (prof) setProfile(prof);
    }
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (f) setFavorites(f.map(item => String(item.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const generateIA = () => {
    if (!form.title) return showNotification("Pon un título ✨");
    setIsProcessing(true);
    const urlIA = `https://image.pollinations.ai/prompt/professional_event_photography_of_${encodeURIComponent(form.title)}?width=800&height=1000&seed=${Date.now()}&nologo=true`;
    const img = new Image();
    img.src = urlIA;
    img.onload = () => { setForm({...form, image_url: urlIA}); setIsProcessing(false); showNotification("Imagen Lista ✨"); };
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const name = `${Date.now()}_img.jpg`;
      await supabase.storage.from('event-images').upload(name, file);
      const { data } = supabase.storage.from('event-images').getPublicUrl(name);
      setForm({ ...form, image_url: data.publicUrl });
      showNotification("¡Foto subida!");
    } catch (err) { alert("Error al subir"); }
    finally { setIsProcessing(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.image_url) return showNotification("Falta foto ✨");
    setIsSubmitting(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address + ', ' + form.city + ', España')}&limit=1`);
      const geo = await res.json();
      let lat = 40.41; let lng = -3.70;
      if (geo && geo.length > 0) { lat = parseFloat(geo[0].lat); lng = parseFloat(geo[0].lon); }
      await supabase.from('events').insert([{ ...form, lat, lng, status: profile?.role === 'admin' ? 'approved' : 'pending', organizer_id: user?.id }]);
      showNotification("¡Enviado!");
      setView('home'); fetchEvents();
      setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
    } catch (err) { alert("Error"); }
    finally { setIsSubmitting(false); }
  };

  const toggleFavorite = async (ev) => {
    if (!user) return showNotification("Inicia sesión ❤️");
    const id = String(ev.id);
    if (favorites.includes(id)) {
      setFavorites(f => f.filter(i => i !== id));
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: id });
    } else {
      setFavorites(f => [...f, id]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: id });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const activeEvents = events.filter(e => e.date >= today);
  const publicEvents = activeEvents.filter(e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory));

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{appStyles}</style>
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white font-sans overflow-hidden transition-all duration-500">
        
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-in slide-in-from-top text-center">
            <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        <nav className="h-[70px] shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-6 z-[2000] shadow-sm">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
             {/* LOGO EVENTORA IDENTICO A TU FOTO RECREADO CON CÓDIGO */}
             <div className="logo-eventora">
                <span style={{color: '#00e5ff'}}>E</span>
                <span style={{color: '#00e5ff'}}>V</span>
                <span style={{color: '#38bdf8'}}>E</span>
                <span style={{color: '#3b82f6'}}>N</span>
                <span style={{color: '#6366f1'}}>T</span>
                <span style={{color: '#8b5cf6'}}>O</span>
                <span style={{color: '#a855f7'}}>R</span>
                <span style={{color: '#d946ef'}}>A</span>
                <div className="ml-2 bg-indigo-500/20 p-1 rounded-lg">
                  <Calendar className="text-indigo-400" size={24} />
                </div>
             </div>
          </div>
          <div className="flex items-center gap-4">
            {(profile?.role === 'admin' || user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') && (
              <button onClick={() => setView('admin')} className="text-slate-400"><ShieldCheck size={28}/></button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-800/50">
               {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
            {user ? <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-xl cursor-pointer uppercase shadow-indigo-500/20" onClick={() => setView('profile')}>{user.email[0]}</div> : <button onClick={() => {const e = window.prompt("Email:"); if(e) supabase.auth.signInWithOtp({email:e})}} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-lg">Entrar</button>}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in fade-in">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl font-bold text-[10px] tracking-widest transition-all shrink-0 border border-slate-700 ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-lg border-indigo-500' : 'bg-slate-800/40 text-slate-400'}`}>{cat}</button>
                ))}
              </div>
              <div className="space-y-6">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[400px] border border-slate-800">
                    <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-1000" alt="img" />
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-2.5 bg-white rounded-full text-red-500 shadow-xl">
                        <Heart size={18} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-center items-center text-center">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4 text-white line-clamp-1">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="w-full max-w-[280px] bg-blue-600 text-white py-4 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-xl mx-auto p-4 pt-2 text-center animate-in slide-in-from-bottom pb-40">
               <div className="bg-[#0f172a] rounded-[3rem] p-6 shadow-2xl border border-slate-800">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-black text-white border-2 border-white shadow-xl shadow-indigo-500/20 uppercase font-black">
                    {user?.email[0]}
                  </div>
                  <h2 className="text-sm font-black mb-8 uppercase tracking-widest text-slate-300">Apoya el Proyecto</h2>
                  <div className="space-y-4">
                    {!showCoffeeOptions ? (
                      <button onClick={() => setShowCoffeeOptions(true)} className="w-full bg-amber-500 text-white p-5 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-lg active:scale-95 transition">
                        <Coffee size={20} /> Invitar a un café
                      </button>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 animate-in zoom-in duration-200">
                        <a href={kofiUrl} target="_blank" rel="noreferrer" className="w-full bg-[#29abe0] text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-md active:scale-95 transition">
                          <ExternalLink size={16} /> Ko-fi
                        </a>
                        <a href={paypalUrl} target="_blank" rel="noreferrer" className="w-full bg-[#003087] text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-md active:scale-95 transition">
                          <CreditCard size={16} /> PayPal
                        </a>
                        <button onClick={() => setShowCoffeeOptions(false)} className="w-full bg-slate-800 text-white p-3 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 mt-2 shadow-lg"><ArrowLeft size={14} /> VOLVER</button>
                      </div>
                    )}
                    <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-600/20 text-red-500 border border-red-500/30 p-4 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3 active:scale-95 transition mt-6"><LogOut size={20} /> Cerrar Sesión</button>
                  </div>
               </div>
            </div>
          )}

          {/* MAPA CARTO VOYAGER (ESPAÑA EN ESPAÑOL Y SIN LÍNEAS) */}
          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-white"> 
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full" zoomControl={false}> 
                <SpainMapController />
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{y}/{x}{r}.png" attribution='&copy; OpenStreetMap' /> 
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-1 text-center" onClick={() => setSelectedEvent(ev)}>
                        <div className="font-bold text-[10px] uppercase text-indigo-600 mb-1 leading-tight">{ev.title}</div>
                        <p className="text-[8px] font-bold uppercase opacity-60">{ev.city}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}

          {view === 'favorites' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in fade-in text-center text-white">
               <h3 className="text-3xl font-black uppercase tracking-widest text-indigo-600 mb-10">GUARDADOS</h3>
               <div className="space-y-4 text-left">
                  {activeEvents.filter(e => favorites.includes(String(e.id))).map(ev => (
                    <div key={ev.id} className="bg-[#0f172a] p-4 rounded-[1.5rem] border border-slate-800 flex justify-between items-center shadow-lg">
                       <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                          <img src={ev.image_url} className="w-14 h-14 rounded-xl object-cover" alt="ev" />
                          <div><span className="font-black text-sm block uppercase tracking-tighter text-white line-clamp-1">{ev.title}</span><span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{ev.city}</span></div>
                       </div>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-red-500 active:scale-75 transition-all"><Trash2 size={20} /></button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-4 transition-all text-slate-500">
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} className={`p-4 rounded-2xl transition-all ${view === 'home' ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]" : ""}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className="p-4 rounded-2xl hover:text-white transition-all"><PlusCircle size={26}/></button>
          <button onClick={() => {setView('favorites'); setSelectedEvent(null);}} className={`p-4 rounded-2xl transition-all ${view === 'favorites' ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]" : ""}`}><Heart size={26}/></button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl transition-all ${view === 'map' ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]" : ""}`}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}

export default App;
