export const canAccessOrganizerDashboard = (user) => Boolean(
  user && (
    user.can_access_organizer_dashboard ||
    user.role === 'organizer' ||
    user.role === 'admin' ||
    user.is_staff
  )
);

export const isCheckinOnlyUser = (user) => Boolean(
  user && !canAccessOrganizerDashboard(user) && (
    user.role === 'checkin' ||
    user.role === 'staff' ||
    user.restrict_dashboard_to_assigned_events
  )
);
