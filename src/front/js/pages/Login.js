import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    const data = await login(email, password);
    if (data.access_token) {
      localStorage.setItem('token', data.access_token); // Store the token
      alert("Login successful!");
      navigate('/products'); // Redirect to the products page
    } else {
      alert('Login failed: ' + data.error);
    }
  };

  return (
    <div>
      <h1>Login</h1>
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
      <button onClick={handleLogin}>Login</button>
      <p> Please click <Link to="/register">here</Link> to sign up! </p>
    </div>
  );
};

export default Login;