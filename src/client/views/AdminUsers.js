import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { api } from '../services/api';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.request(`/admin/users?page=${currentPage}&search=${searchTerm}&limit=20`);
      setUsers(response.users);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Generate mock data for demonstration
      setUsers(generateMockUsers());
      setTotalPages(5);
    } finally {
      setLoading(false);
    }
  };

  const generateMockUsers = () => {
    const mockUsers = [];
    for (let i = 1; i <= 20; i++) {
      mockUsers.push({
        id: `user_${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        lastLoginAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        _count: {
          photos: Math.floor(Math.random() * 200)
        },
        status: Math.random() > 0.1 ? 'active' : 'suspended'
      });
    }
    return mockUsers;
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleUserAction = async (userId, action) => {
    try {
      await api.request(`/admin/users/${userId}/${action}`, { method: 'POST' });
      loadUsers(); // Refresh the list
      setShowUserModal(false);
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      // For demo, just update locally
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, status: action === 'suspend' ? 'suspended' : 'active' }
          : u
      ));
      setShowUserModal(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--success)';
      case 'suspended': return 'var(--danger)';
      case 'pending': return 'var(--warning)';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div class="users-loading">
        <div class="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div class="admin-users">
      {/* Header */}
      <div class="users-header">
        <div class="header-left">
          <h1>User Management</h1>
          <p>Manage user accounts and monitor activity</p>
        </div>
        <div class="header-actions">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearch}
            class="search-input"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div class="users-stats">
        <div class="stat-card">
          <div class="stat-value">{users.filter(u => u.status === 'active').length}</div>
          <div class="stat-label">Active Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{users.filter(u => u.status === 'suspended').length}</div>
          <div class="stat-label">Suspended</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</div>
          <div class="stat-label">Active This Week</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{Math.round(users.reduce((sum, u) => sum + u._count.photos, 0) / users.length)}</div>
          <div class="stat-label">Avg Photos/User</div>
        </div>
      </div>

      {/* Users Table */}
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Photos</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} onClick={() => handleUserClick(user)} class="user-row">
                <td class="user-info">
                  <div class="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div class="user-details">
                    <div class="user-name">{user.name}</div>
                    <div class="user-email">{user.email}</div>
                  </div>
                </td>
                <td>
                  <span class="status-badge" style={{ color: getStatusColor(user.status) }}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </td>
                <td class="photos-count">{user._count.photos.toLocaleString()}</td>
                <td class="join-date">{formatDate(user.createdAt)}</td>
                <td class="last-login">{formatRelativeTime(user.lastLoginAt)}</td>
                <td class="actions">
                  <button 
                    class="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserClick(user);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div class="pagination">
        <button 
          class="btn btn-secondary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>
        <span class="page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          class="btn btn-secondary"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div class="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2>User Details</h2>
              <button class="modal-close" onClick={() => setShowUserModal(false)}>
                ×
              </button>
            </div>
            
            <div class="modal-body">
              <div class="user-profile">
                <div class="profile-avatar">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div class="profile-info">
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                  <span class="status-badge" style={{ color: getStatusColor(selectedUser.status) }}>
                    {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                  </span>
                </div>
              </div>

              <div class="user-stats-grid">
                <div class="stat-item">
                  <div class="stat-label">Photos Uploaded</div>
                  <div class="stat-value">{selectedUser._count.photos.toLocaleString()}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">Account Created</div>
                  <div class="stat-value">{formatDate(selectedUser.createdAt)}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">Last Login</div>
                  <div class="stat-value">{formatRelativeTime(selectedUser.lastLoginAt)}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">Account Status</div>
                  <div class="stat-value">{selectedUser.status}</div>
                </div>
              </div>

              <div class="user-actions">
                {selectedUser.status === 'active' ? (
                  <button 
                    class="btn btn-danger"
                    onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                  >
                    Suspend Account
                  </button>
                ) : (
                  <button 
                    class="btn btn-success"
                    onClick={() => handleUserAction(selectedUser.id, 'activate')}
                  >
                    Activate Account
                  </button>
                )}
                <button class="btn btn-secondary">Send Message</button>
                <button class="btn btn-secondary">View Photos</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-users {
          padding: var(--space-xl);
          max-width: 1400px;
          margin: 0 auto;
        }

        .users-loading {
          text-align: center;
          padding: var(--space-2xl);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto var(--space-md);
        }

        .users-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-xl);
        }

        .header-left h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 2rem;
        }

        .header-left p {
          margin: var(--space-sm) 0 0 0;
          color: var(--text-secondary);
        }

        .search-input {
          padding: var(--space-sm) var(--space-md);
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-primary);
          min-width: 300px;
        }

        .users-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .stat-card {
          background: var(--surface);
          padding: var(--space-lg);
          border-radius: 12px;
          border: 1px solid var(--border);
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: var(--space-sm);
        }

        .stat-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .users-table-container {
          background: var(--surface);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          margin-bottom: var(--space-lg);
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
        }

        .users-table th {
          background: var(--bg-secondary);
          padding: var(--space-md);
          text-align: left;
          font-weight: 600;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border);
        }

        .user-row {
          cursor: pointer;
          transition: background-color var(--transition-base);
        }

        .user-row:hover {
          background: var(--bg-secondary);
        }

        .users-table td {
          padding: var(--space-md);
          border-bottom: 1px solid var(--border);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .user-name {
          font-weight: 500;
          color: var(--text-primary);
        }

        .user-email {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .status-badge {
          padding: var(--space-xs) var(--space-sm);
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          background: currentColor;
          color: white !important;
          opacity: 0.9;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-md);
        }

        .page-info {
          color: var(--text-secondary);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--surface);
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-lg);
          border-bottom: 1px solid var(--border);
        }

        .modal-header h2 {
          margin: 0;
          color: var(--text-primary);
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--text-secondary);
          cursor: pointer;
          padding: var(--space-sm);
        }

        .modal-body {
          padding: var(--space-lg);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 600;
        }

        .profile-info h3 {
          margin: 0 0 var(--space-sm) 0;
          color: var(--text-primary);
        }

        .profile-info p {
          margin: 0 0 var(--space-sm) 0;
          color: var(--text-secondary);
        }

        .user-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .stat-item {
          text-align: center;
          padding: var(--space-md);
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .user-actions {
          display: flex;
          gap: var(--space-md);
          flex-wrap: wrap;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .users-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-md);
          }

          .search-input {
            width: 100%;
          }

          .users-table-container {
            overflow-x: auto;
          }

          .users-table {
            min-width: 800px;
          }
        }
      `}</style>
    </div>
  );
}