import { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getGuitarsForMap, updateGuitar } from '../api/client';
import { MapPin, Navigation, Search, Maximize2, Minimize2, Layers, Dot, X, CheckCircle } from 'lucide-react';
import CollectionBubble from '../components/CollectionBubble';
import styles from './MapView.module.css';

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 15, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [positions, map]);
  return null;
}

function MapInvalidator({ fullscreen }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [fullscreen, map]);
  useEffect(() => {
    if (!window.ResizeObserver) return;
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

const CLUSTER_RADIUS_PX = 30;
const MARKER_COLOR = { collected: '#2d6a4f', pending: '#f4a261', locked: '#7c3aed' };

const WA_DONOR_MSG = encodeURIComponent(
  '😊 תודה רבה על התרומה למיזם אקו! 🎸\nכדי שנתאם את איסוף הגיטרה אשמח שתכתוב כתובת מדויקת וזמן אפשרי לאיסוף.\nתודה!'
);

function toWhatsApp(phone) {
  if (!phone) return null;
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('972')) p = p;
  else if (p.startsWith('0')) p = '972' + p.slice(1);
  else if (p.startsWith('5')) p = '972' + p;
  return `https://wa.me/${p}?text=${WA_DONOR_MSG}`;
}

function WaIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3C8.82 3 3 8.82 3 16c0 2.35.64 4.55 1.76 6.44L3 29l6.74-1.76A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.45 17.6c-.27.76-1.57 1.46-2.16 1.55-.55.08-1.24.12-2-.13-.46-.14-1.05-.34-1.8-.67-3.16-1.36-5.22-4.54-5.38-4.75-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.12-2.66.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.44-.07.68.52.27.63.9 2.2.98 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.16.19-.33.42-.47.56-.16.16-.32.33-.14.65.18.32.82 1.35 1.76 2.19 1.21 1.08 2.23 1.41 2.55 1.57.32.16.5.13.68-.08.19-.21.8-.93 1.01-1.25.21-.32.42-.27.7-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.76-.19 1.52z"/>
    </svg>
  );
}

function makeGroupIcon(count, bg) {
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;box-shadow:0 1px 5px rgba(0,0,0,.35)">${count}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function makeGuitarIcon(highlighted, collected, isNearby = false, count = 1, isLocked = false, isMyCollection = false) {
  const bg = highlighted ? '#4361ee'
    : isMyCollection ? '#0891b2'
    : isLocked ? MARKER_COLOR.locked
    : isNearby ? '#22c55e'
    : (collected ? MARKER_COLOR.collected : MARKER_COLOR.pending);
  const size = highlighted ? 28 : isMyCollection ? 26 : isNearby ? 26 : 22;
  const fontSize = highlighted ? 13 : 11;
  const ring = highlighted ? ',0 0 0 2.5px #4361ee88'
    : isMyCollection ? ',0 0 0 3px #0891b288'
    : isNearby ? ',0 0 0 2.5px #22c55e66'
    : isLocked ? ',0 0 0 2.5px #7c3aed66' : '';
  const badge = count > 1
    ? `<div style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;min-width:14px;height:14px;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);padding:0 2px;">${count}</div>`
    : '';
  const icon = isLocked ? '🔒' : '🎸';
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.3)${ring};display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;line-height:1;user-select:none;">${icon}</div>${badge}
    </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

