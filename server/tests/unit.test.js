// Unit tests for core features
const assert = require('assert');

// Test password validation
function testPasswordValidation() {
  const validatePassword = (pwd) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd);
  
  assert(validatePassword('ValidPass123'), 'Should accept valid password');
  assert(!validatePassword('weak'), 'Should reject weak password');
  assert(!validatePassword('NoNumbers'), 'Should reject password without number');
  console.log('✓ Password validation tests passed');
}

// Test email validation
function testEmailValidation() {
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  assert(validateEmail('user@example.com'), 'Should accept valid email');
  assert(!validateEmail('invalid'), 'Should reject invalid email');
  assert(!validateEmail('user@'), 'Should reject incomplete email');
  console.log('✓ Email validation tests passed');
}

// Test username validation
function testUsernameValidation() {
  const validateUsername = (username) => /^[a-zA-Z0-9_]{3,20}$/.test(username);
  
  assert(validateUsername('valid_user'), 'Should accept valid username');
  assert(!validateUsername('ab'), 'Should reject too short');
  assert(!validateUsername('user@name'), 'Should reject special chars');
  console.log('✓ Username validation tests passed');
}

// Test JWT token generation & verification
function testJWTTokens() {
  const jwt = require('jsonwebtoken');
  const secret = 'test_secret_key';
  
  const token = jwt.sign({ userId: 'user123', username: 'testuser' }, secret, { expiresIn: '1h' });
  assert(token, 'Token should be generated');
  
  const decoded = jwt.verify(token, secret);
  assert(decoded.userId === 'user123', 'Token should contain correct userId');
  console.log('✓ JWT token tests passed');
}

// Run all tests
console.log('\n🧪 Running unit tests...\n');
try {
  testPasswordValidation();
  testEmailValidation();
  testUsernameValidation();
  testJWTTokens();
  console.log('\n✅ All tests passed!\n');
} catch (err) {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
}
