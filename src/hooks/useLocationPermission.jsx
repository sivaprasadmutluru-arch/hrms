import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentCoords, getGeolocationPermissionState } from '../utils/geolocation'
import LocationPermissionModal from '../components/common/LocationPermissionModal'

const INITIAL = { phase: null, busy: false, reason: '' }

// Wraps geolocation access in an in-app permission flow (rationale screen -> native prompt, or
// a "here's how to fix it" screen on failure) instead of dropping the user straight into a raw
// browser error. Usage: const { requestCoords, LocationModal } = useLocationPermission(); render
// <LocationModal /> once, then `await requestCoords()` wherever getCurrentCoords() was used.
export function useLocationPermission() {
  const [modal, setModal] = useState(INITIAL)
  const resolverRef = useRef(null)

  const settle = useCallback((fn, value) => {
    setModal(INITIAL)
    resolverRef.current?.[fn]?.(value)
    resolverRef.current = null
  }, [])

  const waitForModal = useCallback(() => new Promise((resolve, reject) => {
    resolverRef.current = { resolve, reject }
  }), [])

  // Single source of truth for "try to get a location fix right now". Every failure — blocked
  // permission, OS position unavailable, timeout — routes through here so the user always lands
  // on the same actionable screen instead of a dead-end toast for some failure modes and a modal
  // for others.
  const attempt = useCallback(async () => {
    setModal((m) => ({ ...m, busy: true }))
    try {
      settle('resolve', await getCurrentCoords())
    } catch (message) {
      setModal({ phase: 'blocked', busy: false, reason: message })
    }
  }, [settle])

  const requestCoords = useCallback(() => {
    return getGeolocationPermissionState().then((state) => {
      if (state === 'unsupported') {
        return Promise.reject(window.isSecureContext === false
          ? 'This site is loaded over an insecure connection (http://), so browsers block location access. Ask your admin to serve HRMS over HTTPS.'
          : 'Location is not supported by this browser. Use a browser with location access enabled.')
      }
      // Permission being "granted" only means the site is allowed to ask — the actual fix can
      // still fail (OS location services off, no signal, timeout), so failures here go through
      // the same modal instead of leaving the caller with a bare, dead-end toast.
      if (state === 'granted') {
        return getCurrentCoords().catch((message) => {
          setModal({ phase: 'blocked', busy: false, reason: message })
          return waitForModal()
        })
      }
      setModal({
        phase: state === 'denied' ? 'blocked' : 'prompt',
        busy: false,
        reason: state === 'denied' ? 'Location access is blocked for this site.' : '',
      })
      return waitForModal()
    })
  }, [waitForModal])

  const handleCancel = useCallback(() => {
    settle('reject', 'Location access is required to clock in or out.')
  }, [settle])

  // While the "blocked" screen is showing, auto-retry the moment the user flips the browser's
  // per-site permission switch — mirrors how mobile apps detect a permission grant on resume.
  // This can't detect an OS-level Location Services fix (no browser event for that), which is
  // why there's also a manual retry button.
  useEffect(() => {
    if (modal.phase !== 'blocked' || modal.busy || !navigator.permissions?.query) return
    let status
    let cancelled = false
    navigator.permissions.query({ name: 'geolocation' }).then((s) => {
      if (cancelled) return
      status = s
      status.onchange = () => {
        if (status.state === 'granted') attempt()
      }
    })
    return () => {
      cancelled = true
      if (status) status.onchange = null
    }
  }, [modal.phase, modal.busy, attempt])

  const LocationModal = useCallback(() => (
    <LocationPermissionModal phase={modal.phase} busy={modal.busy} reason={modal.reason} onAllow={attempt} onRetry={attempt} onCancel={handleCancel} />
  ), [modal, attempt, handleCancel])

  return { requestCoords, LocationModal }
}
