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

export const smartQuery = (text) =>
  api.post('/ai/smart-query', { text }).then(r => r.data);

export const getAllGuitarsForSelect = () =>
  api.get('/guitars').then(r => r.data);

export const addGuitar = (data) =>
  api.post('/guitars', data).then(r => r.data);

export const deleteGuitar = (id) =>
  api.delete(`/guitars/${id}`).then(r => r.data);

// ── Volunteers ────────────────────────────────────────────────────────────────

export const getVolunteerCollections = () =>
  api.get('/volunteers/collections').then(r => r.data);

export const getVolunteerPendingCount = () =>
  api.get('/volunteers/pending-count').then(r => r.data.count);

export const getVolunteerCollection = (id) =>
  api.get(`/volunteers/collection/${id}`).then(r => r.data);

/** Create new or extend existing collection. Returns updated collection object. */
export const saveVolunteerCollection = (data) =>
  api.post('/volunteers/collection', data).then(r => r.data);

export const removeGuitarFromCollection = (collectionId, guitarId) =>
  api.delete(`/volunteers/collection/${collectionId}/guitar/${guitarId}`).then(r => r.data);

export const sendCollectionToAdmin = (collectionId) =>
  api.patch(`/volunteers/collection/${collectionId}/send`).then(r => r.data);

export const markGuitarCollected = (collectionId, guitarId) =>
  api.patch(`/volunteers/collection/${collectionId}/mark-collected`, { guitarId }).then(r => r.data);

export const unmarkGuitarCollected = (collectionId, guitarId) =>
  api.patch(`/volunteers/collection/${collectionId}/unmark-collected`, { guitarId }).then(r => r.data);

export const adminMarkGuitarCollected = (collectionId, guitarId) =>
  api.patch(`/volunteers/collection/${collectionId}/admin-mark-collected`, { guitarId }).then(r => r.data);

export const approveGuitarCollection = (collectionId, guitarId) =>
  api.patch(`/volunteers/collection/${collectionId}/approve`, { guitarId }).then(r => r.data);

export const rejectGuitarCollection = (collectionId, guitarId) =>
  api.patch(`/volunteers/collection/${collectionId}/reject`, { guitarId }).then(r => r.data);

export const getVolunteerLog = () =>
  api.get('/volunteers/log').then(r => r.data);

export const logVolunteerLogin = (volunteerName, volunteerAddress) =>
  api.post('/volunteers/log-login', { volunteerName, volunteerAddress }).then(r => r.data);
