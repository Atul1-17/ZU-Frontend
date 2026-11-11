import React, { useEffect, useState } from 'react';
import { useCheckAdminAuthQuery, useLoginAdminMutation } from './services/authApi.js';

function getErrorMessage(error) {
  return error?.data?.message || error?.error || 'Unable to sign in. Please try again.';
}

export default function AdminLogin() {
  const [message, setMessage] = useState('');
  const [loginAdmin, { isLoading }] = useLoginAdminMutation();
  const { data: authStatus } = useCheckAdminAuthQuery();
  const alreadyAuthenticated = authStatus?.isAuthenticated === true;

  useEffect(() => {
    document.title = 'Admin Login | ZU Developers';
    document.documentElement.lang = 'en';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = '#080607';
  }, []);

  useEffect(() => {
    if (alreadyAuthenticated) window.location.replace('/admin/dashboard');
  }, [alreadyAuthenticated]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isLoading) return;
    setMessage('');
    const formData = new FormData(event.currentTarget);

    try {
      await loginAdmin({
        email: formData.get('email'),
        password: formData.get('password'),
      }).unwrap();
      window.location.assign('/admin/dashboard');
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login__glow" aria-hidden="true" />
      <section className="admin-login__panel" aria-labelledby="admin-login-title">
        <a className="admin-login__brand" href="/" aria-label="ZU Developers home">
          ZU<span>DEVELOPERS</span>
        </a>

        <div className="admin-login__rule" aria-hidden="true"><span /></div>

        <p className="admin-login__eyebrow">ADMINISTRATOR ACCESS</p>
        <h1 id="admin-login-title">Welcome <em>back.</em></h1>
        <p className="admin-login__intro">Sign in to access the administration portal.</p>

        <form className="admin-login__form" onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />

          <button type="submit">Sign in <span aria-hidden="true">↗</span></button>
          <p className="admin-login__message" role="status" aria-live="polite">{message}</p>
        </form>

        <p className="admin-login__footnote">AUTHORIZED ADMINISTRATORS ONLY</p>
      </section>
    </main>
  );
}
