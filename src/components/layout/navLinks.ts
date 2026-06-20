import {
  LayoutDashboard, Clock, ClipboardList, Building2, User,
  CalendarDays, Briefcase, FileText, Users, Package,
  AlertTriangle, ClipboardCheck, DollarSign, Banknote,
  BarChart3, CheckSquare, PhoneCall,
  type LucideIcon
} from 'lucide-react';

export type NavSection = 'main' | 'management' | 'operations' | 'sales';

export interface NavLinkDef {
  to: string;
  icon: LucideIcon;
  label: string;
  section: NavSection;
  /** If omitted, any logged-in user can see it */
  roles?: ('owner' | 'partner')[];
  /** Set for links that should show in the persistent bottom bar */
  mobileBar?: boolean;
}

export const sectionLabels: Record<NavSection, string> = {
  main: 'Main',
  management: 'Management',
  operations: 'Operations',
  sales: 'Sales',
};

/** Single source of truth for all navigation links */
export const allNavLinks: NavLinkDef[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'main', mobileBar: true },
  { to: '/profile', icon: User, label: 'My Profile', section: 'main' },
  { to: '/clock', icon: Clock, label: 'Clock In/Out', section: 'main', mobileBar: true },
  { to: '/shifts', icon: ClipboardList, label: 'Shifts', section: 'main', mobileBar: true },
  { to: '/sites', icon: Building2, label: 'Sites', section: 'main', mobileBar: true },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule', section: 'management', roles: ['owner', 'partner'] },
  { to: '/clients', icon: Briefcase, label: 'Clients', section: 'management', roles: ['owner', 'partner'] },
  { to: '/quotes', icon: FileText, label: 'Quotes', section: 'management', roles: ['owner', 'partner'] },
  { to: '/team', icon: Users, label: 'Team', section: 'management', roles: ['owner', 'partner'] },
  { to: '/inventory', icon: Package, label: 'Inventory', section: 'management', roles: ['owner', 'partner'] },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents', section: 'operations', roles: ['owner', 'partner'] },
  { to: '/inspections', icon: ClipboardCheck, label: 'Inspections', section: 'operations', roles: ['owner', 'partner'] },
  { to: '/money', icon: DollarSign, label: 'Money Book', section: 'operations', roles: ['owner', 'partner'] },
  { to: '/payroll', icon: Banknote, label: 'Payroll', section: 'operations', roles: ['owner', 'partner'] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', section: 'operations', roles: ['owner', 'partner'] },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks', section: 'main' },
  { to: '/leads', icon: PhoneCall, label: 'Leads', section: 'sales', roles: ['owner'] },
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

/** Returns a map of section → links for a given role */
export function groupedLinks(isOwnerOrPartner: boolean, isOwner: boolean, role: string | undefined) {
  const links = linksForRole(isOwnerOrPartner, isOwner, role);
  const grouped = new Map<NavSection, NavLinkDef[]>();
  for (const link of links) {
    if (!grouped.has(link.section)) grouped.set(link.section, []);
    grouped.get(link.section)!.push(link);
  }
  return grouped;
}
