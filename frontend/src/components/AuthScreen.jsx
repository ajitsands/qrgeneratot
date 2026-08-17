import { useState } from 'react';
import Footer from './Footer';
import AppLogo from '../assets/Logo-WithoutISO.png';

export default function AuthScreen({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Registration fields
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: '',
    domain_name: '',
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

      let data;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        console.error('Raw response:', text);
        throw new Error(`Server returned invalid response: ${text.substring(0, 100)}...`);
      }

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
        setSuccessMessage('Registration successful! Please log in.');
      }
    } catch (err) {
      setError(err.message);
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:bg-[#0F172A] p-4 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="w-full max-w-md bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-2xl backdrop-blur-xl transition-colors duration-300">
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={AppLogo} alt="SaNDS Lab Logo" className="h-16 drop-shadow-md" />
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
              
              <div>
                <input type="text" name="domain_name" required placeholder="Domain Name (e.g. yourwebsite.com)" value={formData.domain_name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2">Domain name is required to generate the Application Key.</p>
              </div>

              <input type="text" name="domain_ip" required placeholder="Domain IP (Optional)" value={formData.domain_ip} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
            </>
          )}

          <input type="email" name="email" required placeholder="Email Address (Username)" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />
          <input type="password" name="password" required placeholder="Password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-purple-500/30 focus:border-purple-500 focus:outline-none transition-colors dark:text-white text-gray-900" />

          {successMessage && <div className="p-3 bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-500/50 rounded-lg text-green-700 dark:text-green-200 text-sm text-center transition-colors">{successMessage}</div>}
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
          <button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMessage(null); }} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
          </button>
        </div>

      </div>
      
      <Footer />
    </div>
  );
}
