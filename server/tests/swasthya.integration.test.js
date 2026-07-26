const assert = require('assert');
const swasthyaService = require('../src/services/swasthya.service');
const conversationService = require('../src/modules/conversations/conversation.service');

async function runTests() {
  console.log('🚀 Starting Swasthya AI Core Integration & Privacy Tests...\n');

  // --- UNIT TEST 1: redactSensitiveData ---
  try {
    console.log('🧪 Test 1: redactSensitiveData');
    const mockData = {
      message: 'I have severe headache',
      symptoms: ['headache'],
      patient_location: {
        city: 'Bangalore'
      },
      medical_history: ['asthma']
    };
    const redacted = swasthyaService.redactSensitiveData(mockData);
    
    assert.strictEqual(redacted.message, '[REDACTED]', 'Message should be redacted');
    assert.strictEqual(redacted.symptoms, '[REDACTED]', 'Symptoms should be redacted');
    assert.strictEqual(redacted.medical_history, '[REDACTED]', 'Medical history should be redacted');
    assert.strictEqual(redacted.patient_location.city, 'Bangalore', 'Non-sensitive field (city) should remain intact');
    
    console.log('✅ Test 1 Passed: redactSensitiveData correctly redacts sensitive details.');
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
    process.exit(1);
  }

  // --- UNIT TEST 2: sanitizePatientContextForStorage ---
  try {
    console.log('🧪 Test 2: sanitizePatientContextForStorage');
    const mockContext = {
      context_id: 'test-uuid-1234',
      language: { language_code: 'en' },
      clinical: {
        symptoms: ['back pain'],
        medical_history: ['diabetes']
      },
      validation: { is_context_sufficient: true }
    };
    const sanitized = conversationService.sanitizePatientContextForStorage(mockContext);
    
    assert.strictEqual(sanitized.context_id, 'test-uuid-1234', 'context_id should be preserved');
    assert.strictEqual(sanitized.clinical, undefined, 'clinical object should be completely deleted');
    assert.strictEqual(sanitized.validation.is_context_sufficient, true, 'validation details should be preserved');
    
    console.log('✅ Test 2 Passed: sanitizePatientContextForStorage removes clinical signals.');
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.message);
    process.exit(1);
  }

  // --- UNIT TEST 3: sanitizeAxiosError ---
  try {
    console.log('🧪 Test 3: sanitizeAxiosError');
    const mockAxiosError = {
      message: 'Request failed with status code 422',
      code: 'ERR_BAD_REQUEST',
      config: {
        url: '/api/context/analyze',
        method: 'post',
        data: '{"message":"severe symptoms"}'
      },
      response: {
        status: 422,
        data: {
          message: 'Validation Error',
          detail: [
            { loc: ['body', 'message'], msg: 'symptoms are too long', type: 'value_error' }
          ]
        }
      }
    };
    const sanitizedError = swasthyaService.sanitizeAxiosError(mockAxiosError);
    
    assert.strictEqual(sanitizedError instanceof Error, true, 'Should return a standard Error instance');
    assert.strictEqual(sanitizedError.status, 422, 'Should preserve status code');
    assert.strictEqual(sanitizedError.statusCode, 422, 'Should preserve statusCode');
    assert.strictEqual(sanitizedError.config, undefined, 'Should strip original Axios config to prevent leaks');
    assert.strictEqual(sanitizedError.response, undefined, 'Should strip original Axios response to prevent leaks');
    
    console.log('✅ Test 3 Passed: sanitizeAxiosError strips request data and metadata.');
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.message);
    process.exit(1);
  }

  // --- INTEGRATION TEST 4: health check endpoint ---
  try {
    console.log('🧪 Test 4: health() integration');
    const res = await swasthyaService.health();
    assert.strictEqual(res.success, true, 'Health check success flag should be true');
    assert.ok(res.latencyMs >= 0, 'Latency should be a non-negative integer');
    console.log(`✅ Test 4 Passed: health check succeeded in ${res.latencyMs}ms.`);
  } catch (err) {
    console.error('❌ Test 4 Failed:', err.message);
    process.exit(1);
  }

  // --- INTEGRATION TEST 5: analyzeContext() integration ---
  try {
    console.log('🧪 Test 5: analyzeContext() integration');
    const message = 'I have mild head cold since 2 days, located in Bangalore.';
    const res = await swasthyaService.analyzeContext(message);
    
    assert.strictEqual(res.success, true, 'API call success flag should be true');
    assert.ok(res.data.context_id, 'Response should contain context_id');
    assert.ok(res.data.detected_intent, 'Response should contain detected_intent');
    
    console.log('✅ Test 5 Passed: analyzeContext API integration works correctly.');
  } catch (err) {
    console.error('❌ Test 5 Failed:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 All tests passed successfully!');
  process.exit(0);
}

runTests();
