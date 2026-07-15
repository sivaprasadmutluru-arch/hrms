// A punch must include coordinates. Desktop geolocation can take several seconds, so retry once
// with lower accuracy before showing a useful error instead of silently recording an empty location.

// Chrome/Firefox refuse the Geolocation API entirely on insecure (http://) origins other than
// localhost — getCurrentPosition fails immediately with PERMISSION_DENIED and the native
// permission prompt never even appears, so callers need to distinguish that from a real denial.
export async function getGeolocationPermissionState() {
  if (!navigator.geolocation || window.isSecureContext === false) return 'unsupported'
  if (!navigator.permissions?.query) return 'prompt'
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'prompt'
  }
}

export function getCurrentCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Location is not supported by this browser. Use a browser with location access enabled.')
      return
    }

    const success = (pos) => resolve({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    })

    const fail = (error) => {
      const messages = {
        1: 'Location permission is required to clock in or out. Allow Location for this site and try again.',
        2: 'Your location is currently unavailable. Check Location Services or Wi-Fi and try again.',
        3: 'Getting your location timed out. Please try again.',
      }
      reject(messages[error?.code] || 'Unable to get your location. Please try again.')
    }

    // getCurrentPosition triggers the browser's native permission prompt automatically the first
    // time it's called for this site — no separate "request permission" step is needed.
    navigator.geolocation.getCurrentPosition(success, (firstError) => {
      if (firstError?.code === 1) {
        fail(firstError)
        return
      }
      navigator.geolocation.getCurrentPosition(success, fail, {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      })
    }, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    })
  })
}
