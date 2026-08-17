import { useState } from 'react';

export default function AuthScreen({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Registration fields
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: '',
    domain_name: window.location.hostname,
    domain_ip: '',
    contact_name: '',
    mobile: '',
    captcha_token: 'dummy-token' // Placeholder for Captcha
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? 'api/auth/login.php' : 'api/auth/register.php';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email: formData.email, password: formData.password } : formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      if (isLogin) {
        localStorage.setItem('qr_token', data.token);
        onLoginSuccess(data.user);
      } else {
        // Registration success
        setIsLogin(true);
        setError(null);
        alert('Registration successful! Please log in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-2xl backdrop-blur-xl transition-colors duration-300">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-500/20 mb-4 transition-colors">
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors">
            {isLogin ? 'Enter your details to access the QR Generator' : 'Register to get your unique license key'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input type="text" name="company_name" required placeholder="Company Name" value={formData.company_name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
              <input type="text" name="contact_name" required placeholder="Contact Person Name" value={formData.contact_name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
              <input type="tel" name="mobile" required placeholder="Mobile Number" value={formData.mobile} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
              <input type="text" name="domain_name" required placeholder="Domain Name" value={formData.domain_name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
              <input type="text" name="domain_ip" required placeholder="Domain IP (Optional)" value={formData.domain_ip} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
            </>
          )}

          <input type="email" name="email" required placeholder="Email Address (Username)" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
          <input type="password" name="password" required placeholder="Password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />

          {error && <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-200 text-sm text-center transition-colors">{error}</div>}

          {!isLogin && (
            <div className="p-3 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-xs text-gray-500 dark:text-gray-400 text-center transition-colors">
              Captcha verification will be implemented here.
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all shadow-lg disabled:opacity-50">
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
          </button>
        </div>

      </div>
    </div>
  );
}
