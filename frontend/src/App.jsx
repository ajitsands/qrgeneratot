import { useState, useEffect } from 'react'
import AuthScreen from './components/AuthScreen'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [text, setText] = useState('')
  const [format, setFormat] = useState('base64')
  const [scale, setScale] = useState(5)
  const [quietzoneSize, setQuietzoneSize] = useState(4)
  const [activeTab, setActiveTab] = useState('curl')
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Activation State
  const [licenseKey, setLicenseKey] = useState('')
  const [activationLoading, setActivationLoading] = useState(false)
  const [activationMessage, setActivationMessage] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

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
        body: JSON.stringify({ text, format, scale, quietzoneSize }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (data.message && data.message.includes('No license')) {
          setUser({ ...user, has_license: false })
        }
        throw new Error(data.message || 'Failed to generate QR code')
      }

      setQrData(data)
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

  if (loadingUser) {
    return <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={(userData) => setUser(userData)} />
  }

  const userSoftwareKey = user.license_key || 'INV-XXXXXX-XXXXXX'

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8 font-sans selection:bg-purple-500/30 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 drop-shadow-sm">
              SaNDS Lab QR Generator
            </h1>
            <p className="text-gray-400 text-lg">Create stunning QR codes instantly via Web or API</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium">{user.company_name}</div>
              <div className="text-xs text-gray-400">{user.email}</div>
            </div>
            <button onClick={handleLogout} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
              Log Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className={`backdrop-blur-xl bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl transition-all ${!user.has_license ? 'opacity-50 pointer-events-none filter blur-[2px]' : ''}`}>
              <form onSubmit={generateQR} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-purple-200">Data / URL</label>
                  <input
                    type="text"
                    required
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500 shadow-inner"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-purple-200">Format</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all text-white appearance-none"
                    >
                      <option value="base64">Base64 Image</option>
                      <option value="image">URL Link</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-purple-200">Border Size: {quietzoneSize}</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={quietzoneSize}
                      onChange={(e) => setQuietzoneSize(e.target.value)}
                      className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-purple-200">Resolution (Scale): {scale}x</label>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-500">Low</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={scale}
                      onChange={(e) => setScale(e.target.value)}
                      className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="text-xs text-gray-500">High</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !text}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate QR Code'}
                </button>
              </form>

              {error && <div className="mt-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200">{error}</div>}

              {qrData && (
                <div className="mt-8 flex flex-col items-center space-y-4 p-6 bg-black/20 rounded-2xl border border-white/10">
                  <h3 className="text-lg font-medium text-green-400">Success!</h3>
                  <img src={qrData.format === 'base64' ? qrData.data : qrData.url} alt="QR Code" className="w-48 h-48 rounded-lg shadow-lg" />
                </div>
              )}
            </div>

            {(!user.has_license || activationMessage?.type === 'success') && (
              <div className="backdrop-blur-xl bg-purple-900/40 rounded-3xl p-8 border border-purple-500/30 shadow-2xl relative z-10">
                <h2 className="text-xl font-bold mb-4 text-purple-200">Activate Your Account</h2>
                <p className="text-sm text-gray-300 mb-6">Please enter your SaNDS Lab Software Key to bind it to your account and unlock the generator.</p>
                <form onSubmit={activateLicense} className="space-y-4">
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-purple-500/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400 transition-all text-white placeholder-gray-500"
                    placeholder="INV-XXXXXX-XXXXXX"
                  />
                  <button
                    type="submit"
                    disabled={activationLoading || !licenseKey}
                    className="w-full py-3 rounded-xl font-bold text-md bg-purple-600 hover:bg-purple-500 transition-all shadow-lg disabled:opacity-50"
                  >
                    {activationLoading ? 'Activating...' : 'Activate License'}
                  </button>
                </form>

                {activationMessage && (
                  <div className={`mt-4 p-4 rounded-xl border ${activationMessage.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-red-500/20 border-red-500/50 text-red-200'}`}>
                    {activationMessage.text}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-8 border border-white/10 h-fit">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              API Integration
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              You can integrate our QR Code Generator directly into your own applications. Authenticate by passing your Software Key in the headers.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-purple-300">Endpoint</h3>
                <code className="block p-3 bg-black/40 rounded-lg text-sm text-green-300 font-mono border border-white/5">
                  POST {window.location.origin}/api/generateqr
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-purple-300">Request Body (JSON)</h3>
                <pre className="p-4 bg-black/40 rounded-lg text-sm text-gray-300 font-mono overflow-x-auto border border-white/5">
{`{
  "text": "https://example.com",
  "format": "base64", // or "image"
  "scale": ${scale},
  "quietzoneSize": ${quietzoneSize}
}`}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="flex space-x-2 border-b border-white/10 pb-2 overflow-x-auto">
                  {['curl', 'react', 'php', 'dotnet'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {tab === 'curl' ? 'cURL' : tab === 'react' ? 'React JS' : tab === 'php' ? 'PHP' : '.NET / C#'}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <pre className="p-4 bg-black/40 rounded-lg text-sm text-gray-300 font-mono overflow-x-auto border border-white/5">
                    {activeTab === 'curl' && `curl -X POST ${window.location.origin}/api/generateqr \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello World", "format": "image", "scale": ${scale}, "quietzoneSize": ${quietzoneSize}}'`}

                    {activeTab === 'react' && `const generateQR = async () => {
  const response = await fetch('${window.location.origin}/api/generateqr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Hello World',
      format: 'base64',
      scale: ${scale},
      quietzoneSize: ${quietzoneSize}
    }),
  });
  
  const data = await response.json();
  console.log(data);
};`}

                    {activeTab === 'php' && `<?php
$payload = json_encode([
    'text' => 'Hello World',
    'format' => 'image',
    'scale' => ${scale},
    'quietzoneSize' => ${quietzoneSize}
]);

$ch = curl_init('${window.location.origin}/api/generateqr');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLINFO_HEADER_OUT, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
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
        var json = "{\\"text\\":\\"Hello World\\",\\"format\\":\\"base64\\",\\"scale\\":${scale},\\"quietzoneSize\\":${quietzoneSize}}";
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
    </div>
  )
}

export default App
