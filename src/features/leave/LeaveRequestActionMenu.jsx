import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { leaveRequestActions } from './leaveRequestActions'

const labels = { approve: 'Approve leave', reject: 'Reject leave', details: 'Details', edit: 'Edit request', cancel: 'Cancel leave', delete: 'Delete permanently' }

export default function LeaveRequestActionMenu({ request, canDeleteCancelledLeave, onAction }) {
  return <Menu as="div" className="inline-flex" onClick={event => event.stopPropagation()}>
    <MenuButton aria-label={`Actions for ${request.employeeName || 'employee'} leave request`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 data-open:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
      <PlusIcon className="h-5 w-5" aria-hidden="true" />
    </MenuButton>
    <MenuItems anchor="bottom start" portal
      className="z-[60] w-52 max-h-[80vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg focus:outline-none [--anchor-gap:6px]">
      {leaveRequestActions(request, canDeleteCancelledLeave).map(action => <MenuItem key={action}>
        <button type="button" onClick={event => { event.stopPropagation(); onAction(action) }}
          className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium data-focus:bg-gray-100 ${action === 'approve' ? 'text-emerald-700' : ['reject', 'delete'].includes(action) ? 'text-red-700' : 'text-gray-700'}`}>
          {labels[action]}
        </button>
      </MenuItem>)}
    </MenuItems>
  </Menu>
}
