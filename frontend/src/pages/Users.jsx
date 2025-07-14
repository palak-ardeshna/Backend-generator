import { useState } from 'react';
import { useGetUsersQuery, useDeleteUserMutation } from '../features/users/usersApi';
import ProfileAvatar from '../components/ProfileAvatar';
import UserForm from '../components/UserForm';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import './Users.css';

export default function Users() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const { data, error, isLoading, isFetching } = useGetUsersQuery({ page, limit });
  const [deleteUser] = useDeleteUserMutation();
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id).unwrap();
      } catch (err) {
        console.error('Failed to delete the user:', err);
      }
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error.data?.message || 'Failed to load users'}</div>;
  }

  const users = data?.data?.users || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="users-container">
      <div className="users-header">
        <h1>Users</h1>
        <button className="add-user-btn" onClick={handleAddNew}>
          <FaUserPlus /> Add User
        </button>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-avatar-cell">
                      <ProfileAvatar user={user} size={40} />
                    </div>
                  </td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.isAdmin ? 'Admin' : 'User'}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn" 
                        onClick={() => handleEdit(user)}
                        aria-label={`Edit ${user.username}`}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDelete(user.id)}
                        aria-label={`Delete ${user.username}`}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-users">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={page === 1 || isFetching} 
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button 
            disabled={page === totalPages || isFetching} 
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedUser ? 'Edit User' : 'Add New User'}</h2>
            <UserForm user={selectedUser} onClose={handleCloseModal} />
          </div>
        </div>
      )}
    </div>
  );
} 