function makeLocationPin() {
  return L.divIcon({
    html: `<div style="position:relative;display:flex;justify-content:center;width:28px;height:36px;">
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#4361ee" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="5.5" fill="white"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── MapMarkers ────────────────────────────────────────────────────────────────
function MapMarkers({
  visible, highlightedId, nearbyIds, marking, markCollected,
  navigate, viewMode, isVolunteer, selectedIds, onToggleSelect,
  volunteerName, collectionGuitarIds, collectionHighlightIds,
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const clusters = useMemo(() => {
    if (viewMode === 'dots') return null;
    const items = visible.filter(g => g.lat && g.lon);
    const used = new Set();
    const result = [];
    for (let i = 0; i < items.length; i++) {
      if (used.has(i)) continue;
      const g = items[i];
      const cluster = [g];
      used.add(i);
      const p1 = map.latLngToContainerPoint([g.lat, g.lon]);
      for (let j = i + 1; j < items.length; j++) {
        if (used.has(j)) continue;
        const g2 = items[j];
        const p2 = map.latLngToContainerPoint([g2.lat, g2.lon]);
        const dx = p1.x - p2.x, dy = p1.y - p2.y;
        if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_RADIUS_PX) {
          cluster.push(g2);
          used.add(j);
        }
      }
      result.push(cluster);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, zoom, map, viewMode]);

  const guitarPopupItem = (g, showDivider) => {
    // Is this guitar locked by another volunteer?
    const lockedByOther = g.inCollection && g.inCollection !== volunteerName;
    // Is this guitar already in the current volunteer's collection list?
    const inMyCollection = collectionGuitarIds?.has(g.id);

    return (
      <div key={g.id} style={showDivider ? { borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 8 } : {}}>
        <strong>{g.name}</strong>
        <div className={styles.popupSub}>{g.city}{g.street ? `, ${g.street}` : ''}</div>
        <div className={styles.popupMeta}>
          <span>{g.guitarType || 'לא ידוע'}</span>
          <span className={g.collected ? styles.collected : styles.pending}>
            {g.collected ? '✓ נאסף' : lockedByOther ? '🔒 בתהליך איסוף' : 'ממתין'}
          </span>
        </div>
        {g.phone && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
            <a href={`tel:${g.phone}`} className={styles.popupCall}>📞 {g.phone}</a>
            <a href={toWhatsApp(g.phone)} target="_blank" rel="noopener noreferrer" className={styles.popupWa}><WaIcon /></a>
          </div>
        )}
        {!isVolunteer && !g.collected && (
          <button className={styles.popupCollectBtn} onClick={() => markCollected(g.id)} disabled={marking === g.id}>
            {marking === g.id ? '...' : '✓ סמן כנאסף'}
          </button>
        )}
        {!isVolunteer && g.collected && <div className={styles.collected}>✓ נאסף</div>}
        {isVolunteer && !g.collected && (
          lockedByOther ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#7c3aed', fontWeight: 600, marginTop: 6 }}>
              🔒 גיטרה זו בתהליך איסוף
            </div>
          ) : inMyCollection ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 6 }}>
              ✓ ברשימת האיסוף שלך
            </div>
          ) : (
            <button
              className={selectedIds?.has(g.id) ? styles.popupSelectedBtn : styles.popupSelectBtn}
              onClick={() => onToggleSelect?.(g.id)}
            >
              {selectedIds?.has(g.id) ? '✓ נבחרה לאיסוף' : 'בחר לאיסוף'}
            </button>
          )
        )}
        {!isVolunteer && (
          <button className={styles.popupTableBtn} onClick={() => navigate(`/table?field=id&value=${g.id}`)}>
            📋 פתח בטבלה
          </button>
        )}
      </div>
    );
  };

  if (viewMode === 'dots' || isVolunteer) {
    const groups = {};
    visible.filter(g => g.lat && g.lon).forEach(g => {
      const key = `${g.lat},${g.lon}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });
    return Object.entries(groups).map(([key, group]) => {
      const g0 = group[0];
      const isHighlighted = group.some(g => g.id === highlightedId);
      const isNearby = nearbyIds.size > 0 && group.some(g => nearbyIds.has(g.id));
      const isLocked = group.every(g => g.inCollection && g.inCollection !== volunteerName);
      const isMyCollection = !isHighlighted && collectionHighlightIds?.size > 0 && group.some(g => collectionHighlightIds.has(g.id));
      return (
        <Marker
          key={key}
          position={[g0.lat, g0.lon]}
          icon={makeGuitarIcon(isHighlighted, g0.collected, isNearby, group.length, isLocked, isMyCollection)}
          zIndexOffset={isHighlighted ? 1000 : isMyCollection ? 600 : isNearby ? 500 : 0}
        >
          <Popup maxWidth={250}>
            <div className={styles.popup}>
              {group.map((g, i) => guitarPopupItem(g, i > 0))}
            </div>
          </Popup>
        </Marker>
      );
    });
  }

  return clusters.map(group => {
    const g0 = group[0];
    const groupKey = `${g0.lat},${g0.lon}-${group.length}`;
    const isHighlighted = group.some(g => g.id === highlightedId);
    const isNearby = nearbyIds.size > 0 && group.some(g => nearbyIds.has(g.id));
    const isLocked = group.every(g => g.inCollection && g.inCollection !== volunteerName);
    const isMyCollection = !isHighlighted && collectionHighlightIds?.size > 0 && group.some(g => collectionHighlightIds.has(g.id));

    if (group.length === 1) {
      const g = group[0];
      const fillColor = isHighlighted ? '#4361ee' : isMyCollection ? '#0891b2' : isLocked ? MARKER_COLOR.locked : isNearby ? '#22c55e' : (g.collected ? MARKER_COLOR.collected : MARKER_COLOR.pending);
      const radius = isHighlighted ? 14 : isNearby ? 11 : 8;
      return (
        <CircleMarker
          key={groupKey}
          center={[g.lat, g.lon]}
          radius={radius}
          fillColor={fillColor}
          color="#fff" weight={isHighlighted || isNearby ? 3 : 2} fillOpacity={isHighlighted || isNearby ? 1 : 0.85}
        >
          <Popup><div className={styles.popup}>{guitarPopupItem(g, false)}</div></Popup>
        </CircleMarker>
      );
    }

    const allCollected = group.every(g => g.collected);
    const bg = isHighlighted ? '#4361ee' : isMyCollection ? '#0891b2' : isLocked ? MARKER_COLOR.locked : isNearby ? '#22c55e' : (allCollected ? MARKER_COLOR.collected : MARKER_COLOR.pending);
    return (
      <Marker key={groupKey} position={[g0.lat, g0.lon]} icon={makeGroupIcon(group.length, bg)}>
        <Popup maxWidth={250}>
          <div className={styles.popup}>
            <strong style={{ fontSize: 13 }}>{group.length} גיטרות במיקום זה</strong>
            {group.map((g, i) => guitarPopupItem(g, i > 0))}
          </div>
        </Popup>
      </Marker>
    );
  });
}

