import React from 'react';
import { Button } from './UIComponents';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title,
  children,
  footer,
  size = 'md',
  className = '',
}) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div
        className={`bg-white rounded-3xl shadow-2xl ${sizes[size]} w-full max-h-[90vh] overflow-y-auto animate-slide-up ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 justify-end p-6 border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="flex-1"
        >
          {cancelText}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          className="flex-1"
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export const DataTable = ({ 
  columns, 
  data,
  loading = false,
  onRowClick = null,
  actions = null,
  pagination = null,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="inline-block">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>
        <p className="text-gray-600 mt-4">Loading data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  {col.label}
                </th>
              ))}
              {actions && <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-6 py-4 text-sm text-gray-700"
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.lastPage}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => pagination.onPreviousPage?.()}
              disabled={pagination.currentPage === 1}
            >
              ← Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => pagination.onNextPage?.()}
              disabled={pagination.currentPage === pagination.lastPage}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const StatCard = ({ 
  title, 
  value, 
  icon,
  trend = null,
  color = 'blue',
  className = '',
}) => {
  const colors = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-green-600 to-green-700',
    red: 'from-red-600 to-red-700',
    purple: 'from-purple-600 to-purple-700',
    orange: 'from-orange-600 to-orange-700',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-3xl p-6 text-white shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold opacity-90">{title}</h3>
        {icon && <span className="text-4xl opacity-80">{icon}</span>}
      </div>
      <p className="text-4xl font-bold mb-2">{value}</p>
      {trend && typeof trend === 'object' && (
        <div className={`text-sm ${trend.positive ? 'text-green-200' : 'text-red-200'}`}>
          {trend.positive ? '↑' : '↓'} {trend.value}% from last month
        </div>
      )}
      {trend && typeof trend === 'string' && (
        <div className="text-sm text-white/80">{trend}</div>
      )}
    </div>
  );
};

export const EmptyState = ({ 
  icon = '📭',
  title = 'No data',
  description = 'There is nothing to display',
  action = null,
}) => {
  return (
    <div className="text-center py-12">
      <p className="text-6xl mb-4">{icon}</p>
      <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action && action}
    </div>
  );
};
