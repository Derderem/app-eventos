{/* MAPA */}
  {view === 'map' && (
    <div style={{ 
      position: 'fixed', 
      top: -50, 
      left: -50, 
      width: 'calc(100vw + 100px)', 
      height: 'calc(100vh + 100px)', 
      zIndex: 1,
      background: '#aad3df'
    }}>
      <MapContainer 
        center={[40.4167, -3.7037]} 
        zoom={6} 
        style={{ width: '100%', height: '100%' }}
        zoomSnap={1}
      >
        <SpainMapController />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {publicEvents.map(ev => ev.lat && ev.lng && (
          <Marker key={ev.id} position={[ev.lat, ev.lng]}>
            <Popup>{ev.title}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )}

  {/* CONTENEDOR PRINCIPAL */}
  <div 
    style={{ 
      position: 'relative', 
      zIndex: 10, 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: view === 'map' ? 'transparent' : '#020617',
      pointerEvents: view === 'map' ? 'none' : 'auto'
    }}
  >
    
    {/* NAVBAR */}
    <nav style={{ 
      height: 70, 
      flexShrink: 0, 
      background: 'rgba(15, 23, 42, 0.8)', 
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgb(30, 41, 59)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 32px',
      zIndex: 2000,
      pointerEvents: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setView('home')}><LogoSVG /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {profile?.role === 'admin' && (
          <ShieldCheck 
            size={28} 
            className={pendingCount > 0 ? 'pulse-admin' : ''} 
            style={{ cursor: 'pointer', color: pendingCount > 0 ? undefined : '#818cf8' }}
            onClick={() => setView('admin')}
          />
        )}
        <button onClick={() => setIsDark(!isDark)} style={{ padding: 8, background: 'rgba(51, 65, 85, 0.5)', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
           {isDark ? <Sun size={24} style={{ color: '#facc15' }} /> : <Moon size={24} style={{ color: '#4f46e5' }} />}
        </button>
        <div 
          onClick={() => setView('profile')}
          style={{ 
            width: 40, height: 40, background: '#4f46e5', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontWeight: 900, border: '2px solid white', cursor: 'pointer',
            textTransform: 'uppercase', color: 'white'
          }}
        >
          {user ? user.email[0] : '?'}
        </div>
      </div>
    </nav>

    {/* CONTENIDO */}
    <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {view === 'home' && (
        <div className="no-scrollbar" style={{ maxWidth: 576, margin: '0 auto', padding: 16, height: '100%', overflowY: 'auto', paddingBottom: 160 }}>
          {publicEvents.map(ev => (
            <div key={ev.id} style={{ background: '#0f172a', borderRadius: 40, overflow: 'hidden', border: '1px solid rgb(30, 41, 59)', marginBottom: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ position: 'relative', height: 208, overflow: 'hidden' }}>
                <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                <button style={{ position: 'absolute', top: 20, right: 20, padding: 12, background: 'white', borderRadius: '50%', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}><Heart size={20} /></button>
              </div>
              <div style={{ padding: 24, textAlign: 'center' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-0.05em', marginBottom: 4, color: 'white' }}>{ev.title}</h3>
                <p style={{ color: '#818cf8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{ev.city}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'profile' && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0f172a', padding: 32, borderRadius: 48, border: '1px solid rgb(30, 41, 59)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: 320 }}>
            <div style={{ width: 80, height: 80, background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, margin: '0 auto 24px', border: '4px solid rgb(30, 41, 59)', color: 'white' }}>{user?.email?.[0].toUpperCase() || '?'}</div>
            
            <div style={{ display: 'grid', gap: 12 }}>
              <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#29abe0', padding: 20, borderRadius: 16, fontWeight: 900, textTransform: 'uppercase', fontSize: 12, color: 'white', textDecoration: 'none' }}>
                <Coffee size={20} /> Apoyar en Ko-fi
              </a>
              <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#003087', padding: 20, borderRadius: 16, fontWeight: 900, textTransform: 'uppercase', fontSize: 12, color: 'white', textDecoration: 'none' }}>
                <CreditCard size={20} /> PayPal.me
              </a>
            </div>

            {user && (
              <button onClick={() => supabase.auth.signOut()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', color: '#ef4444', fontWeight: 900, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em', paddingTop: 24, marginTop: 24, borderTop: '1px solid rgb(30, 41, 59)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <LogOut size={16} /> Cerrar Sesion
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'admin' && (
        <div className="no-scrollbar" style={{ maxWidth: 576, margin: '0 auto', padding: 16, height: '100%', overflowY: 'auto', paddingBottom: 160 }}>
           <h2 style={{ textAlign: 'center', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: '#6366f1', marginBottom: 24 }}>Eventos por Verificar ({pendingCount})</h2>
           {adminEvents.length === 0 && <p style={{ textAlign: 'center', color: 'rgb(100, 116, 139)', marginTop: 80 }}>Todo al dia. No hay pendientes.</p>}
           {adminEvents.map(ev => (
             <div key={ev.id} style={{ background: '#0f172a', padding: 24, borderRadius: 32, border: '1px solid rgb(30, 41, 59)', marginBottom: 16 }}>
                <div style={{ marginBottom: 16 }}>
                   <h3 style={{ fontWeight: 900, textTransform: 'uppercase', color: 'white' }}>{ev.title}</h3>
                   <p style={{ fontSize: 12, color: 'rgb(148, 163, 184)' }}>{ev.city} | {ev.date} | {ev.time}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                   <button onClick={() => updateStatus(ev.id, 'approved')} style={{ flex: 1, background: '#16a34a', padding: 12, borderRadius: 12, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, color: 'white', border: 'none', cursor: 'pointer' }}>Aprobar</button>
                   <button onClick={() => {
                     const reason = window.prompt("Motivo del rechazo:");
                     if(reason) updateStatus(ev.id, 'rejected', reason);
                   }} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: 12, borderRadius: 12, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, border: 'none', cursor: 'pointer' }}>Rechazar</button>
                </div>
             </div>
           ))}
        </div>
      )}

      {view === 'create' && (
        <div className="no-scrollbar" style={{ maxWidth: 448, margin: '0 auto', padding: 24, height: '100%', overflowY: 'auto' }}>
          <div style={{ background: '#0f172a', padding: 32, borderRadius: 40, border: '1px solid rgb(30, 41, 59)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', textAlign: 'center', marginBottom: 24, color: 'white' }}>Nuevo Evento</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              <input name="title" placeholder="TITULO DEL EVENTO" style={{ width: '100%', padding: 20, borderRadius: 12, background: 'rgb(30, 41, 59)', border: '1px solid rgb(51, 65, 85)', textTransform: 'uppercase', fontWeight: 700, color: 'white', outline: 'none' }} value={form.title} onChange={handleInputChange} />
              <input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 20, borderRadius: 12, background: 'rgb(30, 41, 59)', border: '1px solid rgb(51, 65, 85)', textTransform: 'uppercase', fontWeight: 700, color: 'white', outline: 'none' }} value={form.city} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 <div>
                    <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: 'rgb(100, 116, 139)', marginLeft: 8, marginBottom: 4, display: 'block' }}>Fecha</label>
                    <input name="date" type="date" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgb(30, 41, 59)', border: '1px solid rgb(51, 65, 85)', color: 'white' }} value={form.date} onChange={handleInputChange} />
                 </div>
                 <div>
                    <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: 'rgb(100, 116, 139)', marginLeft: 8, marginBottom: 4, display: 'block' }}>Hora (24h)</label>
                    <input name="time" type="time" style={{ width: '100%', padding: 16, borderRadius: 12, background: 'rgb(30, 41, 59)', border: '1px solid rgb(51, 65, 85)', color: 'white' }} value={form.time} onChange={handleInputChange} />
                 </div>
              </div>
              <button style={{ width: '100%', background: '#4f46e5', padding: 20, borderRadius: 12, fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)', color: 'white', border: 'none', cursor: 'pointer' }}>Enviar para revision</button>
            </div>
          </div>
        </div>
      )}
    </main>

    {/* BOTTOM NAV */}
    <nav style={{ 
      position: 'fixed', 
      bottom: 24, 
      left: '50%', 
      transform: 'translateX(-50%)', 
      width: '92%', 
      maxWidth: 420, 
      background: 'rgba(15, 23, 42, 0.95)', 
      backdropFilter: 'blur(24px)',
      border: '1px solid rgb(30, 41, 59)',
      height: 80,
      borderRadius: 40,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 2000,
      padding: '0 16px',
      pointerEvents: 'auto'
    }}>
      <button onClick={() => setView('home')} style={{ padding: 16, borderRadius: 16, border: 'none', cursor: 'pointer', background: view === 'home' ? '#2563eb' : 'transparent', color: view === 'home' ? 'white' : 'rgb(100, 116, 139)', boxShadow: view === 'home' ? '0 10px 15px -3px rgba(59, 130, 246, 0.5)' : 'none' }}><LayoutList size={26}/></button>
      <button onClick={() => setView('create')} style={{ padding: 16, borderRadius: 16, border: 'none', cursor: 'pointer', background: view === 'create' ? '#2563eb' : 'transparent', color: view === 'create' ? 'white' : 'rgb(100, 116, 139)', boxShadow: view === 'create' ? '0 10px 15px -3px rgba(59, 130, 246, 0.5)' : 'none' }}><PlusCircle size={26}/></button>
      <button onClick={() => setView('map')} style={{ padding: 16, borderRadius: 16, border: 'none', cursor: 'pointer', background: view === 'map' ? '#2563eb' : 'transparent', color: view === 'map' ? 'white' : 'rgb(100, 116, 139)', boxShadow: view === 'map' ? '0 10px 15px -3px rgba(59, 130, 246, 0.5)' : 'none' }}><MapIcon size={26}/></button>
    </nav>
  </div>
</div>
