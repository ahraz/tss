import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { UserRole } from '../types';

export function useRoleGuard(allowedRoles: UserRole[], redirectTo = '/'): boolean {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  const isAllowed = currentUser ? allowedRoles.includes(currentUser.role) : false;

  useEffect(() => {
    if (currentUser && !isAllowed) {
      navigate(redirectTo, { replace: true });
    }
  }, [currentUser, isAllowed, navigate, redirectTo]);

  return isAllowed;
}