const WA_ADMIN = '972547274003';

function buildAdminWaUrl(collection, volunteerName, volunteerAddress) {
  const guitars = (collection?.guitars || []).filter(g => g.status !== 'approved' && g.status !== 'rejected');
  const lines = guitars.map(g => {
    const addr = [g.city, g.street].filter(Boolean).join(', ');
    return [g.name, addr, g.phone].filter(Boolean).join(' | ');
  }).join('\n');
  const msg = `היי, אני ${volunteerName}${volunteerAddress ? ` (${volunteerAddress})` : ''} ואני יכול/ה לאסוף את הגיטרות הבאות:\n\n${lines}`;
  return `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
}

function guitarStatusLabel(status) {
  switch (status) {
    case 'pending':  return { text: '✓ נאספה', color: '#16a34a' };
    case 'approved': return { text: '✓ נאספה ואושרה', color: '#16a34a' };
    default:         return null; // 'selected' and 'rejected' show no label
  }
}

// ── Main MapView ──────────────────────────────────────────────────────────────
export default function MapView({
  isVolunteer = false,
  volunteerInfo = null,
  collection = null,
  onSaveToCollection = null,
  onRemoveFromCollection = null,
  onSendToAdmin = null,
  onMarkCollected = null,
  onUnmarkCollected = null,
}) {
  const navigate = useNavigate();
  const [guitars, setGuitars]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [filter, setFilter]               = useState('הכל');
  const [userLocation, setUserLocation]   = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [manualInput, setManualInput]     = useState('');
  const [locating, setLocating]           = useState(false);
  const [nearbyExpanded, setNearbyExpanded] = useState(false);
  const [nearby, setNearby]               = useState([]);
  const [marking, setMarking]             = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [viewMode, setViewMode]           = useState('cluster');
  const [showToast, setShowToast]         = useState(isVolunteer);
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [nearbyLimit, setNearbyLimit]     = useState(10);
  const [savingCollection, setSavingCollection] = useState(false);
  const [collectionView, setCollectionView] = useState(false);
  const [removingGuitarId, setRemovingGuitarId] = useState(null); // fade-out animation
  const [confirmModal, setConfirmModal]   = useState(null); // { id, name, city, phone }
  const [thankyouModal, setThankyouModal] = useState(null); // { name, city }

  useEffect(() => {
    if (!isVolunteer) return;
    const t = setTimeout(() => setShowToast(false), 6000);
    return () => clearTimeout(t);
  }, [isVolunteer]);

  useEffect(() => {
    getGuitarsForMap()
      .then(setGuitars)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Auto-focus on volunteer's address if provided and no location yet
  useEffect(() => {
    if (!isVolunteer || !volunteerInfo?.address || userLocation) return;
    const addr = volunteerInfo.address.trim();
    if (!addr) return;
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr + ', ישראל')}&format=json&limit=1&countrycodes=il`,
      { headers: { 'User-Agent': 'EchoGuitars/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          calcNearby(parseFloat(data[0].lat), parseFloat(data[0].lon));
          setResolvedAddress(addr);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guitars]);

  const markCollected = useCallback(async (id) => {
    setMarking(id);
    try {
      await updateGuitar(id, { collected: true });
      setGuitars(prev => prev.map(g => g.id === id ? { ...g, collected: true } : g));
    } catch (err) {
      alert('שגיאה: ' + err.message);
    } finally {
      setMarking(null);
    }
  }, []);

  const nearbyIds = useMemo(() => new Set(nearby.slice(0, nearbyLimit).map(g => g.id)), [nearby, nearbyLimit]);

  // IDs already in the volunteer's saved collection
  const collectionGuitarIds = useMemo(() =>
    new Set((collection?.guitars || []).map(g => g.id)),
  [collection]);

  // When collection panel is open → highlight all collection guitars on map
  const collectionHighlightIds = useMemo(() =>
    collectionView ? collectionGuitarIds : new Set(),
  [collectionView, collectionGuitarIds]);

  // FitBounds positions for collection panel (cross-reference with map guitars for lat/lon)
  const collectionFitPositions = useMemo(() => {
    if (!collectionView || !collection) return null;
    const positions = collection.guitars
      .map(cg => guitars.find(g => g.id === cg.id))
      .filter(g => g && g.lat && g.lon)
      .map(g => [g.lat, g.lon]);
    return positions.length > 0 ? positions : null;
  }, [collectionView, collection, guitars]);

  const mapSelectedGuitars = useMemo(() =>
    [...selectedIds]
      .filter(id => !nearbyIds.has(id))
      .map(id => guitars.find(g => g.id === id))
      .filter(Boolean),
  [selectedIds, nearbyIds, guitars]);

  useEffect(() => { setSelectedIds(new Set()); setNearbyLimit(10); }, [nearby]);

  const onToggleSelect = useCallback((id) => {
    const guitar = guitars.find(g => g.id === id);
    // Prevent selecting locked guitars
    if (guitar?.inCollection && guitar.inCollection !== volunteerInfo?.name) return;
    // Prevent selecting already-in-collection guitars
    if (collectionGuitarIds.has(id)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [guitars, volunteerInfo, collectionGuitarIds]);

  // Fade-out then remove
  const handleRemoveGuitar = useCallback((guitarId) => {
    setRemovingGuitarId(guitarId);
    setTimeout(() => {
      onRemoveFromCollection?.(guitarId);
      setRemovingGuitarId(null);
    }, 320);
  }, [onRemoveFromCollection]);

  // Build WhatsApp URL for "I collected this guitar"
  const buildCollectedWaUrl = (guitar) => {
    const msg = `היי, אספתי את הגיטרה של ${guitar.name}${guitar.city ? ` מ${guitar.city}` : ''} 🎸✓`;
    return `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
  };

  // Called when volunteer clicks "המשך"
  const handleSaveCollection = useCallback(async () => {
    if (!onSaveToCollection || selectedIds.size === 0) return;
    setSavingCollection(true);
    const selectedGuitars = [...selectedIds]
      .map(id => guitars.find(g => g.id === id))
      .filter(Boolean)
      .map(g => ({ id: g.id, name: g.name, city: g.city, street: g.street, phone: g.phone }));
    await onSaveToCollection(selectedGuitars);
    setSelectedIds(new Set());
    setSavingCollection(false);
    setCollectionView(true); // auto-open panel after saving
  }, [onSaveToCollection, selectedIds, guitars]);

  const fitBoundsPositions = useMemo(() => {
    if (!userLocation || nearby.length === 0) return null;
    return [
      [userLocation.lat, userLocation.lon],
      ...nearby.filter(g => g.lat && g.lon).map(g => [g.lat, g.lon]),
    ];
  }, [userLocation, nearby]);

  const myName = volunteerInfo?.name || '';

  const filters = ['הכל', 'נאסף', 'ממתין'];
  const visible = isVolunteer
    // Volunteers: hide collected + hide guitars locked by OTHER volunteers
    ? guitars.filter(g => !g.collected && (!g.inCollection || g.inCollection === myName))
    : filter === 'הכל' ? guitars
    : filter === 'נאסף' ? guitars.filter(g => g.collected)
    : guitars.filter(g => !g.collected);

  const calcNearby = useCallback((lat, lon) => {
    // Exclude guitars locked by other volunteers from the nearby list
    const uncollected = guitars.filter(g =>
      !g.collected && g.lat && g.lon &&
      (!g.inCollection || g.inCollection === myName)
    );
    const withDist = uncollected.map(g => ({ ...g, distance: haversine(lat, lon, g.lat, g.lon) }));
    withDist.sort((a, b) => a.distance - b.distance);
    setNearby(withDist.slice(0, 15));
    setUserLocation({ lat, lon });
  }, [guitars, myName]);

  const detectLocation = () => {
    if (!navigator.geolocation) { alert('הדפדפן לא תומך ב-geolocation'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        calcNearby(pos.coords.latitude, pos.coords.longitude);
        setResolvedAddress('מיקום GPS');
        setLocating(false);
      },
      () => { alert('לא הצלחנו לזהות מיקום'); setLocating(false); }
    );
  };

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    setLocating(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualInput + ', ישראל')}&format=json&limit=1&countrycodes=il`,
        { headers: { 'User-Agent': 'EchoGuitars/1.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        calcNearby(parseFloat(data[0].lat), parseFloat(data[0].lon));
        setResolvedAddress(data[0].display_name.split(',').slice(0, 3).join(','));
      } else {
        alert('לא נמצא מיקום עבור: ' + manualInput);
      }
    } catch { alert('שגיאה בחיפוש מיקום'); }
    finally { setLocating(false); }
  };

  return (
    <div className={`${styles.page} ${isVolunteer ? styles.pageVolunteer : ''}`}>
      {isVolunteer && (
        <div className={`${styles.toast} ${showToast ? styles.toastVisible : styles.toastHidden}`}>
          <span className={styles.toastIcon}>⏳</span>
          בפתיחה ראשונה הנתונים עשויים להיטען לאחר מספר שניות – נא להמתין
          <button className={styles.toastClose} onClick={() => setShowToast(false)}>✕</button>
        </div>
      )}

      {/* ── Map side ── */}
      <div className={`${styles.mapSide} ${nearbyExpanded ? styles.mapSideCollapsed : ''} ${mapFullscreen ? styles.mapSideFullscreen : ''}`}>
        <div className={`${styles.mapHeader} ${isVolunteer ? styles.mapHeaderVolunteer : ''}`}>
          {!isVolunteer && (
            <span className={styles.adminCount}>
              <span className={styles.adminCountNum}>{visible.length}</span> גיטרות
            </span>
          )}
          {!isVolunteer && (
            <div className={styles.filters}>
              {filters.map(t => (
                <button key={t}
                  className={`${styles.filterBtn} ${filter === t ? styles.active : ''}`}
                  onClick={() => setFilter(t)}
                  style={filter === t && t !== 'הכל'
                    ? { background: t === 'נאסף' ? MARKER_COLOR.collected : MARKER_COLOR.pending, color: '#fff', borderColor: 'transparent' }
                    : {}}
                >{t}</button>
              ))}
            </div>
          )}
          {isVolunteer && (
            <span className={styles.volunteerCount} style={{ flex: 1, textAlign: 'center' }}>
              <span className={styles.volunteerCountNum}>{visible.length}</span> גיטרות זמינות לאיסוף
            </span>
          )}
          {!isVolunteer && (
            <button
              className={`${styles.viewModeBtn} ${viewMode === 'dots' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode(m => m === 'cluster' ? 'dots' : 'cluster')}
              title={viewMode === 'cluster' ? 'עבור לתצוגת נקודות' : 'עבור לתצוגת קיבוץ'}
            >
              {viewMode === 'cluster' ? <Dot size={16} /> : <Layers size={16} />}
              {viewMode === 'cluster' ? 'נקודות' : 'קיבוץ'}
            </button>
          )}
        </div>

        {isVolunteer && (
          <div className={styles.volunteerLocationRow}>
            <div className={styles.manualRow}>
              <input
                className={styles.volunteerLocationInput}
                placeholder="הזן עיר / כתובת לאיסוף..."
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
              />
              <button className={styles.searchBtn} onClick={handleManualSearch} disabled={locating}>
                <Search size={15} />
              </button>
              <button
                className={styles.volunteerGpsBtnInline}
                onClick={detectLocation}
                disabled={locating || loading}
                title="זיהוי מיקום עצמי"
              >
                <Navigation size={14} />
                {locating ? '...' : 'זהה מיקום עצמי'}
              </button>
            </div>
          </div>
        )}
        {isVolunteer && resolvedAddress && (
          <div className={styles.resolvedAddress}>
            <Navigation size={12} /> {resolvedAddress}
          </div>
        )}

        <div className={styles.mapWrapper}>
          <button
            className={styles.fullscreenBtn}
            onClick={() => setMapFullscreen(f => !f)}
            title={mapFullscreen ? 'צא ממסך מלא' : 'מסך מלא'}
          >
            {mapFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          {loading && <div className={styles.loading}>טוען...</div>}
          {error   && <div className={styles.loading} style={{color:'red'}}>שגיאה: {error}</div>}
          {!loading && !error && (
            <MapContainer center={[31.5, 35.0]} zoom={8} className={styles.map}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapInvalidator fullscreen={mapFullscreen} />
              <FitBounds positions={collectionFitPositions || fitBoundsPositions} />
              <FlyTo target={guitars.find(g => g.id === highlightedId) || null} />
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lon]} icon={makeLocationPin()} zIndexOffset={2000}>
                  <Popup>המיקום שלך</Popup>
                </Marker>
              )}
              <MapMarkers
                visible={visible}
                highlightedId={highlightedId}
                nearbyIds={nearbyIds}
                marking={marking}
                markCollected={markCollected}
                navigate={navigate}
                viewMode={viewMode}
                isVolunteer={isVolunteer}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                volunteerName={volunteerInfo?.name || ''}
                collectionGuitarIds={collectionGuitarIds}
                collectionHighlightIds={collectionHighlightIds}
              />
            </MapContainer>
          )}
        </div>

        <div className={styles.legend}>
          {!isVolunteer && <div className={styles.legendItem}><span className={styles.dot} style={{background: MARKER_COLOR.collected}}/> נאסף ({guitars.filter(g=>g.collected).length})</div>}
          <div className={styles.legendItem}><span className={styles.dot} style={{background: MARKER_COLOR.pending}}/> ממתין ({guitars.filter(g=>!g.collected).length})</div>
          {nearbyIds.size > 0 && <div className={styles.legendItem}><span className={styles.dot} style={{background:'#22c55e'}}/> גיטרות בסביבתי</div>}
          {isVolunteer && collectionView && <div className={styles.legendItem}><span className={styles.dot} style={{background:'#0891b2'}}/> ברשימתי</div>}
          <div className={styles.legendItem}><span className={styles.dot} style={{background:'#4361ee'}}/> המיקום שלי</div>
        </div>
      </div>

      {/* ── Nearby / Collection side ── */}
      <div className={`${styles.nearbySide} ${nearbyExpanded ? styles.nearbySideExpanded : ''}`}>

        {/* ── Collection panel (shown instead of nearby when open) ── */}
        {isVolunteer && collectionView && collection && (
          <div className={styles.collectionPanel}>
            <div className={styles.collectionPanelHeader}>
              <div>
                <h2 className={styles.collectionPanelTitle}>🎸 רשימת האיסוף שלי</h2>
                <p className={styles.collectionPanelSub}>{collection.guitars.length} גיטרות</p>
              </div>
              <button className={styles.collectionCloseBtn} onClick={() => setCollectionView(false)} title="מזער">
                <X size={18} />
              </button>
            </div>

            <div className={styles.collectionList}>
              {collection.guitars.length === 0 && (
                <div className={styles.collectionEmpty}>הרשימה ריקה</div>
              )}
              {collection.guitars.map(g => {
                const sl = guitarStatusLabel(g.status);
                const isActive   = g.status === 'selected' || g.status === 'rejected';
                const isDone     = g.status === 'approved' || g.status === 'pending';
                const isRemoving = removingGuitarId === g.id;
                return (
                  <div
                    key={g.id}
                    className={`${styles.nearbyCard} ${highlightedId === g.id ? styles.nearbyCardHighlighted : ''} ${isDone ? styles.nearbyCardDone : ''} ${isRemoving ? styles.nearbyCardRemoving : ''}`}
                    onClick={() => setHighlightedId(g.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.nearbyInfo}>
                      <div className={styles.nearbyName}>{g.name}</div>
                      <div className={styles.nearbyAddress}>
                        <MapPin size={12} /> {g.city}{g.street ? `, ${g.street}` : ''}
                      </div>
                      {g.phone && !isDone && (
                        <div className={styles.nearbyPhoneBlock}>
                          <a href={`tel:${g.phone}`} className={styles.nearbyPhone}>📞 {g.phone}</a>
                          <a href={toWhatsApp(g.phone)} target="_blank" rel="noopener noreferrer" className={styles.waBtn}>
                            <WaIcon /><span className={styles.waBtnLabel}>לתיאום</span>
                          </a>
                        </div>
                      )}
                      {sl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: sl.color }}>{sl.text}</span>
                          {g.status === 'pending' && (
                            <button className={styles.undoBtn} onClick={e => { e.stopPropagation(); onUnmarkCollected?.(g.id); }} title="בטל סימון">↩</button>
                          )}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <div className={styles.collectionCardActions} onClick={e => e.stopPropagation()}>
                        <button
                          className={styles.collectedBtn}
                          onClick={() => setConfirmModal({ id: g.id, name: g.name, city: g.city, phone: g.phone })}
                          title="סמן שאספת"
                        >
                          <CheckCircle size={15} /> נאסף
                        </button>
                        <button
                          className={styles.removeCardBtn}
                          onClick={() => handleRemoveGuitar(g.id)}
                          title="הסר מרשימה"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ── Nearby list (hidden when collection panel is open) ── */}
        {!(isVolunteer && collectionView && collection) && (
          <>
        <div className={styles.nearbyHeader}>
          <MapPin size={18} />
          <h2>{isVolunteer && userLocation ? 'לאיסוף גיטרות בקרבתי:' : 'המלצות לאיסוף בקרבתי'}</h2>
          <button className={styles.expandBtn} onClick={() => setNearbyExpanded(e => !e)} title={nearbyExpanded ? 'צמצם' : 'הרחב'}>
            {nearbyExpanded ? '▼' : '▲'}
          </button>
        </div>

        {!isVolunteer && (
          <div className={styles.locationControls}>
            <button className={styles.detectBtn} onClick={detectLocation} disabled={locating || loading}>
              <Navigation size={15} />
              {locating ? 'מאתר...' : 'זהה מיקום עצמי'}
            </button>
            <div className={styles.manualRow}>
              <input
                className={styles.manualInput}
                placeholder="או הזן עיר / כתובת..."
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
              />
              <button className={styles.searchBtn} onClick={handleManualSearch} disabled={locating}>
                <Search size={15} />
              </button>
            </div>
          </div>
        )}

        {!isVolunteer && resolvedAddress && (
          <div className={styles.resolvedAddress}>
            <Navigation size={13} /> {resolvedAddress}
          </div>
        )}

        {nearby.length === 0 && !userLocation && mapSelectedGuitars.length === 0 && (
          <div className={styles.emptyNearby}>
            <MapPin size={40} color="#d1d5db" />
            <p>כדי לראות גיטרות בקרבתך —<br/>הזן אזור איסוף למעלה</p>
          </div>
        )}

        {(nearby.length > 0 || mapSelectedGuitars.length > 0) && (
          <div className={styles.nearbyList}>
            {nearby.length > 0 && (
              <>
                <div className={styles.nearbyListHeader}>
                  {isVolunteer
                    ? <p className={styles.nearbyInstruction}>בחר גיטרות שתוכל/י לאסוף</p>
                    : <p className={styles.nearbySubtitle}>Top {nearbyLimit} גיטרות שלא נאספו בקרבתך</p>
                  }
                  {!isVolunteer && (
                    <a
                      className={styles.waExportBtn}
                      href={(() => {
                        const lines = nearby.map((g, i) =>
                          `${i + 1}. ${g.name}${g.phone ? ` | ${g.phone}` : ''}${g.city ? ` | ${g.city}${g.street ? `, ${g.street}` : ''}` : ''}`
                        ).join('\n');
                        const msg = `גיטרות לאיסוף בקרבת ${resolvedAddress || 'המיקום שנבחר'}:\n\n${lines}`;
                        return `https://wa.me/972547274003?text=${encodeURIComponent(msg)}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WaIcon /> שלח ברשימה
                    </a>
                  )}
                </div>
                {nearby.slice(0, nearbyLimit).map((g, i) => {
                  const lockedByOther = g.inCollection && g.inCollection !== volunteerInfo?.name;
                  const inMyCol = collectionGuitarIds.has(g.id);
                  return (
                    <div
                      key={g.id}
                      className={`${styles.nearbyCard} ${highlightedId === g.id ? styles.nearbyCardHighlighted : ''} ${isVolunteer && selectedIds.has(g.id) ? styles.nearbyCardSelected : ''} ${lockedByOther ? styles.nearbyCardLocked : ''}`}
                      onClick={() => setHighlightedId(g.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.nearbyRank}>#{i + 1}</div>
                      <div className={styles.nearbyInfo}>
                        <div className={styles.nearbyName}>{g.name}</div>
                        <div className={styles.nearbyAddress}>
                          <MapPin size={12} /> {g.city}{g.street ? `, ${g.street}` : ''}
                        </div>
                        {g.phone && !lockedByOther && (
                          <div className={styles.nearbyPhoneBlock}>
                            <a href={`tel:${g.phone}`} className={styles.nearbyPhone}>📞 {g.phone}</a>
                            <a href={toWhatsApp(g.phone)} target="_blank" rel="noopener noreferrer" className={styles.waBtn}><WaIcon /><span className={styles.waBtnLabel}>לתיאום איסוף</span></a>
                          </div>
                        )}
                        {lockedByOther && (
                          <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginTop: 3 }}>🔒 בתהליך איסוף ע"י מתנדב אחר</div>
                        )}
                        {inMyCol && !lockedByOther && (
                          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 3 }}>✓ ברשימת האיסוף שלך</div>
                        )}
                      </div>
                      <div className={styles.nearbyDist}>{g.distance.toFixed(1)} ק"מ</div>
                      {isVolunteer && !lockedByOther && !inMyCol && (
                        <div className={styles.selectBtnWrapper}>
                          <span className={styles.selectBtnLabel}>יכול/ה לאסוף</span>
                          <button
                            className={`${styles.selectBtn} ${selectedIds.has(g.id) ? styles.selectBtnChecked : ''}`}
                            onClick={e => { e.stopPropagation(); onToggleSelect(g.id); }}
                          >
                            {selectedIds.has(g.id) ? '✓' : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {isVolunteer && mapSelectedGuitars.length > 0 && (
              <div className={styles.mapSelectedSection}>
                <div className={styles.mapSelectedHeader}>📍 נבחרו מהמפה</div>
                {mapSelectedGuitars.map(g => (
                  <div
                    key={g.id}
                    className={`${styles.nearbyCard} ${styles.nearbyCardExternal} ${highlightedId === g.id ? styles.nearbyCardHighlighted : ''}`}
                    onClick={() => setHighlightedId(g.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.nearbyInfo}>
                      <div className={styles.nearbyName}>{g.name}</div>
                      <div className={styles.nearbyAddress}>
                        <MapPin size={12} /> {g.city}{g.street ? `, ${g.street}` : ''}
                      </div>
                    </div>
                    <div className={styles.selectBtnWrapper}>
                      <span className={styles.selectBtnLabel}>הסר</span>
                      <button
                        className={`${styles.selectBtn} ${styles.selectBtnChecked}`}
                        onClick={e => { e.stopPropagation(); onToggleSelect(g.id); }}
                      >✓</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {nearby.length > nearbyLimit && (
          <button className={styles.expandListBtn} onClick={() => setNearbyLimit(15)}>
            הרחב חיפוש — Top 15
          </button>
        )}
          </>
        )}

        {/* ── Contact button at bottom of sidebar ── */}
        {isVolunteer && (
          <a
            href={`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent('היי נועם, אני מתנדב באקו ויש לי שאלה 🎸')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contactWaBtn}
          >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="#25d366" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 3C8.82 3 3 8.82 3 16c0 2.35.64 4.55 1.76 6.44L3 29l6.74-1.76A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.45 17.6c-.27.76-1.57 1.46-2.16 1.55-.55.08-1.24.12-2-.13-.46-.14-1.05-.34-1.8-.67-3.16-1.36-5.22-4.54-5.38-4.75-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.12-2.66.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.44-.07.68.52.27.63.9 2.2.98 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.16.19-.33.42-.47.56-.16.16-.32.33-.14.65.18.32.82 1.35 1.76 2.19 1.21 1.08 2.23 1.41 2.55 1.57.32.16.5.13.68-.08.19-.21.8-.93 1.01-1.25.21-.32.42-.27.7-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.76-.19 1.52z"/>
            </svg>
            צור קשר
          </a>
        )}
      </div>

      {/* ── FAB: "המשך" ── */}
      {isVolunteer && selectedIds.size > 0 && (
        <button
          className={styles.canCollectFab}
          onClick={handleSaveCollection}
          disabled={savingCollection}
          style={{ border: 'none', cursor: savingCollection ? 'wait' : 'pointer' }}
        >
          {savingCollection ? 'שומר...' : `✓ המשך (${selectedIds.size})`}
        </button>
      )}

      {/* ── Collection bubble — shown when panel is closed ── */}
      {isVolunteer && !collectionView && (
        <CollectionBubble
          collection={collection}
          onClick={() => setCollectionView(true)}
        />
      )}


      {/* ── Confirmation modal (centered) ── */}
      {confirmModal && (
        <div className={styles.modalOverlay} onClick={() => setConfirmModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}>🎸</div>
            <h3 className={styles.modalTitle}>אספת את הגיטרה?</h3>
            <p className={styles.modalBody}>
              {confirmModal.name}
              {confirmModal.city ? ` — ${confirmModal.city}` : ''}
            </p>
            <div className={styles.modalBtns}>
              <button
                className={styles.modalYes}
                onClick={() => {
                  onMarkCollected?.(confirmModal.id);
                  setThankyouModal({ name: confirmModal.name, city: confirmModal.city, phone: confirmModal.phone });
                  setConfirmModal(null);
                }}
              >
                ✓ כן, אספתי!
              </button>
              <button className={styles.modalNo} onClick={() => setConfirmModal(null)}>
                ✕ לא עדיין
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Thank-you modal after confirming collection ── */}
      {thankyouModal && (
        <div className={styles.modalOverlay} onClick={() => setThankyouModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}>🙏</div>
            <h3 className={styles.modalTitle}>תודה רבה על איסוף הגיטרה!</h3>
            <p className={styles.modalBody}>
              עדכן את מנהל המיזם שאספת את הגיטרה של <strong>{thankyouModal.name}</strong>
            </p>
            <a
              href={buildCollectedWaUrl(thankyouModal)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.thankyouWaBtn}
              onClick={() => setThankyouModal(null)}
            >
              <svg width="18" height="18" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3C8.82 3 3 8.82 3 16c0 2.35.64 4.55 1.76 6.44L3 29l6.74-1.76A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.45 17.6c-.27.76-1.57 1.46-2.16 1.55-.55.08-1.24.12-2-.13-.46-.14-1.05-.34-1.8-.67-3.16-1.36-5.22-4.54-5.38-4.75-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.12-2.66.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.44-.07.68.52.27.63.9 2.2.98 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.16.19-.33.42-.47.56-.16.16-.32.33-.14.65.18.32.82 1.35 1.76 2.19 1.21 1.08 2.23 1.41 2.55 1.57.32.16.5.13.68-.08.19-.21.8-.93 1.01-1.25.21-.32.42-.27.7-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.76-.19 1.52z"/>
              </svg>
              עדכן את נועם בוואטסאפ
            </a>
            <button className={styles.modalClose} onClick={() => setThankyouModal(null)}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}
