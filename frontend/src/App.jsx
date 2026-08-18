import { useState, useEffect } from 'react'
import AuthScreen from './components/AuthScreen'
import AdminPanel from './components/AdminPanel'
import QrHistory from './components/QrHistory'
import Footer from './components/Footer'
import AppLogoLight from './assets/SaNDSLab-LogoForWhite.png'
import AppLogoDark from './assets/SaNDSLab-LogoForDark.png'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const [text, setText] = useState('')
  const [format, setFormat] = useState('base64')
  const [scale, setScale] = useState(5)
  const [quietzoneSize, setQuietzoneSize] = useState(4)
  const [dotStyle, setDotStyle] = useState('square')
  const [activeTab, setActiveTab] = useState('curl')
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stylePreview, setStylePreview] = useState(null)
  
  // Activation State
  const [licenseKey, setLicenseKey] = useState('')
  const [activationLoading, setActivationLoading] = useState(false)
  const [activationMessage, setActivationMessage] = useState(null)
  
  // Toast Notification State
  const [toast, setToast] = useState(null) // { message: '', type: 'success' | 'error' }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    checkAuth()
  }, [])

  // Clear generated QR when settings change
  useEffect(() => {
    setQrData(null)
  }, [text, format, scale, quietzoneSize, dotStyle])

  useEffect(() => {
    if (user) {
      loadStylePreview()
    }
  }, [dotStyle, quietzoneSize, user])

  const loadStylePreview = async () => {
    try {
      const token = localStorage.getItem('qr_token')
      const response = await fetch('api/preview.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dotStyle, quietzoneSize }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setStylePreview(data.data)
      }
    } catch (err) {
      console.error("Failed to load style preview", err)
    }
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('qr_token')
    if (!token) {
      setLoadingUser(false)
      return
    }

    try {
      const response = await fetch('api/auth/me.php', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok && data.user) {
        setUser(data.user)
      } else {
        localStorage.removeItem('qr_token')
      }
    } catch (err) {
      console.error(err)
      localStorage.removeItem('qr_token')
    } finally {
      setLoadingUser(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('qr_token')
    setUser(null)
  }

  const generateQR = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setQrData(null)
    setActivationMessage(null)

    try {
      const token = localStorage.getItem('qr_token')
      const response = await fetch('api/generateqr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, format, scale, quietzoneSize, dotStyle }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (data.message && data.message.includes('No license')) {
          setUser({ ...user, has_license: false })
        }
        throw new Error(data.message || 'Failed to generate QR code')
      }

      setQrData(data)
      if (data.qr_generated_count !== undefined) {
        setUser({ ...user, qr_generated_count: data.qr_generated_count, qr_limit: data.qr_limit })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const activateLicense = async (e) => {
    e.preventDefault()
    setActivationLoading(true)
    setActivationMessage(null)

    try {
      const token = localStorage.getItem('qr_token')
      const response = await fetch('api/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          license_key: licenseKey,
          domain_name: window.location.hostname
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to activate license')
      }

      setActivationMessage({ type: 'success', text: data.message })
      setUser({ ...user, has_license: true, license_key: licenseKey })
    } catch (err) {
      setActivationMessage({ type: 'error', text: err.message })
    } finally {
      setActivationLoading(false)
    }
  }

  const downloadQR = async () => {
    if (!qrData) return;
    try {
      const src = qrData.format === 'base64' ? qrData.data : qrData.url;
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      let extension = 'png';
      if (blob.type === 'image/svg+xml') extension = 'svg';
      else if (blob.type === 'image/jpeg') extension = 'jpg';
      else if (blob.type === 'image/gif') extension = 'gif';

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `qrcode.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setToast({ message: 'Downloaded Successfully!', type: 'success' });
    } catch (err) {
      console.error('Failed to download QR code', err);
      setToast({ message: 'Failed to download QR code. Please try again.', type: 'error' });
    }
  };

  const copyToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ message: successMessage, type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to copy to clipboard', type: 'error' });
    }
  };

  const handleCopyBase64 = () => {
    if (qrData?.format === 'base64') {
      copyToClipboard(qrData.data, 'Base64 string copied!');
    } else {
      copyToClipboard(qrData.url, 'Image URL copied!');
    }
  };

  const handleCopySVG = () => {
    if (qrData?.format === 'base64' && qrData.data.includes('image/svg+xml;base64,')) {
      const base64Content = qrData.data.split(',')[1];
      const rawSvg = atob(base64Content);
      copyToClipboard(rawSvg, 'Raw SVG code copied!');
    } else {
      setToast({ message: 'SVG code is not available for this format.', type: 'error' });
    }
  };

  if (loadingUser) {
    return <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={(userData) => setUser(userData)} />
  }

  if (showAdmin && user.is_admin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />
  }

  if (showHistory) {
    return <QrHistory onBack={() => setShowHistory(false)} />
  }

  const userSoftwareKey = user.license_key || 'INV-XXXXXX-XXXXXX'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950 dark:via-[#0F172A] dark:to-purple-950 text-gray-900 dark:text-white p-4 md:p-8 font-sans transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-200 dark:bg-purple-600/20 rounded-full blur-[120px] transition-colors"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-200 dark:bg-blue-600/20 rounded-full blur-[120px] transition-colors"></div>
      </div>

      <div className="max-w-[95%] mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="text-center md:text-left flex flex-col md:flex-row items-center gap-4">
            <img src={AppLogoLight} alt="SaNDSLab Logo" className="h-16 drop-shadow-md block dark:hidden" />
            <img src={AppLogoDark} alt="SaNDSLab Logo" className="h-16 drop-shadow-md hidden dark:block" />
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 drop-shadow-sm transition-colors">
                SaNDS Lab QR
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg transition-colors">Create stunning QR codes instantly</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden md:block border-r border-gray-200 dark:border-white/10 pr-4 mr-2">
              <div className="text-sm font-medium">{user.company_name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Generated: <span className="font-semibold text-purple-600 dark:text-purple-400">{user.qr_generated_count || 0}</span>
                {user.has_license ? (
                  user.qr_limit > 0 ? ` / ${user.qr_limit}` : ' (Unlimited)'
                ) : (
                  ` / ${user.qr_limit || 100} (Demo Mode)`
                )}
              </div>
            </div>
            
            {user.is_admin ? (
              <button onClick={() => setShowAdmin(true)} className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 rounded-lg text-sm transition-colors font-medium shadow-sm">
                Admin
              </button>
            ) : null}

            <button onClick={() => setShowHistory(true)} className="px-3 py-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/60 rounded-lg text-sm transition-colors font-medium shadow-sm">
              My QR Codes
            </button>

            <button onClick={() => document.documentElement.classList.toggle('dark')} className="p-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg text-sm transition-colors" title="Toggle Theme">
              <svg className="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <svg className="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-100 dark:bg-white/10 hover:bg-red-200 dark:hover:bg-white/20 text-red-600 dark:text-white rounded-lg text-sm transition-colors">
              Log Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl backdrop-blur-xl transition-all">
              <form onSubmit={generateQR} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-purple-700 dark:text-purple-200">Data / URL</label>
                  <input
                    type="text"
                    required
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 shadow-inner"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-purple-700 dark:text-purple-200">Format</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-gray-900 appearance-none"
                    >
                      <option value="base64">Base64 Image</option>
                      <option value="image">URL Link</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-purple-700 dark:text-purple-200">Pattern Style</label>
                    <select
                      value={dotStyle}
                      onChange={(e) => setDotStyle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-gray-900 appearance-none"
                    >
                      <option value="square">Classic Squares</option>
                      <option value="round">Rounded Dots</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-purple-700 dark:text-purple-200">Border Size: {quietzoneSize}</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={quietzoneSize}
                      onChange={(e) => setQuietzoneSize(e.target.value)}
                      className="w-full h-2 bg-gray-200 dark:bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-500 mt-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-purple-700 dark:text-purple-200">Resolution (Scale): {scale}x</label>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Low</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={scale}
                      onChange={(e) => setScale(e.target.value)}
                      className="w-full h-2 bg-gray-200 dark:bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-500"
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500">High</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !text}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate QR Code'}
                </button>
              </form>

              {!qrData && stylePreview && (
                <div className="mt-8 flex flex-col items-center p-6 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/10">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Style Demo</h3>
                  <div className="w-40 h-40 bg-white rounded-xl shadow-inner flex items-center justify-center p-2">
                    <img src={stylePreview} alt="QR Style Preview" className="w-full h-full object-contain filter grayscale-[10%] opacity-90" />
                  </div>
                </div>
              )}

              {error && <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200">{error}</div>}

              {qrData && (
                <div className="mt-8 flex flex-col md:flex-row items-center md:items-start gap-8 p-8 bg-gray-50 dark:bg-black/20 rounded-3xl border border-gray-200 dark:border-white/10 shadow-inner">
                  
                  <div className="flex-1 flex flex-col space-y-4 w-full">
                    <div>
                      <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">Success!</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Your QR code has been generated. Choose an option below.</p>
                    </div>
                    
                    <button
                      onClick={downloadQR}
                      className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors shadow-md flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download Image
                    </button>
                    
                    <button
                      onClick={handleCopyBase64}
                      className="w-full px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-xl font-semibold transition-colors flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      {qrData.format === 'base64' ? 'Copy Base64 String' : 'Copy Image URL'}
                    </button>
                    
                    {qrData.format === 'base64' && qrData.data.includes('image/svg+xml') && (
                      <button
                        onClick={handleCopySVG}
                        className="w-full px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-xl font-semibold transition-colors flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        Copy SVG Code
                      </button>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-full md:w-auto flex justify-center">
                    <div className="w-64 h-64 bg-white rounded-2xl shadow-xl flex items-center justify-center p-3 border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <img src={qrData.format === 'base64' ? qrData.data : qrData.url} alt="QR Code" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {(!user.has_license || activationMessage?.type === 'success') && (
              <div className="bg-purple-50 dark:bg-purple-900/40 rounded-3xl p-8 border border-purple-200 dark:border-purple-500/30 shadow-xl backdrop-blur-xl relative z-10">
                <h2 className="text-xl font-bold mb-4 text-purple-900 dark:text-purple-200">Activate Your Account</h2>
                <p className="text-sm text-purple-700 dark:text-gray-300 mb-6">Please enter your SaNDS Lab Software Key to bind it to your account and unlock the generator.</p>
                <form onSubmit={activateLicense} className="space-y-4">
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/30 border border-purple-200 dark:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-400 transition-all dark:text-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="INV-XXXXXX-XXXXXX"
                  />
                  <button
                    type="submit"
                    disabled={activationLoading || !licenseKey}
                    className="w-full py-3 rounded-xl font-bold text-md bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg disabled:opacity-50"
                  >
                    {activationLoading ? 'Activating...' : 'Activate License'}
                  </button>
                </form>

                {activationMessage && (
                  <div className={`mt-4 p-4 rounded-xl border ${activationMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-500/20 dark:border-green-500/50 dark:text-green-200' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200'}`}>
                    {activationMessage.text}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl backdrop-blur-xl h-fit">
            <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
              <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              API Integration
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              You can integrate our QR Code Generator directly into your own applications. Authenticate by passing your Software Key in the headers. Support for single or bulk (array) QR code generation.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-purple-700 dark:text-purple-300">Endpoint</h3>
                <code className="block p-3 bg-gray-50 dark:bg-black/40 rounded-lg text-sm text-green-700 dark:text-green-300 font-mono border border-gray-200 dark:border-white/5">
                  POST {window.location.origin}/api/generateqr
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-purple-700 dark:text-purple-300">Request Body (JSON)</h3>
                <pre className="p-4 bg-gray-50 dark:bg-black/40 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-mono overflow-x-auto border border-gray-200 dark:border-white/5">
{`{
  // For a single QR Code
  "text": "https://example.com", 
  
  // OR for bulk generation (array of strings)
  // "texts": ["https://example.com/1", "https://example.com/2"],

  "format": "base64", // or "image"
  "scale": ${scale},
  "quietzoneSize": ${quietzoneSize},
  "dotStyle": "${dotStyle}"
}`}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="flex space-x-2 border-b border-gray-200 dark:border-white/10 pb-2 overflow-x-auto">
                  {['curl', 'react', 'php', 'dotnet'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab ? 'bg-purple-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {tab === 'curl' ? 'cURL' : tab === 'react' ? 'React JS' : tab === 'php' ? 'PHP' : '.NET / C#'}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <pre className="p-4 bg-gray-50 dark:bg-black/40 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-mono overflow-x-auto border border-gray-200 dark:border-white/5">
                    {activeTab === 'curl' && `curl -X POST ${window.location.origin}/api/generateqr \\
  -H "Content-Type: application/json" \\
  -H "Software-Key: ${userSoftwareKey}" \\
  -d '{"texts": ["Item 1", "Item 2"], "format": "image", "scale": ${scale}, "quietzoneSize": ${quietzoneSize}, "dotStyle": "${dotStyle}"}'`}

                    {activeTab === 'react' && `const generateQR = async () => {
  const response = await fetch('${window.location.origin}/api/generateqr', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Software-Key': '${userSoftwareKey}'
    },
    body: JSON.stringify({
      texts: ['Item 1', 'Item 2'], // Bulk generation
      format: 'base64',
      scale: ${scale},
      quietzoneSize: ${quietzoneSize},
      dotStyle: '${dotStyle}'
    }),
  });
  
  const data = await response.json();
  console.log(data);
};`}

                    {activeTab === 'php' && `<?php
$payload = json_encode([
    'texts' => ['Item 1', 'Item 2'], // Bulk generation array
    'format' => 'image',
    'scale' => ${scale},
    'quietzoneSize' => ${quietzoneSize},
    'dotStyle' => '${dotStyle}'
]);

$ch = curl_init('${window.location.origin}/api/generateqr');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLINFO_HEADER_OUT, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Software-Key: ${userSoftwareKey}',
    'Content-Length: ' . strlen($payload)
]);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
print_r($result);
?>`}

                    {activeTab === 'dotnet' && `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Software-Key", "${userSoftwareKey}");
        
        var json = "{\\"texts\\":[\\"Item 1\\",\\"Item 2\\"],\\"format\\":\\"base64\\",\\"scale\\":${scale},\\"quietzoneSize\\":${quietzoneSize},\\"dotStyle\\":\\"${dotStyle}\\"}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync("${window.location.origin}/api/generateqr", content);
        var result = await response.Content.ReadAsStringAsync();
        
        Console.WriteLine(result);
    }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-fade-in-up ${
          toast.type === 'success'
            ? 'bg-green-50/90 border-green-200 text-green-800 dark:bg-green-950/80 dark:border-green-800 dark:text-green-200'
            : 'bg-red-50/90 border-red-200 text-red-800 dark:bg-red-950/80 dark:border-red-800 dark:text-red-200'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default App
