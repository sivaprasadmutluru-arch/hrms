// Keep the menu's visibility rules aligned with the existing row actions.
export function leaveRequestActions(request, canDeleteCancelledLeave) {
  const actions = []
  if (request.status === 'REQUESTED' && request.canReview) actions.push('approve', 'reject')
  actions.push('details')
  if (request.status === 'REQUESTED') actions.push('edit')
  if (['REQUESTED', 'APPROVED'].includes(request.status)) actions.push('cancel')
  if (canDeleteCancelledLeave && request.status === 'CANCELLED') actions.push('delete')
  return actions
}
