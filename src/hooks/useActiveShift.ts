import { useApp } from '../context/AppContext';
import type { Shift } from '../types';

export function useActiveShift(): Shift | null {
  const { state, currentUser } = useApp();
  if (!currentUser) return null;
  return state.shifts.find(
    s => s.userId === currentUser.id && s.status === 'active'
  ) ?? null;
}
