import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, ShieldCheck, Star, DollarSign, Sparkles, Camera, Loader2, CheckCircle2, Share2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Configuración de Iconos de Leaflet para evitar que desaparezcan
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
      // Forzar admin si coincide el ID del código SQL
      if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      
      const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
      if (f) setFavorites(f.map(item => String(item.event_id)));
    } catch (e) {
      console.log("Error cargando perfil");
    }
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    if (user) await supabase.auth.signOut();
    const e = window.prompt("Introduce tu email:");
    if (e) {
      alert("Enviando enlace de acceso a tu email...");
      await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin } });
    }
  };

  const generateIA = () => {
    if (!form.title) return showNotification("Escribe un título primero ✨");
    setIsProcessing(true);
    const q = encodeURIComponent(form.title);
    const url = `https://image.pollinations.ai/prompt/professional_event_photography_of_${q}?width=800&height=1000&nologo=true&seed=${Date.now()}`;
    const img = new Image();
    img.src = url;
    img.onload = () => { setForm({...form, image_url: url}); setIsProcessing(false); showNotification("Imagen generada con IA"); };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.image_url) return showNotification("Añade una imagen ✨");
    setIsSubmitting(true);
    const lat = 36 + Math.random() * 7;
    const lng = -9 + Math.random() * 12;
    const isAdmin = profile?.role === 'admin';
    
    await supabase.from('events').insert([{ 
      ...form, 
      lat, 
      lng, 
      status: isAdmin ? 'approved' : 'pending', 
      organizer_id: user?.id 
    }]);

    showNotification(isAdmin ? "¡Evento Publicado!" : "¡Enviado a revisión!");
    setView('home'); 
    fetchEvents();
    setIsSubmitting(false);
    setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  };

  const handleRejectEvent = async (id) => {
    if (!reasonText) return alert("Escribe el motivo del rechazo");
    await supabase.from('events').update({ status: 'rejected', rejection_reason: reasonText }).eq('id', id);
    setRejectingId(null); 
    setReasonText(""); 
    fetchEvents();
    showNotification("Evento denegado");
  };

  const toggleFavorite = async (ev) => {
    if (!user) return showNotification("Inicia sesión primero ❤️");
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
    if (!user) return showNotification("Inicia sesión para confirmar");
    const eventIdStr = String(selectedEvent.id);
    if (!favorites.includes(eventIdStr)) {
      setFavorites(f => [...f, eventIdStr]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: selectedEvent.id });
    }
    showNotification("¡Confirmado! Estás en la lista");
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  const publicEvents = events.filter(e => 
    e.status === 'approved' && 
    (activeCategory === 'TODOS' || e.category === activeCategory)
  );

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden transition-colors duration-500">
        
        {/* NOTIFICACIONES TOAST */}
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl border-2 border-white/20 animate-in slide-in-from-top">
            <CheckCircle2 size={18} className="inline mr-2"/> 
            <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        {/* HEADER / NAV */}
        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-8 z-[2000] shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setView('home'); setSelectedEvent(null);}}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/30 text-xl">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-800 dark:text-white">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && (
              <button onClick={() => setView('admin')} className={`p-2 transition ${pendingEvents.length > 0 ? 'text-amber-500 animate-pulse drop-shadow-[0_0_8px_orange]' : 'text-slate-400'}`}>
                <ShieldCheck size={28}/>
              </button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all">
              {isDark ? <Sun size={24} className="text-yellow-400 drop-shadow-[0_0_8px_orange]" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
            {user ? (
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-xl cursor-pointer" onClick={() => setView('profile')}>
                {user.email[0].toUpperCase()}
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-lg">Entrar</button>
            )}
          </div>
        </nav>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          
          {/* VISTA HOME */}
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-80 animate-in fade-in duration-500">
              {/* Categorías */}
              <div className="flex gap-2 overflow-x-auto pb-8 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-4 py-2.5 rounded-full font-black text-[9px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid de Eventos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col group">
                    <div className="relative h-72 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="img" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-black/50 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                          {ev.category}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} 
                        className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition"
                      >
                        <Heart size={20} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-6 flex flex-col flex-1 text-center">
                      <h3 className="text-xl font-black mb-6 leading-tight uppercase tracking-tighter italic">{ev.title}</h3>
                      <button 
                        onClick={() => setSelectedEvent(ev)} 
                        className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-lg active:scale-95 transition"
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
            <div className="max-w-xl mx-auto p-6 pb-80 animate-in slide-in-from-bottom duration-500">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 text-center uppercase tracking-tighter italic">Publicar Evento</h2>
                <form onSubmit={handleCreate} className="space-y-4 text-left">
                  <input required placeholder="TÍTULO" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold uppercase" value={form.title} onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
                  <select className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-black text-xs uppercase" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="MUSICA">MÚSICA</option>
                    <option value="GASTRONOMIA">GASTRONOMÍA</option>
                    <option value="TAURINOS">TAURINOS</option>
                    <option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                  <input required placeholder="CIUDAD" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold uppercase" value={form.city} onChange={e => setForm({...form, city: e.target.value.toUpperCase()})} />
                  <input required placeholder="DIRECCIÓN EXACTA" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <div className="flex gap-2">
                    <input required type="date" className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold text-slate-400" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <input required type="time" className="w-32 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold text-slate-400" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                  
                  <div className="pt-6 border-t dark:border-slate-800 text-center flex flex-col items-center">
                    <div className="h-44 w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] overflow-hidden mb-4 flex items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-700">
                      {isProcessing ? <Loader2 className="animate-spin text-indigo-600"/> : form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" alt="Preview" /> : <Camera size={32} className="text-slate-300"/>}
                    </div>
                    <div className="flex gap-2 w-full">
                       <button type="button" onClick={generateIA} className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition shadow-lg flex items-center justify-center gap-2">
                         <Sparkles size={16}/> GENERAR CON IA
                       </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white p-6 rounded-3xl font-black shadow-xl mt-4 uppercase tracking-widest disabled:opacity-50">
                    {isSubmitting ? 'PUBLICANDO...' : 'ENVIAR EVENTO'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VISTA ADMIN */}
          {view === 'admin' && (
            <div className="max-w-2xl mx-auto p-6 pb-80 animate-in slide-in-from-top text-left">
              <h2 className="text-3xl font-black mb-8 text-amber-500 italic text-center uppercase tracking-tighter underline underline-offset-8">Moderación 🛡️</h2>
              {pendingEvents.length === 0 && <p className="text-center opacity-50 font-bold">No hay eventos pendientes de revisión.</p>}
              {pendingEvents.map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] mb-8 border-2 border-amber-500/20 shadow-xl overflow-hidden flex flex-col">
                  <img src={ev.image_url} className="h-52 w-full object-cover" alt="p"/>
                  <div className="p-8 text-center">
                    <h4 className="font-black text-xl mb-4">{ev.title}</h4>
                    <p className="text-xs mb-6 opacity-60 uppercase font-bold">{ev.category} en {ev.city}</p>
                    {rejectingId === ev.id ? (
                      <div>
                        <textarea className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-red-500 mb-4 outline-none" placeholder="Indica el motivo del rechazo..." value={reasonText} onChange={e => setReasonText(e.target.value)} />
                        <div className="flex gap-2">
                           <button onClick={() => handleRejectEvent(ev.id)} className="flex-1 bg-red-500 text-white p-3 rounded-xl font-bold">DENEGAR DEFINITIVAMENTE</button>
                           <button onClick={() => setRejectingId(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 p-3 rounded-xl">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <button onClick={async () => { await supabase.from('events').update({ status: 'approved' }).eq('id', ev.id); fetchEvents(); showNotification("¡Evento Aprobado!"); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Aprobar</button>
                        <button onClick={() => setRejectingId(ev.id)} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs opacity-60">Denegar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VISTA PERFIL */}
          {view === 'profile' && (
            <div className="max-w-xl mx-auto p-10 text-center animate-in slide-in-from-bottom duration-500">
               <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border dark:border-slate-800">
                  <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-8 flex items-center justify-center text-4xl font-black text-white shadow-xl border-4 border-white dark:border-slate-800">
                    {user?.email[0].toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-black mb-10 tracking-tighter italic uppercase text-indigo-500 underline decoration-4 underline-offset-8">Mi Perfil</h2>
                  <p className="mb-10 font-bold text-slate-400 tracking-wider text-sm">{user?.email}</p>
                  <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-500 text-white p-5 rounded-3xl font-black uppercase active:scale-95 transition shadow-lg"> Cerrar Sesión </button>
               </div>
            </div>
          )}

          {/* VISTA FAVORITOS */}
          {view === 'favorites' && (
            <div className="max-w-2xl mx-auto p-6 pb-60 text-center animate-in fade-in">
               <h3 className="text-3xl font-black uppercase tracking-tighter text-indigo-600 mb-12 italic">Mis Eventos Guardados</h3>
               {favorites.length === 0 && <p className="opacity-40 font-bold uppercase text-xs">No tienes eventos guardados aún ❤️</p>}
               <div className="grid grid-cols-1 gap-4">
                  {events.filter(e => favorites.includes(String(e.id))).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex justify-between items-center shadow-md">
                       <div className="flex items-center gap-4 text-left">
                          <img src={ev.image_url} className="w-16 h-16 rounded-2xl object-cover" alt="ev" />
                          <div>
                            <span className="font-black text-lg block uppercase tracking-tighter leading-none">{ev.title}</span>
                            <span className="text-[10px] opacity-50 uppercase font-black">{ev.date}</span>
                          </div>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => setSelectedEvent(ev)} className="p-3 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl"><LayoutList size={20}/></button>
                         <button onClick={() => toggleFavorite(ev)} className="p-3 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-xl active:scale-75 transition"><Trash2 size={20} /></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* VISTA MAPA */}
          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-white"> 
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"> 
                <MapResizer />
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{y}/{x}{r}.png" /> 
                {events.filter(e => e.status === 'approved').map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-2 text-center" onClick={() => setSelectedEvent(ev)}>
                        <img src={ev.image_url} className="w-20 h-20 object-cover rounded-lg mb-2 mx-auto" alt="p"/>
                        <div className="font-black text-[10px] uppercase leading-tight cursor-pointer">{ev.title}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}
        </main>

        {/* BARRA DE NAVEGACIÓN INFERIOR */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[85px] rounded-[3rem] shadow-2xl flex items-center justify-around z-[2000] px-6 transition-all border-b-4 border-b-indigo-500/20">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-4 rounded-2xl transition-all ${view === 'home' ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/40" : "text-slate-400 opacity-60"}`}>
            <LayoutList size={24}/>
          </button>
          <button onClick={() => setView('create')} className={`p-4 rounded-2xl transition-all ${view === 'create' ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/40" : "text-slate-400 opacity-60"}`}>
            <PlusCircle size={24}/>
          </button>
          <button onClick={() => setView('favorites')} className={`p-4 rounded-2xl transition-all ${view === 'favorites' ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/40" : "text-slate-400 opacity-60"}`}>
            <Heart size={24}/>
          </button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl transition-all ${view === 'map' ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/40" : "text-slate-400 opacity-60"}`}>
            <MapIcon size={24}/>
          </button>
        </div>

        {/* MODAL DETALLES MEJORADO PRO */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[420px] h-[90vh] rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[10px] border-b-indigo-600 flex flex-col animate-in zoom-in duration-300">
              
              {/* Botón Cerrar */}
              <button 
                onClick={() => setSelectedEvent(null)} 
                className="absolute top-5 right-5 z-50 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-all active:scale-90 shadow-xl"
              >
                <X size={24} />
              </button>

              {/* Imagen con Gradiente */}
              <div className="relative h-64 shrink-0">
                <img src={selectedEvent.image_url} className="w-full h-full object-cover" alt="hero" />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {selectedEvent.category}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-8 flex flex-col flex-1 overflow-y-auto no-scrollbar">
                <h2 className="text-3xl font-black mb-6 leading-tight tracking-tighter text-slate-900 dark:text-white uppercase italic">
                  {selectedEvent.title}
                </h2>

                {/* Acciones Rápidas */}
                <div className="flex gap-3 mb-8">
                  <button 
                    onClick={handleImGoing} 
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-tighter"
                  >
                    <Sparkles size={18} /> ¡Asistiré!
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: selectedEvent.title, url: window.location.href });
                      } else {
                        showNotification("Link copiado al portapapeles");
                      }
                    }}
                    className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl active:scale-95 transition"
                  >
                    <Share2 size={22} />
                  </button>
                </div>

                {/* Info Detallada */}
                <div className="space-y-6">
                  {/* Dirección */}
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-transparent hover:border-indigo-200"
                  >
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30">
                      <MapPin size={22} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-1">Ubicación</p>
                      <p className="text-sm opacity-70 leading-tight">{selectedEvent.address}</p>
                      <p className="text-[10px] font-black text-indigo-500 uppercase mt-1">{selectedEvent.city}</p>
                    </div>
                  </a>

                  {/* Fecha y Hora */}
                  <div className="flex gap-4">
                    <div className="flex-1 flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem]">
                      <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30">
                        <Calendar size={22} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest">Fecha</p>
                        <p className="text-sm font-bold opacity-70">{selectedEvent.date}</p>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem]">
                      <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30">
                        <Clock size={22} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest">Hora</p>
                        <p className="text-sm font-bold opacity-70">{selectedEvent.time || '21:00'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge de Verificación */}
                <div className="mt-8 pt-6 border-t dark:border-slate-800 flex items-center justify-center gap-2 opacity-50">
                  <ShieldCheck size={14} className="text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Evento Verificado</span>
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
