const axios = require('axios');

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const cache = new Map();

function getApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY;
}

// Extract a specific component type from Google's address_components
function extractComponent(components, type) {
  const comp = components.find(c => c.types.includes(type));
  return comp ? comp.long_name : null;
}

/**
 * Geocode a street + city to lat/lon using Google Maps.
 * Falls back to city-only if street yields no result.
 */
async function geocodeAddress(street, city) {
  if (!city) return null;
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const query = [street, city, 'ישראל'].filter(Boolean).join(', ');
  if (cache.has(query)) return cache.get(query);

  try {
    const res = await axios.get(GOOGLE_GEOCODE_URL, {
      params: { address: query, key: apiKey, language: 'he', region: 'il' },
      timeout: 5000,
    });

    if (res.data.status === 'OK' && res.data.results.length > 0) {
      const { lat, lng } = res.data.results[0].geometry.location;
      const components = res.data.results[0].address_components;
      // cityOnly = no street was queried, OR Google's result has no route component (street not found)
      const routeComponent = extractComponent(components, 'route');
      const cityOnly = !street || !routeComponent;
      const result = { lat, lon: lng, cityOnly };
      cache.set(query, result);
      return result;
    }
  } catch (err) {
    console.error('Google geocode error:', err.message);
  }

  cache.set(query, null);
  return null;
}

/**
 * Given a raw freetext address, ask Google to parse and normalize it.
 * Returns { city, street, formattedAddress, lat, lon } or null.
 */
async function suggestAddress(rawText) {
  if (!rawText || !rawText.trim()) return null;
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const query = rawText.trim() + ', ישראל';
  const cacheKey = 'suggest:' + query;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const res = await axios.get(GOOGLE_GEOCODE_URL, {
      params: { address: query, key: apiKey, language: 'he', region: 'il' },
      timeout: 5000,
    });

    if (res.data.status === 'OK' && res.data.results.length > 0) {
      const result = res.data.results[0];
      const components = result.address_components;

      const city =
        extractComponent(components, 'locality') ||
        extractComponent(components, 'administrative_area_level_2') ||
        null;

      const street = extractComponent(components, 'route');
      const streetNumber = extractComponent(components, 'street_number');
      const fullStreet = street
        ? streetNumber ? `${street} ${streetNumber}` : street
        : null;

      const { lat, lng } = result.geometry.location;
      // precise = Google found a specific street (route component exists)
      // GEOMETRIC_CENTER of a street is good enough for map placement
      const isPrecise = !!fullStreet;

      const suggestion = {
        city,
        street: fullStreet,
        formattedAddress: result.formatted_address,
        lat,
        lon: lng,
        precise: isPrecise,
      };

      cache.set(cacheKey, suggestion);
      return suggestion;
    }
  } catch (err) {
    console.error('Google suggest error:', err.message);
  }

  cache.set(cacheKey, null);
  return null;
}

module.exports = { geocodeAddress, suggestAddress };
