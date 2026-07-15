import { MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Modal from './Modal'

// The OS-level "location services" fix lives in a different place on every platform, so the
// blocked-screen instructions need to match the device the employee is actually punching in
// from — a Mac System Settings path is useless noise on an Android phone.
function detectPlatform() {
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Mac/i.test(navigator.platform)) return 'mac'
  if (/Win/i.test(navigator.platform)) return 'windows'
  return 'other'
}

const LOCATION_SERVICES_HELP = {
  android: "Open your phone's Settings → Location and turn it on, then Settings → Apps → your browser → Permissions → Location, and set it to Allow.",
  ios: 'Open Settings → Privacy & Security → Location Services, turn it on, then find your browser in the list below and set it to "While Using the App".',
  mac: 'macOS can block location for the whole browser even when the site is allowed. Go to System Settings → Privacy & Security → Location Services, turn it on, and make sure your browser is checked in the list.',
  windows: 'Go to Settings → Privacy & security → Location, turn on "Location services", and make sure your browser is allowed to access it.',
  other: "Check your device's location settings and make sure this browser is allowed to use them.",
}

// Mirrors the permission flow mobile apps use: a rationale screen before the native prompt, and
// a "here's how to fix it" screen for any failure after that — blocked site permission, OS
// location services off, or no signal. Browsers won't let a page distinguish these precisely or
// deep-link into OS/browser settings, so the fix screen just lists every place location can be
// blocked and lets the specific error message (top) narrow it down. The per-site case still
// auto-advances via the caller's Permissions-API `onchange` listener; the others need the
// manual retry since there's no browser event for an OS Location Services change.
export default function LocationPermissionModal({ phase, busy, reason, onAllow, onRetry, onCancel }) {
  const open = phase === 'prompt' || phase === 'blocked'
  const isBlocked = phase === 'blocked'
  const platform = detectPlatform()
  const isTouch = platform === 'android' || platform === 'ios'

  return (
    <Modal open={open} onClose={onCancel} title="Location Access Required" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isBlocked ? 'bg-red-50' : 'bg-indigo-50'}`}>
            {isBlocked
              ? <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              : <MapPinIcon className="h-5 w-5 text-indigo-600" />}
          </div>
          <p className="text-sm text-gray-600">
            {isBlocked
              ? (reason || "We couldn't get your location, so we can't record where you clock in and out.")
              : 'HRMS Pro needs your location to record where you clock in and out. Your browser will ask you to confirm.'}
          </p>
        </div>

        {isBlocked && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-3">
            <div>
              <p className="font-medium text-gray-800">1. Site permission</p>
              <p>
                {isTouch ? 'Tap' : 'Click'} the lock or info icon next to the address bar and set "Location" to Allow.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">2. Your device's location settings</p>
              <p>{LOCATION_SERVICES_HELP[platform]}</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">3. Connection</p>
              <p>{platform === 'android' || platform === 'ios' ? 'Make sure Wi-Fi or mobile data is on for a faster, more accurate fix.' : 'Make sure Wi-Fi is on — desktop browsers use it to estimate your position.'}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          {isBlocked ? (
            <button
              onClick={onRetry}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {busy ? 'Checking…' : 'Try again'}
            </button>
          ) : (
            <button
              onClick={onAllow}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {busy ? 'Requesting…' : 'Allow Location'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
