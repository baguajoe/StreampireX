import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';

const SignupForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');

  const handleSignup = async () => {
    const data = await signup(email, password, role);
    if (data.msg) {
      alert(data.msg); // Display success message
    } else {
      alert('Signup failed: ' + data.error); // Display error message
    }
  };

  return (
    <div>
      <h1>Signup</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="Listener">Listener</option>
        <option value="Creator">Creator</option>
        <option value="Radio DJ">Radio DJ</option>
        <option value="Podcaster">Podcaster</option>
        <option value="Admin">Admin</option>
      </select>
      <button onClick={handleSignup}>Signup</button>
      <p>Already have an account? Click <Link to="/login">here</Link> to login.</p>
    </div>
  );
};

export default SignupForm;