import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import QuickEdit from './pages/QuickEdit';
import TableView from './pages/TableView';
import AddressReview from './pages/AddressReview';
import Login from './pages/Login';
import VolunteerLayout from './components/VolunteerLayout';

export default function App() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem('echo_auth') === '1'
  );
  const [role, setRole] = useState(
    () => localStorage.getItem('echo_role') || 'admin'
  );

  const handleLogin = (r) => {
    setAuthed(true);
    setRole(r);
  };

  const handleLogout = () => {
    localStorage.removeItem('echo_auth');
    localStorage.removeItem('echo_role');
    setAuthed(false);
    setRole('admin');
  };

  if (!authed) return <Login onLogin={handleLogin} />;

  if (role === 'volunteer') {
    return (
      <BrowserRouter>
        <VolunteerLayout onLogout={handleLogout}>
          <MapView isVolunteer />
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
