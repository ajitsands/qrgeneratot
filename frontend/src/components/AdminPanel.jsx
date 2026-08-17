import React, { useState, useEffect } from 'react';

export default function AdminPanel({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('api/admin.php', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('qr_token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch users');
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateLimit = async (userId, newLimit) => {
    try {
      const response = await fetch('api/admin.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qr_token')}`
        },
        body: JSON.stringify({ user_id: userId, limit: newLimit })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update limit');
      alert('Limit updated successfully!');
      fetchUsers(); // Refresh list
    } catch (err) {
      alert('Error updating limit: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 dark:from-purple-400 dark:to-blue-400">
              Admin Panel
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage Users & QR Code Limits</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading users...</div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Company / Name</th>
                    <th className="px-6 py-4 font-semibold">Contact</th>
                    <th className="px-6 py-4 font-semibold">Domain</th>
                    <th className="px-6 py-4 font-semibold text-center">QR Count</th>
                    <th className="px-6 py-4 font-semibold text-center">QR Limit</th>
                    <th className="px-6 py-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{user.company_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email} {user.is_admin ? '(Admin)' : ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{user.contact_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.mobile}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{user.domain_name}</td>
                      <td className="px-6 py-4 text-center font-mono">{user.qr_generated_count}</td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          min="0"
                          defaultValue={user.qr_limit}
                          id={`limit-${user.id}`}
                          className="w-20 px-2 py-1 rounded bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/20 text-center text-gray-900 dark:text-white"
                          title="0 means unlimited"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            const val = document.getElementById(`limit-${user.id}`).value;
                            updateLimit(user.id, val ? parseInt(val, 10) : 0);
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded shadow transition-colors text-xs font-medium"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
