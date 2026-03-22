import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import QuickEdit from './pages/QuickEdit';
import TableView from './pages/TableView';
import AddressReview from './pages/AddressReview';
import Login from './pages/Login';

export default function App() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem('echo_auth') === '1'
  );

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

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
