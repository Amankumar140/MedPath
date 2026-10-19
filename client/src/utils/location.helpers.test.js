import test from 'node:test';
import assert from 'node:assert';
import { getDirectionsUrl, parseHospitalRating, cleanProsCons, isValidWebUrl, formatDistance } from './location.helpers.js';

test('getDirectionsUrl: uses google_maps_url directly when present instead of hospitalName fallback', () => {
  const hospital = {
    hospitalName: 'Emergency Care Hospital',
    google_maps_url: 'https://maps.google.com/?cid=123456789',
  };
  const url = getDirectionsUrl(hospital, null);
  assert.strictEqual(url, 'https://maps.google.com/?cid=123456789');
});

test('getDirectionsUrl: uses googleMapsUrl camelCase direct URL when present', () => {
  const hospital = {
    hospitalName: 'City Hospital',
    googleMapsUrl: 'https://maps.google.com/?cid=987654321',
  };
  const url = getDirectionsUrl(hospital, null);
  assert.strictEqual(url, 'https://maps.google.com/?cid=987654321');
});

test('getDirectionsUrl: falls back to hospitalName-based search when direct URL is missing', () => {
  const hospital = {
    hospitalName: 'Emergency Care Hospital',
  };
  const url = getDirectionsUrl(hospital, null);
  assert.strictEqual(url, 'https://www.google.com/maps/dir/?api=1&destination=Emergency%20Care%20Hospital');
});

test('parseHospitalRating: coerces string "4.2" to numeric 4.2', () => {
  assert.strictEqual(parseHospitalRating('4.2'), 4.2);
});

test('parseHospitalRating: preserves positive numbers', () => {
  assert.strictEqual(parseHospitalRating(4.7), 4.7);
  assert.strictEqual(parseHospitalRating(5), 5);
});

test('parseHospitalRating: returns null for null, undefined, empty, 0, or non-numeric strings', () => {
  assert.strictEqual(parseHospitalRating(null), null);
  assert.strictEqual(parseHospitalRating(undefined), null);
  assert.strictEqual(parseHospitalRating(''), null);
  assert.strictEqual(parseHospitalRating(0), null);
  assert.strictEqual(parseHospitalRating('0'), null);
  assert.strictEqual(parseHospitalRating('N/A'), null);
});

test('cleanProsCons: handles null, undefined, non-array, and empty array by returning []', () => {
  assert.deepStrictEqual(cleanProsCons(null), []);
  assert.deepStrictEqual(cleanProsCons(undefined), []);
  assert.deepStrictEqual(cleanProsCons("not an array"), []);
  assert.deepStrictEqual(cleanProsCons(123), []);
  assert.deepStrictEqual(cleanProsCons([]), []);
});

test('cleanProsCons: filters mixed junk entries (numbers, null, empty strings) and trims', () => {
  const input = [' 24/7 ICU ', null, '', 42, undefined, 'Expert Doctors '];
  assert.deepStrictEqual(cleanProsCons(input), ['24/7 ICU', 'Expert Doctors']);
});

test('cleanProsCons: caps output at 3 items by default when more than 3 items are provided', () => {
  const input = ['Tag 1', 'Tag 2', 'Tag 3', 'Tag 4', 'Tag 5'];
  assert.deepStrictEqual(cleanProsCons(input), ['Tag 1', 'Tag 2', 'Tag 3']);
});

test('isValidWebUrl: rejects javascript: URLs and accepts valid https URLs', () => {
  assert.strictEqual(isValidWebUrl('javascript:alert(1)'), false);
  assert.strictEqual(isValidWebUrl('javascript:void(0)'), false);
  assert.strictEqual(isValidWebUrl('data:text/html,test'), false);
  assert.strictEqual(isValidWebUrl('ftp://example.com'), false);
  assert.strictEqual(isValidWebUrl('not a url'), false);
  assert.strictEqual(isValidWebUrl(null), false);
  assert.strictEqual(isValidWebUrl(undefined), false);

  assert.strictEqual(isValidWebUrl('https://apollohospitals.com'), true);
  assert.strictEqual(isValidWebUrl('http://cityclinic.org/info'), true);
  assert.strictEqual(isValidWebUrl('  https://secure-health.in  '), true);
});

test('formatDistance: appends km to numeric-only distances', () => {
  assert.strictEqual(formatDistance(3.2), '3.2 km');
  assert.strictEqual(formatDistance('4.5'), '4.5 km');
  assert.strictEqual(formatDistance('5'), '5 km');
  assert.strictEqual(formatDistance('0.8'), '0.8 km');
});

test('formatDistance: preserves strings that already include units', () => {
  assert.strictEqual(formatDistance('2.5 km'), '2.5 km');
  assert.strictEqual(formatDistance('800 m'), '800 m');
});

test('formatDistance: returns null for null, undefined, empty, Unknown, or Nearby', () => {
  assert.strictEqual(formatDistance(null), null);
  assert.strictEqual(formatDistance(undefined), null);
  assert.strictEqual(formatDistance(''), null);
  assert.strictEqual(formatDistance('Unknown'), null);
  assert.strictEqual(formatDistance('Nearby'), null);
  assert.strictEqual(formatDistance('nearby'), null);
});


