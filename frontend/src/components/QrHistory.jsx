import React, { useState, useEffect } from 'react';

export default function QrHistory({ targetUserId = null, onBack }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQr, setSelectedQr] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, idsToDelete }
  const [toast, setToast] = useState(null); // { message, type }
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchHistory();
  }, [targetUserId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      let url = 'api/history.php';
      if (targetUserId === 'all') {
        url += '?all=1';
      } else if (targetUserId) {
        url += `?user_id=${targetUserId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('qr_token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch history');
      setLogs(data.logs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSelectedIds([]); // Clear selection when history reloads
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  };

  const handleDownload = async (qr) => {
    try {
      const src = qr.qr_result;
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      let extension = 'png';
      if (blob.type === 'image/svg+xml') extension = 'svg';
      else if (blob.type === 'image/jpeg') extension = 'jpg';
      else if (blob.type === 'image/gif') extension = 'gif';

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `qrcode_${qr.id}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setToast({ message: 'QR Code downloaded successfully!', type: 'success' });
    } catch (err) {
      console.error('Failed to download QR code', err);
      setToast({ message: 'Failed to download QR code. Please try again.', type: 'error' });
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (log.qr_text && log.qr_text.toLowerCase().includes(searchLower)) ||
      (log.format && log.format.toLowerCase().includes(searchLower)) ||
      (log.company_name && log.company_name.toLowerCase().includes(searchLower)) ||
      (log.email && log.email.toLowerCase().includes(searchLower))
    );
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedLogs.map(log => log.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const requestDelete = (idsToDelete) => {
    setConfirmDialog({
      message: `Are you sure you want to delete ${idsToDelete.length} QR code(s)?`,
      idsToDelete: idsToDelete
    });
  };

  const executeDelete = async () => {
    if (!confirmDialog) return;
    
    const idsToDelete = confirmDialog.idsToDelete;
    setConfirmDialog(null);
    setIsDeleting(true);
    
    try {
      const response = await fetch('api/delete_history.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qr_token')}`
        },
        body: JSON.stringify({ ids: idsToDelete })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete logs');
      
      setToast({ message: 'Deleted successfully.', type: 'success' });
      fetchHistory(); // Reload history
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
      setIsDeleting(false); // fetchHistory will reset isDeleting via another path usually, but let's be safe
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950 dark:via-[#0F172A] dark:to-purple-950 text-gray-900 dark:text-white p-8 transition-colors duration-300">
      <div className="max-w-[95%] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 dark:from-purple-400 dark:to-blue-400">
              {targetUserId === 'all' ? 'All QR Codes' : targetUserId ? 'User QR Codes' : 'My QR Codes'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">History of generated QR codes</p>
          </div>
          <div className="flex items-center gap-4">
            {selectedIds.length > 0 && (
              <button
                onClick={() => requestDelete(selectedIds)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors flex items-center font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
            >
              Back
            </button>
          </div>
        </div>

        {/* Datatable Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white dark:bg-white/5 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 backdrop-blur-xl">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search data, user, or format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-gray-900"
            />
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Showing {filteredLogs.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
          </div>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-6 transition-all duration-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading history...</div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 bg-white dark:bg-black/40"
                        onChange={handleSelectAll}
                        checked={paginatedLogs.length > 0 && selectedIds.length === paginatedLogs.length}
                      />
                    </th>
                    {targetUserId && <th className="px-6 py-4 font-semibold">User</th>}
                    <th className="px-6 py-4 font-semibold">Date & Time</th>
                    <th className="px-6 py-4 font-semibold">Data / URL</th>
                    <th className="px-6 py-4 font-semibold">Format</th>
                    <th className="px-6 py-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${selectedIds.includes(log.id) ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 bg-white dark:bg-black/40"
                          checked={selectedIds.includes(log.id)}
                          onChange={() => handleSelectOne(log.id)}
                        />
                      </td>
                      {targetUserId && (
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">{log.company_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{log.email}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(log.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-gray-900 dark:text-white" title={log.qr_text}>
                          {log.qr_text}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{log.format}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setSelectedQr(log)}
                            className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/60 text-purple-700 dark:text-purple-300 rounded shadow-sm transition-colors text-xs font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => requestDelete([log.id])}
                            disabled={isDeleting}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded shadow-sm transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedLogs.length === 0 && (
                    <tr>
                      <td colSpan={targetUserId ? "6" : "5"} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery ? "No matching records found." : "No QR codes generated yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <div className="flex space-x-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        currentPage === i + 1
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Popup Modal */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-gray-200 dark:border-white/10">
            <button 
              onClick={() => setSelectedQr(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white text-center">QR Code</h3>
            
            <div className="flex flex-col items-center space-y-4">
              <img src={selectedQr.qr_result} alt="Generated QR" className="w-48 h-48 rounded-lg shadow-md border border-gray-100 dark:border-white/5" />
              
              <div className="w-full text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Data</p>
                <p className="text-sm text-gray-900 dark:text-white break-all">{selectedQr.qr_text}</p>
              </div>

              <div className="w-full pt-4">
                <button
                  onClick={() => handleDownload(selectedQr)}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors shadow-lg flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl max-w-sm w-full p-8 shadow-2xl relative border border-gray-200 dark:border-white/10 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Confirm Deletion</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{confirmDialog.message}</p>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
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
  );
}
