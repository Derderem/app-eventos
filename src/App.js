import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2, Upload
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Iconos Leaflet
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
  const [iaOptions, setIaOptions] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

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
    } catch (e) { console.log("Error perfil"); }
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

  // GENERAR OPCIONES IA MEJORADO
  const generateIAOptions = () => {
    if (!form.title) return showNotification("Pon un título primero ✨");
    setIsProcessing(true);
    setIaOptions([]);
    
    const q = encodeURIComponent(form.title + " professional event photography");
    const seed1 = Math.floor(Math.random() * 10000);
    const seed2 = Math.floor(Math.random() * 10000);
    
    // Usamos el endpoint más estable de Pollinations
    const opt1 = `https://image.pollinations.ai/prompt/${q}?width=800&height=1000&seed=${seed1}&nologo=true`;
    const opt2 = `https://image.pollinations.ai/prompt/${q}?width=800&height=1000&seed=${seed2}&nologo=true`;

    // Simular carga para asegurar que la IA procese la petición
    setTimeout(() => {
      setIaOptions([opt1, opt2]);
      setIsProcessing(false);
      showNotification("2 opciones listas ✨");
    }, 2000);
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
      setForm({ ...form, image_url: data.publicUrl });
      setIaOptions([]);
      showNotification("¡Foto subida!");
    } catch (err) { alert("Error al subir. Revisa las Policies en Supabase."); }
    finally { setIsProcessing(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.image_url) return showNotification("Falta foto ✨");
    setIsSubmitting(true);

    try {
      // BUSCAR COORDENADAS REALES EN ESPAÑA
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address + ', ' + form.city + ', España')}&limit=1`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      let lat = 40.4167; // Madrid por defecto si falla
      let lng = -3.7037;

      if (data && data.length > 0) {
        lat = parseFloat(data[0].lat);
        lng = parseFloat(data[0].lon);
      }

      await supabase.from('events').insert([{ 
        ...form, 
        lat, 
        lng, 
        status: profile?.role === 'admin' ? 'approved' : 'pending', 
        organizer_id: user?.id 
      }]);

      showNotification("¡Evento enviado!");
      setView('home'); 
      fetchEvents(); 
      setIsSubmitting(false);
      setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
      setIaOptions([]);
    } catch (err) {
      alert("Error al guardar el evento");
      setIsSubmitting(false);
    }
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
    showNotification("¡Te hemos apuntado!");
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  const publicEvents = events.filter(e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory));

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white font-sans overflow-hidden">
        
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-in slide-in-from-top">
            <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        <nav className="h-[60px] shrink-0 bg-white dark:bg-[#0f172a] border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white font-bold text-lg italic">E</div>
            <h1 className="text-lg font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-3">
            {profile?.role === 'admin' && <button onClick={() => setView('admin')} className="text-amber-500"><ShieldCheck size={24}/></button>}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xs cursor-pointer" onClick={() => setView('profile')}>{user.email[0].toUpperCase()}</div> : <button onClick={handleLogin} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase">Entrar</button>}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in fade-in">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-900/40 text-slate-500 border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="space-y-6">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col transition-all active:scale-[0.98]">
                    <div className="relative h-60 overflow-hidden">
                      <img src={ev.image_url} className="w-full h-full object-cover" alt="img" />
                      <div className="absolute top-4 left-4"><span className="bg-black/50 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{ev.category}</span></div>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-3 bg-slate-900/60 backdrop-blur-md rounded-full text-red-500"><Heart size={18} fill={favorites.includes(String(ev.id)) ? "red" : "none"} /></button>
                    </div>
                    <div className="p-6 text-center">
                      <h3 className="text-lg font-black leading-tight uppercase tracking-tighter italic text-white mb-4 line-clamp-1">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-4 pb-60 animate-in slide-in-from-bottom">
              <div className="bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-800">
                <h2 className="text-xl font-black mb-6 text-indigo-500 text-center uppercase italic">Publicar</h2>
                <form onSubmit={handleCreate} className="space-y-3 text-left">
                  <input required placeholder="TÍTULO DEL EVENTO" className="w-full p-4 bg-slate-800 rounded-2xl outline-none font-bold uppercase text-xs" value={form.title} onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
                  <select className="w-full p-4 bg-slate-800 rounded-2xl outline-none font-black text-[10px] uppercase" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option></select>
                  <div className="grid grid-cols-2 gap-2">
                    <input required placeholder="CIUDAD" className="w-full p-4 bg-slate-800 rounded-2xl outline-none font-bold uppercase text-[10px]" value={form.city} onChange={e => setForm({...form, city: e.target.value.toUpperCase()})} />
                    <input required placeholder="DIRECCIÓN" className="w-full p-4 bg-slate-800 rounded-2xl outline-none font-bold text-[10px]" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <input required type="date" className="flex-1 p-4 bg-slate-800 rounded-2xl text-[10px] font-bold text-white outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <input required type="time" className="w-24 p-4 bg-slate-800 rounded-2xl text-[10px] font-bold text-white outline-none" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>

                  <div className="pt-2 space-y-3 text-center">
                    <div className="h-40 w-full bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-700">
                      {isProcessing ? <Loader2 className="animate-spin text-indigo-600"/> : form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" alt="p" /> : <div className="text-center opacity-20"><Camera size={24} className="mx-auto mb-1"/><p className="text-[7px] font-black uppercase">Falta Foto</p></div>}
                    </div>

                    {/* Selector de IA */}
                    {iaOptions.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {iaOptions.map((url, idx) => (
                          <div key={idx} onClick={() => setForm({...form, image_url: url})} className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${form.image_url === url ? 'border-indigo-600 scale-95' : 'border-transparent opacity-60'}`}>
                            <img src={url} className="w-full h-20 object-cover bg-slate-700" alt="ia" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 font-black text-[7px] text-white">OPCIÓN {idx+1}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button type="button" onClick={generateIAOptions} className="flex-1 bg-indigo-600 text-white p-3.5 rounded-xl font-black text-[8px] uppercase flex items-center justify-center gap-1"><Sparkles size={14}/> 2 OPCIONES IA</button>
                      <label className="flex-1 bg-slate-700 text-white p-3.5 rounded-xl font-black text-[8px] uppercase flex items-center justify-center gap-1 cursor-pointer"><Upload size={14}/> GALERÍA<input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} /></label>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting || isProcessing} className="w-full bg-white text-slate-900 p-4 rounded-2xl font-black shadow-xl mt-2 uppercase text-[10px] tracking-widest">{isSubmitting ? '...' : 'PUBLICAR'}</button>
                </form>
              </div>
            </div>
          )}

          {view === 'admin' && (
            <div className="max-w-xl mx-auto p-6 pb-60 text-center animate-in slide-in-from-top">
              <h2 className="text-xl font-black mb-8 text-amber-500 uppercase italic">Moderación</h2>
              {pendingEvents.length === 0 && <p className="text-[10px] opacity-40 uppercase font-black">Nada pendiente</p>}
              {pendingEvents.map(ev => (
                <div key={ev.id} className="bg-[#0f172a] rounded-[2rem] mb-6 border border-slate-800 overflow-hidden text-center">
                  <img src={ev.image_url} className="h-40 w-full object-cover" alt="p"/>
                  <div className="p-6">
                    <h4 className="font-black text-lg mb-4 text-white uppercase italic">{ev.title}</h4>
                    <div className="flex gap-4">
                        <button onClick={async () => { await supabase.from('events').update({ status: 'approved' }).eq('id', ev.id); fetchEvents(); showNotification("Aprobado!"); }} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-black text-[9px]">APROBAR</button>
                        <button onClick={() => setRejectingId(ev.id)} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black text-[9px] opacity-60">DENEGAR</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-xl mx-auto p-10 text-center">
               <div className="bg-[#0f172a] rounded-[3rem] p-10 border border-slate-800 shadow-2xl">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-black text-white">{user?.email[0].toUpperCase()}</div>
                  <p className="mb-8 font-black text-slate-400 text-[10px] uppercase truncate">{user?.email}</p>
                  <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-600 text-white p-4 rounded-xl font-black uppercase text-[10px]"> Cerrar Sesión </button>
               </div>
            </div>
          )}

          {view === 'favorites' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in fade-in">
               <h3 className="text-2xl font-black uppercase tracking-tighter text-indigo-600 mb-8 text-center italic">Guardados ❤️</h3>
               <div className="space-y-4">
                  {events.filter(e => favorites.includes(String(e.id))).map(ev => (
                    <div key={ev.id} className="bg-[#0f172a] p-4 rounded-[1.5rem] border border-slate-800 flex justify-between items-center shadow-lg">
                       <div className="flex items-center gap-4">
                          <img src={ev.image_url} className="w-14 h-14 rounded-xl object-cover" alt="ev" />
                          <span className="font-black text-sm text-white uppercase truncate w-32">{ev.title}</span>
                       </div>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-red-500"><Trash2 size={20} /></button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {view === 'map' && ( 
            <div className="absolute inset-0 z-0"> 
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"> 
                <MapResizer /><TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{y}/{x}{r}.png" /> 
                {events.filter(e => e.status === 'approved').map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><div className="p-2 text-center" onClick={() => setSelectedEvent(ev)}><div className="font-black text-[8px] uppercase">{ev.title}</div><p className="text-[6px] opacity-50">{ev.city}</p></div></Popup></Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}
        </main>

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[75px] rounded-[2rem] shadow-2xl flex items-center justify-around z-[2000] px-4">
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} className={`p-3 rounded-xl transition-all ${view === 'home' ? "bg-indigo-600 text-white" : "text-slate-500"}`}><LayoutList size={22}/></button>
          <button onClick={() => setView('create')} className={`p-3 rounded-xl transition-all ${view === 'create' ? "bg-indigo-600 text-white" : "text-slate-500"}`}><PlusCircle size={22}/></button>
          <button onClick={() => setView('favorites')} className={`p-3 rounded-xl transition-all ${view === 'favorites' ? "bg-indigo-600 text-white" : "text-slate-500"}`}><Heart size={22}/></button>
          <button onClick={() => setView('map')} className={`p-3 rounded-xl transition-all ${view === 'map' ? "bg-indigo-600 text-white" : "text-slate-500"}`}><MapIcon size={22}/></button>
        </div>

        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in">
            <div className="bg-[#0f172a] w-full max-w-[380px] h-[85vh] rounded-[3rem] overflow-hidden relative border border-slate-800 border-b-8 border-indigo-600 flex flex-col shadow-2xl">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-3 bg-white/10 rounded-full text-white active:scale-90 transition"><X size={20} /></button>
              <div className="relative h-52 shrink-0">
                <img src={selectedEvent.image_url} className="w-full h-full object-cover" alt="hero" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent" />
                <div className="absolute bottom-4 left-6"><span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">{selectedEvent.category}</span></div>
              </div>
              <div className="p-8 flex flex-col flex-1 overflow-y-auto no-scrollbar text-center">
                <h2 className="text-2xl font-black mb-6 leading-tight text-white uppercase italic">{selectedEvent.title}</h2>
                <button onClick={handleImGoing} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-xs shadow-xl flex items-center justify-center gap-2 uppercase italic mb-8 active:scale-95 transition"><Sparkles size={14} /> ¡VOY A IR!</button>
                <div className="space-y-4 text-left">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-slate-800 rounded-2xl border border-slate-800 transition active:scale-95">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg"><MapPin size={20} /></div>
                    <div className="overflow-hidden"><p className="text-[9px] font-black text-white uppercase mb-1">{selectedEvent.address}</p><p className="text-[8px] font-black text-indigo-500 uppercase">{selectedEvent.city}</p></div>
                  </a>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-3 p-4 bg-slate-800 rounded-2xl border border-slate-800 text-white text-[9px] font-black">
                      <Calendar size={18} className="text-amber-500" /> {selectedEvent.date}
                    </div>
                    <div className="flex-1 flex items-center gap-3 p-4 bg-slate-800 rounded-2xl border border-slate-800 text-white text-[9px] font-black">
                      <Clock size={18} className="text-emerald-500" /> {selectedEvent.time || '21:00'}
                    </div>
                  </div>
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
