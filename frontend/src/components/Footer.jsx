import React, { useState, useEffect } from 'react';

export default function Footer() {
  const [showPopup, setShowPopup] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showPopup && products.length === 0) {
      fetchProducts();
    }
  }, [showPopup]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://sandslab.com/get_our_latest_products.php');
      const json = await response.json();
      if (json.status && json.data) {
        setProducts(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 w-full p-4 text-center z-40">
        <button
          onClick={() => setShowPopup(true)}
          className="text-sm font-medium text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors backdrop-blur-md bg-white/30 dark:bg-black/30 px-4 py-2 rounded-full shadow-sm"
        >
          Powered by SaNDS Lab
        </button>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-white/10 animate-fade-in-up relative">
            <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 dark:from-purple-400 dark:to-blue-400">
                Discover SaNDS Lab
              </h2>
              <button 
                onClick={() => setShowPopup(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors bg-white/50 dark:bg-black/20 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 flex gap-4 border-b border-gray-100 dark:border-white/10 flex-col sm:flex-row">
              <a 
                href="https://www.sandslab.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-center font-semibold hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                Go to Website
              </a>
              <a 
                href="https://wa.me/97335078079" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-center font-semibold hover:bg-green-100 dark:hover:bg-green-800/40 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                Connect on WhatsApp
              </a>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-[#1E293B]">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </span>
                Our Latest Products
              </h3>
              
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading products...</div>
              ) : products.length > 0 ? (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.ids} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 hover:shadow-lg transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{product.product_name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{product.product_discription}</p>
                      </div>
                      <a
                        href={product.web_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-sm font-medium transition-all shadow-md text-center"
                      >
                        Learn More
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">No products available at the moment.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
