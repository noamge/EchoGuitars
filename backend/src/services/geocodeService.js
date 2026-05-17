const axios = require('axios');

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const cache = new Map();

function getApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY;
}

// Normalize common Hebrew spelling variations so the Geocoding API gets canonical names.
// Example: "קרית טבעון" → "קריית טבעון" (the API is stricter than the Maps UI).
function normalizeCity(city) {
  // "קרית X" (informal, without yod) → "קריית X" (official spelling with yod)
  return city.replace(/\bקרית\s/g, 'קריית ');
}

// Strip Hebrew vowel points (nikud) so "אֳרָנִית" == "אורנית"
function stripNikud(s) {
  return s.replace(/[ְ-ׇ]/g, '');
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

  const query = [street, normalizeCity(city), 'ישראל'].filter(Boolean).join(', ');
  if (cache.has(query)) return cache.get(query);

  try {
    const res = await axios.get(GOOGLE_GEOCODE_URL, {
      params: { address: query, key: apiKey, language: 'he', region: 'il' },
      timeout: 5000,
    });

    if (res.data.status === 'OK' && res.data.results.length > 0) {
      const { lat, lng } = res.data.results[0].geometry.location;
      const components = res.data.results[0].address_components;
      const routeComponent = extractComponent(components, 'route');
      const cityOnly = !street || !routeComponent;

      // Guard: verify the result is actually in the requested city.
      // Google sometimes fuzzy-matches a misspelled street to a different city entirely
      // (e.g. "ליבבנה 5, אור יהודה" → Tel Aviv). If the returned locality doesn't
      // match the requested city, discard the result so we don't pin it in the wrong place.
      const resultLocality =
        extractComponent(components, 'locality') ||
        extractComponent(components, 'administrative_area_level_2') || '';
      if (resultLocality) {
        const reqNorm = stripNikud(normalizeCity(city).trim());
        const resNorm = stripNikud(normalizeCity(resultLocality).trim());
        // Bare consonants: remove ו/י (mater lectionis) for comparison.
        // Handles "קריית"/"קרית" (double vs single yod) and nikud-form "אֳרָנִית" vs "אורנית".
        const bare = s => s.replace(/[וי]/g, '');
        // Skip check when Google returns a Latin-script name (some small cities have no Hebrew result)
        const isHebrew = /[א-ת]/.test(resultLocality);
        const mismatch = isHebrew &&
          !resNorm.includes(reqNorm) && !reqNorm.includes(resNorm) &&
          !bare(resNorm).includes(bare(reqNorm)) && !bare(reqNorm).includes(bare(resNorm));
        if (mismatch) {
          // Street was mismatched to a different city — fall back to city-only pin
          if (street) {
            const cityOnlyResult = await geocodeAddress('', city);
            const fallback = cityOnlyResult ? { ...cityOnlyResult, cityOnly: true } : null;
            cache.set(query, fallback);
            return fallback;
          }
          cache.set(query, null);
          return null;
        }
      }

      // Fallback: if Google didn't find the street and the input has a house number,
      // retry with just the street name (no number). Handles cases like "ענב 203"
      // where Google knows "ענב" but not the specific house number.
      if (cityOnly && street && /\d/.test(street)) {
        const streetNameOnly = street.replace(/\s*\d+.*$/, '').trim();
        if (streetNameOnly && streetNameOnly !== street) {
          const fallback = await geocodeAddress(streetNameOnly, city);
          if (fallback && !fallback.cityOnly) {
            cache.set(query, fallback);
            return fallback;
          }
        }
      }

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

  const query = normalizeCity(rawText.trim()) + ', ישראל';
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

function clearGeocodeCache() {
  cache.clear();
}

module.exports = { geocodeAddress, suggestAddress, clearGeocodeCache };
