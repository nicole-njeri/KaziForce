export const apiHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })
export const formatBudget = (value) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? '' : new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(value))
export const splitTags = (value) => Array.isArray(value) ? value : String(value || '').split(/[,;\n]/).map((tag) => tag.trim()).filter(Boolean)
export const readAccount = () => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } }
