import React, { useState, useContext } from 'react';
import { Context } from "../store/appContext";
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Login = () => {
  const { store, actions } = useContext(Context);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const redirectTarget = query.get("redirect") || "/profile";
  const isLiveMode = query.get("mode") === "live";
  const isDevLogin = location.pathname === "/dev-login";

  const handleLogin = async (e) => {
    e.preventDefault();
    const data = await actions.login(email, password);

    if (data?.access_token) {
      if (isDevLogin || isLiveMode) {
        sessionStorage.setItem("spx_dev_mode", "true");
      }

      alert("Login successful!");
      navigate(redirectTarget);
    } else {
      alert('Login failed: ' + (data?.error || "Unknown error"));
    }
  };

  return (
    <div>
      <form onSubmit={handleLogin}>
        <h1>{isDevLogin ? "Developer Login" : "Login"}</h1>

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

        <button type="submit">
          {isDevLogin ? "Login & Enter Live Mode" : "Login"}
        </button>

        <p>
          Please click <Link to="/signup">here</Link> to sign up!
        </p>
      </form>
    </div>
  );
};

export default Login;