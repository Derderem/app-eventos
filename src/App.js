import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, ShieldCheck, Star, DollarSign, Sparkles, Camera, Loader2, CheckCircle2, UserCircle, Flag
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Marcadores Mapa
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

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]); 
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', image_url: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
      else { setUser(null); setProfile(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (id) => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (prof) setProfile(prof);
    if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (f) setFavorites(f.map(item => String(item.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    const e = window.prompt("Email:");
    if (e) await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin } });
  };

  const generateIA = () => {
    if (!form.title) return showNotification("Escribe un título ✨");
    setIsProcessing(true);
    const q = encodeURIComponent(form.title);
    const url = `https://image.pollinations.ai/prompt/professional_photography_of_${q}_event?width=800&height=1200&nologo=true&seed=${Date.now()}`;
    const img = new Image();
    img.src = url;
    img.onload = () => { setForm({...form, image_url: url}); setIsProcessing(false); showNotification("Imagen cargada"); };
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
    if (!user) return;
    if (!favorites.includes(String(selectedEvent.id))) {
      setFavorites(f => [...f, String(selectedEvent.id)]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: selectedEvent.id });
    }
    showNotification("¡Gracias por asistir!");
  };

  const pendingCount = events.filter(e => e.status === 'pending').length;
  const filtered = events.filter(e => (activeCategory === 'TODOS' || e.category === activeCategory) && e.status === 'approved');

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
        
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-white/20 animate-in slide-in-from-top">
            <CheckCircle2 size={18}/> <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        {/* HEADER */}
        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-8 z-[2000] shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/30">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && <button onClick={() => setView('admin')} className={`p-2 transition ${pendingCount > 0 ? 'text-amber-500 animate-pulse drop-shadow-[0_0_8px_orange]' : 'text-slate-400'}`}><ShieldCheck size={26}/></button>}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all">{isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}</button>
            {user ? <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-md cursor-pointer" onClick={() => setView('profile')}>{user.email[0].toUpperCase()}</div> : <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-lg">Entrar</button>}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-52 animate-in fade-in">
              {/* CATEGORÍAS ACTUALIZADAS */}
              <div className="flex gap-2 overflow-x-auto pb-8 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-full font-black text-[9px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>{cat}</button>
                ))}
              </div>

              {/* TARJETAS MÁS GRANDES (h-72) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full group">
                    <div className="relative h-72 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-1000" alt="img" />
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition">
                        <Heart size={20} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                      <div className="absolute bottom-5 left-5 bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{ev.category}</div>
                    </div>
                    <div className="p-6 flex flex-col flex-1 text-center">
                      <h3 className="text-xl font-black mb-6 leading-tight uppercase tracking-tighter">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition shadow-lg">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-52 animate-in slide-in-from-bottom">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 text-center uppercase tracking-tighter italic">Publicar</h2>
                <form onSubmit={async (e) => { e.preventDefault(); if(!form.image_url) return; const isAdmin = profile?.role === 'admin'; await supabase.from('events').insert([{ ...form, status: isAdmin ? 'approved' : 'pending', organizer_id: user?.id }]); showNotification(isAdmin ? "¡Publicado!" : "¡Enviado!"); setView('home'); fetchEvents(); }} className="space-y-4">
                  <input required placeholder="Título" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none border-2 border-transparent focus:border-indigo-500 transition font-bold" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <select className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-black text-xs uppercase tracking-widest" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="MUSICA">MÚSICA</option>
                    <option value="GASTRONOMIA">GASTRONOMÍA</option>
                    <option value="TAURINOS">TAURINOS</option>
                    <option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                  <input required placeholder="Ciudad" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none focus:border-indigo-500 transition font-bold" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none focus:border-indigo-500 transition font-bold" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold text-slate-400" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  <div className="pt-6 border-t dark:border-slate-800 text-center">
                    <div className="h-44 w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] overflow-hidden mb-4 flex items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-700">
                      {isProcessing ? <Loader2 className="animate-spin text-indigo-600"/> : form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" alt="IA" /> : <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Imagen</p>}
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 uppercase cursor-pointer active:scale-95 transition shadow-lg"><Camera size={16}/> GALERÍA<input type="file" className="hidden" accept="image/*" onChange={async (e) => { const file = e.target.files[0]; if(!file) return; setIsProcessing(true); const name = `${Date.now()}_${file.name}`; await supabase.storage.from('event-images').upload(name, file); const { data } = supabase.storage.from('event-images').getPublicUrl(name); setForm({ ...form, image_url: data.publicUrl }); setIsProcessing(false); }} /></label>
                      <button type="button" onClick={generateIA} className="flex-1 bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 p-4 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition shadow-sm"><Sparkles size={16}/> IA</button>
                    </div>
                  </div>
                  <button type="submit" disabled={isProcessing || !form.image_url} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl uppercase active:scale-95 transition mt-4 tracking-widest text-sm">PUBLICAR AHORA</button>
                </form>
              </div>
            </div>
          )}

          {/* VISTA FAVORITOS: RECTA Y PROFESIONAL */}
          {view === 'favorites' && (
            <div className="max-w-2xl mx-auto p-6 pb-52 text-left">
               <h3 className="text-3xl font-black uppercase tracking-tighter text-indigo-600 mb-12 text-center">
                  Eventos Guardados
               </h3>
               <div className="grid grid-cols-1 gap-4">
                  {events.filter(e => favorites.includes(String(e.id))).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex justify-between items-center shadow-md animate-in fade-in">
                       <span className="font-black text-lg px-4 truncate uppercase tracking-tighter">{ev.title}</span>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={28} /></button>
                    </div>
                  ))}
               </div>
               {favorites.length === 0 && <p className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest opacity-40">Vacío</p>}
            </div>
          )}

          {/* OTRAS VISTAS (ADMIN, PERFIL, MAPA) MANTENIDAS IGUAL... */}
          {view === 'admin' && ( <div className="max-w-2xl mx-auto p-6 pb-52 animate-in slide-in-from-top text-left"> <h2 className="text-3xl font-black mb-8 text-amber-500 italic text-center uppercase tracking-tighter">Moderación 🛡️</h2> {events.filter(e => e.status === 'pending').map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] mb-8 border-2 border-amber-500/20 shadow-xl overflow-hidden flex flex-col"> <img src={ev.image_url} className="h-52 w-full object-cover" alt="p"/> <div className="p-8 text-center"> <h4 className="font-black text-xl mb-4">{ev.title}</h4> <div className="flex gap-4"> <button onClick={async () => { await supabase.from('events').update({ status: 'approved' }).eq('id', ev.id); fetchEvents(); showNotification("Aprobado!"); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Aprobar</button> <button onClick={async () => { await supabase.from('events').update({ status: 'rejected' }).eq('id', ev.id).then(() => fetchEvents()); showNotification("Rechazado"); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs opacity-60">Rechazar</button> </div> </div> </div> ))} </div> )}
          {view === 'profile' && ( <div className="max-w-xl mx-auto p-10 text-center animate-in slide-in-from-bottom duration-500"> <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 shadow-2xl border dark:border-slate-800"> <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-8 flex items-center justify-center text-4xl font-black text-white shadow-xl border-4 border-white dark:border-slate-800"> {user?.email[0].toUpperCase()} </div> <h2 className="text-2xl font-black mb-10 tracking-tighter italic uppercase text-indigo-500 tracking-widest">Mi Perfil</h2> <p className="mb-10 font-bold text-slate-400 tracking-wider text-sm">{user?.email}</p> <div className="space-y-4"> <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-500 text-white p-5 rounded-3xl font-black uppercase tracking-widest shadow-lg shadow-red-500/20"> Cerrar Sesión </button> </div> </div> </div> )}
          {view === 'map' && ( <div className="absolute inset-0 z-0 bg-white"> <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"> <MapResizer /><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" /> {events.filter(e => e.status === 'approved').map(ev => ev.lat && (<Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><div className="p-1 font-bold">{ev.title}</div></Popup></Marker>))} </MapContainer> </div> )}
        </main>

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-3 transition-all ${view === 'home' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className={`p-3 transition-all ${view === 'create' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><PlusCircle size={32}/></button>
          <button onClick={() => setView('favorites')} className={`p-3 transition-all ${view === 'favorites' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={26}/></button>
          <button onClick={() => setView('map')} className={`p-3 transition-all ${view === 'map' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><MapIcon size={26}/></button>
        </div>

        {/* MODAL DETALLES ALARGADO VERTICAL */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 backdrop-blur-xl animate-in fade-in duration-300 text-left">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[380px] h-[85vh] rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[10px] border-b-indigo-600 flex flex-col">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 text-white rounded-full active:scale-90 transition shadow-xl"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="w-full h-64 object-cover shadow-inner shrink-0" alt="hero" />
              <div className="p-8 flex flex-col flex-1 overflow-y-auto">
                <div className="text-indigo-600 text-[9px] font-black tracking-[0.2em] mb-2 uppercase">{selectedEvent.category}</div>
                <h2 className="text-3xl font-black mb-8 leading-tight tracking-tighter text-slate-900 dark:text-white uppercase">{selectedEvent.title}</h2>
                <button onClick={handleImGoing} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-indigo-500/40 active:scale-95 transition mb-8 uppercase tracking-tight flex items-center justify-center gap-2"> ¡VOY A IR! <Heart size={20} fill={favorites.includes(String(selectedEvent.id)) ? "white" : "none"} /> </button>
                <div className="space-y-6 text-slate-600 dark:text-slate-300 font-black">
                   <div className="flex items-start gap-4 p-2 -ml-2 rounded-xl active:bg-slate-50 transition active:scale-95"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><MapPin size={22} /></div><div className="flex-1 overflow-hidden"><p className="text-md underline decoration-indigo-500/30">{selectedEvent.address}</p><p className="text-[10px] opacity-60 uppercase font-black">{selectedEvent.city}</p></div></div>
                   <div className="flex items-center gap-4 px-2 -ml-2"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Calendar size={22} /></div><div className="flex-1 font-black text-md tracking-tight">{selectedEvent.date}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
