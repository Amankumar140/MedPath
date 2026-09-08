const test = require('node:test');
const assert = require('node:assert');
const { normalizeHospital } = require('../src/services/hospital.normalizer');

test('Suitability: rank 1 hospital with Swasthya overall_score 0.15 derives Top Result', () => {
  const rawHosp = {
    hospital_name: 'Emergency Care Hospital',
    rank: 1,
    overall_score: 0.15,
  };

  const canonical = normalizeHospital(rawHosp);
  assert.strictEqual(canonical.rankingPosition, 1);
  assert.strictEqual(canonical.suitability, 'Top Result');
});

test('Suitability: ranks 2 and 3 derive Good Option, 4+ derives Other Option', () => {
  const rank2 = normalizeHospital({ hospital_name: 'City Hospital', rank: 2, overall_score: 0.15 });
  const rank3 = normalizeHospital({ hospital_name: 'Metro Hospital', rank: 3, overall_score: 0.12 });
  const rank4 = normalizeHospital({ hospital_name: 'Care Clinic', rank: 4, overall_score: 0.10 });

  assert.strictEqual(rank2.suitability, 'Good Option');
  assert.strictEqual(rank3.suitability, 'Good Option');
  assert.strictEqual(rank4.suitability, 'Other Option');
});

test('Suitability: hospital with no rank falls back to confidenceScore thresholds', () => {
  const highScore = normalizeHospital({ hospital_name: 'Hospital A', overall_score: 0.85 });
  const midScore = normalizeHospital({ hospital_name: 'Hospital B', overall_score: 0.55 });
  const lowScore = normalizeHospital({ hospital_name: 'Hospital C', overall_score: 0.25 });

  assert.strictEqual(highScore.suitability, 'Top Result');
  assert.strictEqual(midScore.suitability, 'Good Option');
  assert.strictEqual(lowScore.suitability, 'Other Option');
});

test('Suitability: string rank "1" coerces to 1 and derives Top Result', () => {
  const stringRank1 = normalizeHospital({ hospital_name: 'String Rank Hospital', rank: '1', overall_score: 0.15 });
  assert.strictEqual(stringRank1.rankingPosition, 1);
  assert.strictEqual(stringRank1.suitability, 'Top Result');
});

test('Suitability: non-numeric rank falls back to confidenceScore thresholds', () => {
  const invalidRank = normalizeHospital({ hospital_name: 'Invalid Rank Hospital', rank: 'NaN', overall_score: 0.85 });
  assert.strictEqual(invalidRank.suitability, 'Top Result');
});

