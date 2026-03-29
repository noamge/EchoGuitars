import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// ── Guitars ──────────────────────────────────────────────────────────────────

/** All guitars with optional filters: { region, city, type, collected } */
export const getGuitars = (params = {}) =>
  api.get('/guitars', { params }).then(r => r.data);

/** Dashboard stats */
export const getGuitarStats = () =>
  api.get('/guitars/stats').then(r => r.data);

/** Guitars with lat/lon for map view */
export const getGuitarsForMap = () =>
  api.get('/guitars/map').then(r => r.data);

/** Single guitar by row index (numeric ID) */
export const getGuitar = (id) =>
  api.get(`/guitars/${id}`).then(r => r.data);

/** Update a guitar row. id = rowIndex number */
export const updateGuitar = (id, updates) =>
  api.patch(`/guitars/${id}`, updates).then(r => r.data);

/** Find all guitars by donor name */
export const getGuitarsByName = (name) =>
  api.get(`/guitars/by-name/${encodeURIComponent(name)}`).then(r => r.data);

// ── Donors ───────────────────────────────────────────────────────────────────

/** Autocomplete donor search */
export const searchDonors = (q) =>
  api.get('/donors', { params: { q } }).then(r => r.data);

// ── Upload ───────────────────────────────────────────────────────────────────

export const uploadImage = (file) => {
  const form = new FormData();
  form.append('image', file);
  return api.post('/upload/image', form).then(r => r.data);
};

// ── AI ───────────────────────────────────────────────────────────────────────

export const parseNotes = (notes) =>
  api.post('/ai/parse-notes', { notes }).then(r => r.data);

export const getAddressIssues = () =>
  api.get('/guitars/address-issues').then(r => r.data);

export const getAddressIssuesCount = () =>
  api.get('/guitars/address-issues/count').then(r => r.data.count);

export const updateGuitarCity = (id, city, street) =>
  api.patch(`/guitars/${id}/city`, { city, street }).then(r => r.data);

export const validateAddress = (rawText) =>
  api.post('/guitars/validate-address', { rawText }).then(r => r.data);

export const parseGeneralUpdate = (text) =>
  api.post('/ai/parse-update', { text }).then(r => r.data);

export const getAllGuitarsForSelect = () =>
  api.get('/guitars').then(r => r.data);

export const addGuitar = (data) =>
  api.post('/guitars', data).then(r => r.data);
