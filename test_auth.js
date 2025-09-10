const bcrypt = require('bcryptjs');
const axios = require('axios');

async function testAuth() {
  try {
    // Test login
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@school.edu',
      password: 'password123'
    });
    
    console.log('✅ Login successful:', loginResponse.data);
    
    // Test protected endpoint
    const token = loginResponse.data.token;
    const departmentsResponse = await axios.get('http://localhost:3001/api/departments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Protected endpoint access successful');
    console.log('Departments:', departmentsResponse.data.data.length, 'found');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

testAuth();
