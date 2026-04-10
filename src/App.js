import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Configuración de Iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => { map.invalidateSize(); }, 600); }, [map]);
  return null;
}

// Inicialización de Supabase
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
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
  const [rejectingId, setRejectingId] = useState(null);
  const [reasonText, setReasonText] = useState("");

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
      else { setUser(null); setProfile(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { setUser(session.user); loadUserData(session.user.id); }
  };

  const loadUserData = async (id) => {
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (prof) setProfile(prof);
      if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
      if (f) setFavorites(f.map(item => String(item.event_id)));
    } catch (e) { console.log("Error loading profile"); }
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    if (user) await supabase.auth.signOut();
    const e = window.prompt("Introduce tu email:");
    if (e) {
      alert("Enviando enlace...");
      await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin } });
    }
  };

  const generateIA = () => {
    if (!form.title) return showNotification("Escribe un título ✨");
    setIsProcessing(true);
    const q = encodeURIComponent(form.title);
    const url = `https://image.pollinations.ai/prompt/professional_event_photo_of_${q}?width=800&height=1000&nologo=true&seed=${Date.now()}`;
    const img = new Image(); img.src = url;
    img.onload = () => { setForm({...form, image_url: url}); setIsProcessing(false); showNotification("Imagen generada"); };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.image_url) return showNotification("Añade imagen ✨");
    setIsSubmitting(true);
    const lat = 36 + Math.random() * 7;
    const lng = -9 + Math.random() * 12;
    const isAdmin = profile?.role === 'admin';
    await supabase.from('events').insert([{ ...form, lat, lng, status: isAdmin ? 'approved' : 'pending', organizer_id: user?.id }]);
    showNotification(isAdmin ? "¡Publicado!" : "¡En revisión!");
    setView('home'); fetchEvents(); setIsSubmitting(false);
    setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  };

  const handleRejectEvent = async (id) => {
    if (!reasonText) return alert("Escribe el motivo");
    await supabase.from('events').update({ status: 'rejected', rejection_reason: reasonText }).eq('id', id);
    setRejectingId(null); setReasonText(""); fetchEvents();
    showNotification("Evento denegado");
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

  const handleImGoing = async () => {
    if (!user) return showNotification("Inicia sesión");
    if (!favorites.includes(String(selectedEvent.id))) {
      setFavorites(f => [...f, String(selectedEvent.id)]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: selectedEvent.id });
    }
    showNotification("¡Confirmado!");
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  const publicEvents = events.filter(e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory));

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white font-sans overflow-hidden transition-colors duration-500">
        
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl border-2 border-white/20 animate-in slide-in-from-top">
            <CheckCircle2 size={18} className="inline mr-2"/> 
            <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setView('home'); setSelectedEvent(null);}}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/30 text-xl italic">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && <button onClick={() => setView('admin')} className="p-2 text-slate-400"><ShieldCheck size={24}/></button>}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? (
              <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-xl cursor-pointer" onClick={() => setView('profile')}>
                {user.email[0].toUpperCase()}
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase shadow-lg">Entrar</button>
            )}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          
          {/* VISTA HOME COMPACTA (Todo entra en pantalla) */}
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40 animate-in fade-in duration-500">
              {/* Categorías */}
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-1">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-4 py-2.5 rounded-xl font-black text-[9px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'bg-slate-900/40 text-slate-500 border-slate-800'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid de Eventos: Reducido para que quepa en pantalla */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col group h-auto transition-all duration-500 hover:border-indigo-500/50">
                    
                    {/* Imagen con altura controlada a h-64 (256px) para evitar scroll */}
                    <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="img" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                          {ev.category}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} 
                        className="absolute top-4 right-4 p-3 bg-slate-900/60 backdrop-blur-md rounded-full text-red-500 shadow-xl active:scale-75 transition"
                      >
                        <Heart size={18} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>

                    {/* Contenido ajustado con menos paddings */}
                    <div className="p-5 flex flex-col flex-1 justify-between text-center gap-4">
                      <h3 className="text-xl font-black leading-tight uppercase tracking-tighter italic text-white">
                        {ev.title}
                      </h3>
                      
                      {/* Botón Ver Detalles */}
                      <button 
                        onClick={() => setSelectedEvent(ev)} 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all duration-300"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA CREAR */}
          {view === 'create' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in slide-in-from-bottom duration-500">
              <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-2xl font-black mb-6 text-indigo-500 text-center uppercase tracking-tighter italic">Publicar</h2>
                <form onSubmit={handleCreate} className="space-y-3">
                  <input required placeholder="TÍTULO" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold uppercase" value={form.title} onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
                  <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-black text-xs uppercase" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option>
                  </select>
                  <input required placeholder="CIUDAD" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold uppercase" value={form.city} onChange={e => setForm({...form, city: e.target.value.toUpperCase()})} />
                  <input required placeholder="DIRECCIÓN" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <div className="flex gap-2">
                    <input required type="date" className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-400" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <input required type="time" className="w-28 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-400" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                  <div className="pt-4 text-center">
                    <div className="h-32 w-full bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden mb-3 flex items-center justify-center border-4 border-dashed border-slate-700">
                      {isProcessing ? <Loader2 className="animate-spin text-indigo-600"/> : form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" alt="Preview" /> : <Camera size={24} className="text-slate-300"/>}
                    </div>
                    <button type="button" onClick={generateIA} className="w-full bg-indigo-600 text-white p-3.5 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2">
                      <Sparkles size={14}/> GENERAR CON IA ✨
                    </button>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-white text-slate-900 p-4 rounded-2xl font-black shadow-xl mt-2 uppercase tracking-widest text-xs">
                    {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR AHORA'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VISTA ADMIN */}
          {view === 'admin' && (
            <div className="max-w-2xl mx-auto p-4 pb-40 animate-in slide-in-from-top">
              <h2 className="text-2xl font-black mb-6 text-amber-500 text-c
