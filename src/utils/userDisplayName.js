export function userDisplayName(user) {
  return [user?.firstName, user?.lastName].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()).join(' ')
    || user?.name || user?.username || user?.email || 'User'
}
