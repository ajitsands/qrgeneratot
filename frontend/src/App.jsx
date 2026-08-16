import { useState } from 'react'
import './App.css'

function App() {
  const [text, setText] = useState('')
  const [format, setFormat] = useState('base64')
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Activation State
  const [licenseKey, setLicenseKey] = useState('')
  const [activationLoading, setActivationLoading] = useState(false)
  const [activationMessage, setActivationMessage] = useState(null)
  const [needsActivation, setNeedsActivation] = useState(false)

  const generateQR = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setQrData(null)
    setActivationMessage(null)

    try {
      const response = await fetch('api/generate.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, format }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (data.message && data.message.includes('No license')) {
          setNeedsActivation(true)
        }
        throw new Error(data.message || 'Failed to generate QR code')
      }

      setNeedsActivation(false)
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
      const response = await fetch('api/activate.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ license_key: licenseKey, domain_name: window.location.hostname }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Activation failed')
      }

      setActivationMessage({ type: 'success', text: data.message })
      setNeedsActivation(false)
      setError(null) // clear the previous error
    } catch (err) {
      setActivationMessage({ type: 'error', text: err.message })
    } finally {
      setActivationLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 pt-12">
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Premium QR Code Generator
          </h1>
          <p className="text-xl text-gray-300">Generate high-quality QR codes instantly with our robust API.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Generator Form */}
          <div className="space-y-8">
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Create QR Code</h2>
              <form onSubmit={generateQR} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content (URL, Text, etc.)
                  </label>
                  <input
                    type="text"
                    required
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Output Format
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value="base64"
                        checked={format === 'base64'}
                        onChange={(e) => setFormat(e.target.value)}
                        className="text-purple-500 focus:ring-purple-500 bg-black/30 border-white/10"
                      />
                      <span>Base64</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value="image"
                        checked={format === 'image'}
                        onChange={(e) => setFormat(e.target.value)}
                        className="text-purple-500 focus:ring-purple-500 bg-black/30 border-white/10"
                      />
                      <span>Image URL</span>
                    </label>
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

              {/* Results Display */}
              {error && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200">
                  {error}
                </div>
              )}

              {qrData && (
                <div className="mt-8 flex flex-col items-center space-y-4 p-6 bg-black/20 rounded-2xl border border-white/10">
                  <h3 className="text-lg font-medium text-green-400">Success!</h3>
                  {qrData.format === 'base64' ? (
                    <img src={qrData.data} alt="QR Code" className="w-48 h-48 rounded-lg shadow-lg" />
                  ) : (
                    <img src={qrData.url} alt="QR Code" className="w-48 h-48 rounded-lg shadow-lg" />
                  )}
                </div>
              )}
            </div>

            {/* Activation Form (Shows if needed) */}
            {(needsActivation || activationMessage?.type === 'success') && (
              <div className="backdrop-blur-xl bg-purple-900/40 rounded-3xl p-8 border border-purple-500/30 shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-purple-200">System Activation</h2>
                <p className="text-sm text-gray-300 mb-6">Please enter your SaNDS Lab License Key to activate this server.</p>
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

          {/* API Integration Docs */}
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-8 border border-white/10 h-fit">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              API Integration
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              You can integrate our QR Code Generator directly into your own applications using our REST API. The API is protected by SaNDS Lab Licensing Server.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-purple-300">Endpoint</h3>
                <code className="block p-3 bg-black/40 rounded-lg text-sm text-green-300 font-mono">
                  POST api/generate.php
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-purple-300">Request Body (JSON)</h3>
                <pre className="p-4 bg-black/40 rounded-lg text-sm text-gray-300 font-mono overflow-x-auto border border-white/5">
{`{
  "text": "https://your-url.com",
  "format": "base64" // or "image"
}`}
                </pre>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-purple-300">Example (cURL)</h3>
                <pre className="p-4 bg-black/40 rounded-lg text-sm text-gray-300 font-mono overflow-x-auto border border-white/5">
{`curl -X POST http://yourdomain/api/generate.php \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello World", "format": "image"}'`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
