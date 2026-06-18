import {
  LayoutDashboard, Clock, ClipboardList, Building2, User,
  CalendarDays, Briefcase, FileText, Users, Package,
  AlertTriangle, ClipboardCheck, DollarSign, Banknote,
  BarChart3, CheckSquare, Settings,
  type LucideIcon
} from 'lucide-react';

export interface NavLinkDef {
  to: string;
  icon: LucideIcon;
  label: string;
  /** If omitted, any logged-in user can see it */
  roles?: ('owner' | 'partner')[];
  /** Set for links that should show in the bottom "More" drawer only */
  mobileOnly?: boolean;
  /** Set for links that should show in the persistent bottom bar */
  mobileBar?: boolean;
}

/** Single source of truth for all navigation links */
export const allNavLinks: NavLinkDef[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', mobileBar: true },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/clock', icon: Clock, label: 'Clock In/Out', mobileBar: true },
  { to: '/shifts', icon: ClipboardList, label: 'Shifts', mobileBar: true },
  { to: '/sites', icon: Building2, label: 'Sites', mobileBar: true },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule', roles: ['owner', 'partner'] },
  { to: '/clients', icon: Briefcase, label: 'Clients', roles: ['owner', 'partner'] },
  { to: '/quotes', icon: FileText, label: 'Quotes', roles: ['owner', 'partner'] },
  { to: '/team', icon: Users, label: 'Team', roles: ['owner', 'partner'] },
  { to: '/inventory', icon: Package, label: 'Inventory', roles: ['owner', 'partner'] },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents', roles: ['owner', 'partner'] },
  { to: '/inspections', icon: ClipboardCheck, label: 'Inspections', roles: ['owner', 'partner'] },
  { to: '/money', icon: DollarSign, label: 'Money Book', roles: ['owner', 'partner'] },
  { to: '/payroll', icon: Banknote, label: 'Payroll', roles: ['owner', 'partner'] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['owner', 'partner'] },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['owner'] },
];

/** Filter links for a given user role */
export function linksForRole(isOwnerOrPartner: boolean, isOwner: boolean, role: string | undefined) {
  return allNavLinks.filter((link) => {
    if (!link.roles) return true;
    if (isOwner && link.roles.includes('owner')) return true;
    if (isOwnerOrPartner && link.roles.includes('partner')) return true;
    return false;
  });
}
