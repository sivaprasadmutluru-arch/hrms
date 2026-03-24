import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <DialogPanel className={`w-full ${sizes[size]} bg-white rounded-2xl shadow-xl overflow-hidden`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <DialogTitle className="text-base font-semibold text-gray-900">{title}</DialogTitle>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><XMarkIcon className="h-5 w-5" /></button>
                </div>
                <div className="px-6 py-4">{children}</div>
                {footer && <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">{footer}</div>}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
