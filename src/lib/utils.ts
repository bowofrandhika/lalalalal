// Utility functions

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatNumber(num: number, decimals = 2): string {
  return num.toFixed(decimals);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Generic
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-700',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-700',

    // Production
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    ON_HOLD: 'bg-yellow-100 text-yellow-800',
    SKIPPED: 'bg-gray-100 text-gray-600',

    // Issue
    IDENTIFIED: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    MONITORING: 'bg-blue-100 text-blue-800',
    REPORTED: 'bg-red-100 text-red-700',
    ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
    CLOSED: 'bg-gray-100 text-gray-600',

    // Pallet
    PACKED: 'bg-blue-100 text-blue-800',
    STAGED: 'bg-yellow-100 text-yellow-800',
    SHIPPED: 'bg-green-100 text-green-800',
    RELEASED: 'bg-green-100 text-green-800',

    // Maintenance
    PLANNED: 'bg-gray-100 text-gray-700',
    OVERDUE: 'bg-red-100 text-red-700',

    // Severity / Priority
    LOW: 'bg-gray-100 text-gray-600',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-700',

    // Quality
    PASSED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-700',
    CONDITIONAL: 'bg-yellow-100 text-yellow-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    VERIFIED: 'bg-green-100 text-green-800',
    OPEN: 'bg-yellow-100 text-yellow-800',
    IMPLEMENTED: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-yellow-100 text-yellow-800',

    // Severity
    MINOR: 'bg-yellow-100 text-yellow-700',
    MAJOR: 'bg-orange-100 text-orange-800',
  };

  return colors[status] || 'bg-gray-100 text-gray-600';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
