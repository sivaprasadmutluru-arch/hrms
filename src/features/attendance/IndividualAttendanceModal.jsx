import { Fragment } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import IndividualAttendanceView from './IndividualAttendanceView'

export default function IndividualAttendanceModal({
  open,
  onClose,
  employeeId,
  companyId,
  employeeName,
  employeeCode,
  allEmployees = [],
}) {
  if (!open || !employeeId) return null

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="glass-dialog-backdrop fixed inset-0 bg-black/50 backdrop-blur-xs" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="glass-dialog w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                {/* Modal Title bar */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base font-bold text-gray-900">
                      Attendance History
                    </DialogTitle>
                    {employeeName && (
                      <span className="text-sm text-gray-500 font-medium">
                        — {employeeName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Close dialog"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
                  <IndividualAttendanceView
                    employeeId={employeeId}
                    companyId={companyId}
                    employeeName={employeeName}
                    employeeCode={employeeCode}
                    allEmployees={allEmployees}
                    isModal={true}
                    onClose={onClose}
                  />
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
