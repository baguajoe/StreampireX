import React, { useState, useContext } from 'react';
import { Context } from "../store/appContext";
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const { store, actions } = useContext(Context);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const data = await actions.login(email, password);
    if (data.access_token) {
      alert("Login successful!");
      navigate('/profile');
    } else {
      alert('Login failed: ' + data.error);
    }
  };

  return (
    <div>
      <form onSubmit={handleLogin}>
        <h1>Login</h1>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button type="submit">Login</button>
        <p> Please click <Link to="/register">here</Link> to sign up! </p>
      </form>
    </div>
  );
};

export default Login;