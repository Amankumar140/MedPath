const { describe, it, test, before } = require('node:test');
const assert = require('node:assert');

function expect(actual) {
  return {
    toBe(expected) { assert.strictEqual(actual, expected); },
    toEqual(expected) { assert.deepStrictEqual(actual, expected); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toContain(expected) { assert.ok(actual.includes(expected)); },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      assert.ok(diff < Math.pow(10, -precision) / 2);
    },
    not: {
      toBe(expected) { assert.notStrictEqual(actual, expected); },
    },
  };
}

const {
  normalizeHospital,
  normalizeLocalHospital,
  cloneSnapshotData,
  toSnapshotCreateData,
  SNAPSHOT_COPY_FIELDS,
} = require('../src/services/hospital.normalizer');
const fs = require('fs');
const path = require('path');

describe('Canonical Hospital Normalizer & End-to-End Invariants', () => {
  let swasthyaFixture;

  const defaultFixture = {
    result: {
      recommendations: [
        {
          name: 'Apollo Hospital',
          source: 'Swasthya AI Core',
          suitability: 'High Match',
          overall_score: 92.5,
          overall_rating: 4.7,
          rank: 1,
          review_count: 348,
          hospital_type: 'Super Specialty',
          estimated_travel_time_minutes: 15,
          facilities: ['24/7 Emergency', 'Advanced ICU'],
          doctors: ['Dr. V. Sharma'],
        },
      ],
    },
  };

  before(() => {
    const fixturePath = path.resolve(__dirname, '../../../swasthya.json');
    if (fs.existsSync(fixturePath)) {
      const rawContent = fs.readFileSync(fixturePath, 'utf8');
      swasthyaFixture = JSON.parse(rawContent);
    } else {
      swasthyaFixture = defaultFixture;
    }
  });

  test('Gate F Invariant: source and suitability are strictly independent and never overwrite each other', () => {
    const rawHosp = swasthyaFixture.result.recommendations[0];
    expect(rawHosp.source).toBe('Swasthya AI Core');
    expect(rawHosp.suitability).toBe('High Match');

    const canonical = normalizeHospital(rawHosp);

    expect(canonical.source).toBe('Swasthya AI Core');
    expect(canonical.suitability).toBe('High Match');
    expect(canonical.source).not.toBe(canonical.suitability);
  });

  test('Gate C: Normalizer resolves all provider score and ranking aliases accurately', () => {
    const rawHosp = swasthyaFixture.result.recommendations[0];
    const canonical = normalizeHospital(rawHosp);

    // confidenceScore normalized to 0-1
    expect(canonical.confidenceScore).toBeCloseTo(0.925, 3);
    // trustScore normalized to 0-5
    expect(canonical.trustScore).toBe(4.7);
    expect(canonical.rankingPosition).toBe(1);
    expect(canonical.reviewCount).toBe(348);
    expect(canonical.hospitalType).toBe('Super Specialty');
  });

  test('Gate D: rawMetadata preserves entire lossless provider payload', () => {
    const rawHosp = swasthyaFixture.result.recommendations[0];
    const canonical = normalizeHospital(rawHosp);

    expect(canonical.rawMetadata).toBeDefined();
    expect(canonical.rawMetadata.name).toBe(rawHosp.name);
    expect(canonical.rawMetadata.hospital_type).toBe(rawHosp.hospital_type);
    expect(canonical.rawMetadata.estimated_travel_time_minutes).toBe(rawHosp.estimated_travel_time_minutes);
    expect(canonical.rawMetadata.facilities).toEqual(rawHosp.facilities);
    expect(canonical.rawMetadata.doctors).toEqual(rawHosp.doctors);
  });

  test('Gate E: Cache reuse parity - cloneSnapshotData copies all canonical fields without stripping', () => {
    const rawHosp = swasthyaFixture.result.recommendations[0];
    const canonical = normalizeHospital(rawHosp);
    const mockSnapshot = toSnapshotCreateData('convo-1', canonical);

    const cloned = cloneSnapshotData('convo-2', mockSnapshot);

    expect(cloned.conversationId).toBe('convo-2');
    for (const field of SNAPSHOT_COPY_FIELDS) {
      if (mockSnapshot[field] !== undefined) {
        expect(cloned[field]).toEqual(mockSnapshot[field]);
      }
    }
    // Verify specific critical fields that were previously stripped
    expect(cloned.specialties).toEqual(canonical.specialties);
    expect(cloned.facilities).toEqual(canonical.facilities);
    expect(cloned.doctors).toEqual(canonical.doctors);
    expect(cloned.suitability).toBe('High Match');
    expect(cloned.source).toBe('Swasthya AI Core');
  });

  test('Gate B: Local fallback produces the exact same canonical contract shape', () => {
    const mockDbHospital = {
      hospitalName: 'Felix Hospital',
      overallRating: 4.6,
      reviewCount: 150,
      latitude: 28.5,
      longitude: 77.3,
      address: 'Sector 137, Noida',
      phoneNumber: '+91-120-1234567',
      websiteUrl: 'https://felixhospital.com',
      ownershipType: 'Private Multi-Specialty',
      emergencyAvailable: true,
      icuAvailable: true,
      insuranceCashlessAvailable: true,
      accreditationNabh: true,
      accreditationNabl: true,
    };

    const canonicalLocal = normalizeLocalHospital(mockDbHospital, 0);

    expect(canonicalLocal.hospitalName).toBe('Felix Hospital');
    expect(canonicalLocal.rankingPosition).toBe(1);
    expect(canonicalLocal.source).toBe('MedPath Local Registry');
    expect(canonicalLocal.suitability).toBe('Top Result');
    expect(canonicalLocal.hasEmergency).toBe(true);
    expect(canonicalLocal.hasIcu).toBe(true);
    expect(canonicalLocal.accreditations).toContain('NABH');
    expect(canonicalLocal.rawMetadata).toBeDefined();
  });

  test('Batch 1 Correctness: rank-1 hospital with overall_score 0.15 derives Top Result, and unranked hospital falls back to score', () => {
    // 1. Rank-1 hospital with Swasthya low overall_score (0.15) -> Top Result
    const rank1Hosp = {
      name: 'Emergency Care Hospital',
      rank: 1,
      overall_score: 0.15,
    };
    const canonicalRank1 = normalizeHospital(rank1Hosp);
    expect(canonicalRank1.rankingPosition).toBe(1);
    expect(canonicalRank1.suitability).toBe('Top Result');

    // 1b. String rank "1" coerces to 1 -> Top Result
    const stringRank1 = normalizeHospital({ name: 'String Rank Hospital', rank: '1', overall_score: 0.15 });
    expect(stringRank1.rankingPosition).toBe(1);
    expect(stringRank1.suitability).toBe('Top Result');

    // 2. Rank-2 and Rank-3 hospitals with low score -> Good Option
    const rank2Hosp = { name: 'Hospital Two', rank: 2, overall_score: 0.15 };
    expect(normalizeHospital(rank2Hosp).suitability).toBe('Good Option');

    // 3. Hospital with no rank -> Falls back to score thresholds
    const noRankHighScore = { name: 'Unranked A', overall_score: 0.85 };
    expect(normalizeHospital(noRankHighScore).suitability).toBe('Top Result');

    const noRankMidScore = { name: 'Unranked B', overall_score: 0.55 };
    expect(normalizeHospital(noRankMidScore).suitability).toBe('Good Option');

    const noRankLowScore = { name: 'Unranked C', overall_score: 0.25 };
    expect(normalizeHospital(noRankLowScore).suitability).toBe('Other Option');
  });
});
