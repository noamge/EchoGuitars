import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import QuickEdit from './pages/QuickEdit';
import TableView from './pages/TableView';
import AddressReview from './pages/AddressReview';
import Volunteers from './pages/Volunteers';
import Login from './pages/Login';
import VolunteerLayout from './components/VolunteerLayout';
import {
  getVolunteerCollection,
  saveVolunteerCollection,
  removeGuitarFromCollection,
  sendCollectionToAdmin,
  markGuitarCollected,
} from './api/client';

export default function App() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem('echo_auth') === '1'
  );
  const [role, setRole] = useState(
    () => localStorage.getItem('echo_role') || 'admin'
  );
  const [volunteerInfo, setVolunteerInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('volunteer_info')) || null; } catch { return null; }
  });

  // Volunteer collection state
  const [collection, setCollection] = useState(null); // { id, guitars, sentToAdmin, ... }

  // Load existing collection from backend on mount (volunteer only)
  useEffect(() => {
    if (role !== 'volunteer') return;
    const collId = localStorage.getItem('volunteer_collection_id');
    if (!collId) return;
    getVolunteerCollection(collId)
      .then(col => { if (col) setCollection(col); })
      .catch(() => localStorage.removeItem('volunteer_collection_id'));
  }, [role]);

  const handleLogin = (r, info) => {
    setAuthed(true);
    setRole(r);
    if (info) setVolunteerInfo(info);
  };

  const handleLogout = () => {
    localStorage.removeItem('echo_auth');
    localStorage.removeItem('echo_role');
    localStorage.removeItem('volunteer_info');
    // Keep volunteer_collection_id so they can resume later if they log back in
    setAuthed(false);
    setRole('admin');
    setVolunteerInfo(null);
    setCollection(null);
  };

  // Called from MapView when volunteer clicks "המשך"
  const handleSaveToCollection = useCallback(async (selectedGuitars) => {
    if (!volunteerInfo || selectedGuitars.length === 0) return;
    try {
      const result = await saveVolunteerCollection({
        collectionId: collection?.id || null,
        volunteerName: volunteerInfo.name,
        volunteerAddress: volunteerInfo.address,
        guitars: selectedGuitars,
      });
      setCollection(result);
      localStorage.setItem('volunteer_collection_id', result.id);
    } catch (err) {
      alert('שגיאה בשמירת רשימה: ' + err.message);
    }
  }, [volunteerInfo, collection]);

  const handleRemoveFromCollection = useCallback((guitarId) => {
    if (!collection) return;
    // Optimistic update — state changes immediately (animation already played in MapView)
    setCollection(prev => {
      if (!prev) return prev;
      const remaining = prev.guitars.filter(g => g.id !== guitarId);
      if (remaining.length === 0) {
        localStorage.removeItem('volunteer_collection_id');
        return null;
      }
      return { ...prev, guitars: remaining };
    });
    // API call in background, non-blocking
    removeGuitarFromCollection(collection.id, guitarId).catch(err =>
      console.error('Remove guitar error:', err.message)
    );
  }, [collection]);

  const handleSendToAdmin = useCallback(async () => {
    if (!collection) return;
    try {
      const updated = await sendCollectionToAdmin(collection.id);
      setCollection(updated);
    } catch (err) {
      alert('שגיאה: ' + err.message);
    }
  }, [collection]);

  const handleMarkCollected = useCallback(async (guitarId) => {
    if (!collection) return;
    try {
      const updated = await markGuitarCollected(collection.id, guitarId);
      setCollection(updated);
    } catch (err) {
      alert('שגיאה: ' + err.message);
    }
  }, [collection]);

  if (!authed) return <Login onLogin={handleLogin} />;

  if (role === 'volunteer') {
    return (
      <BrowserRouter>
        <VolunteerLayout
          onLogout={handleLogout}
          volunteerName={volunteerInfo?.name || ''}
        >
          <MapView
            isVolunteer
            volunteerInfo={volunteerInfo}
            collection={collection}
            onSaveToCollection={handleSaveToCollection}
            onRemoveFromCollection={handleRemoveFromCollection}
            onSendToAdmin={handleSendToAdmin}
            onMarkCollected={handleMarkCollected}
          />
        </VolunteerLayout>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapView />} />
          <Route path="collect" element={<QuickEdit />} />
          <Route path="table" element={<TableView />} />
          <Route path="address-review" element={<AddressReview />} />
          <Route path="volunteers" element={<Volunteers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
