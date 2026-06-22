import Input from '../../components/common/Input'

/**
 * Machine-type-aware form sections for a BiometricDevice.
 *
 * The ZKTeco ADMS push protocol requires a Serial Number — so for the ZK machine
 * type it is the headline, highlighted field. Other machine types surface only the
 * connection fields relevant to that vendor.
 *
 * Uses react-hook-form `register`. The parent owns the form state.
 */
export default function DeviceFormFields({ register, errors, machineType }) {
  const type = (machineType || 'ZK').toUpperCase()

  return (
    <div className="space-y-6">
      {/* ── Identification ───────────────────────────────────────── */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Identification</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Device Name"
            error={errors.name?.message}
            placeholder="e.g. Head Office — Main Door"
            {...register('name', { required: 'Device name is required' })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Type</label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              {...register('machineType')}
            >
              <option value="ZK">ZKTeco (ZK)</option>
              <option value="ANVIZ">Anviz</option>
              <option value="COSEC">COSEC</option>
              <option value="DAHUA">Dahua</option>
              <option value="ETIMEOFFICE">eTimeOffice</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── ZKTeco ADMS Push (headline for ZK) ───────────────────── */}
      {type === 'ZK' && (
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-indigo-900">ADMS Push Configuration</h4>
              <p className="text-xs text-indigo-700/80 mt-0.5">
                The device pushes attendance to <code className="px-1 py-0.5 bg-white/70 rounded font-mono text-[11px]">/iclock/cdata?SN=&lt;Serial&gt;</code>.
                Enter the exact serial number printed on the device.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Serial Number"
              error={errors.serialNumber?.message}
              placeholder="e.g. CPV2232560166"
              helperText="Matches the SN the device sends. Required for push."
              className="border-indigo-200"
              {...register('serialNumber', { required: type === 'ZK' ? 'Serial number is required for ZK devices' : false })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Punch Direction</label>
              <select
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                {...register('deviceDirection')}
              >
                <option value="SYSTEM">System (auto — recommended)</option>
                <option value="ALTERNATE">Alternate (1st IN, 2nd OUT…)</option>
                <option value="IN">All punches = IN</option>
                <option value="OUT">All punches = OUT</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">How punches map to IN / OUT</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Network (ZK SDK pull mode) ───────────────────────────── */}
      {type === 'ZK' && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Network (optional — SDK pull mode)
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Only needed if you poll the device over LAN in addition to ADMS push. Leave blank to rely on push only.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Machine IP" placeholder="192.168.1.201" {...register('machineIp')} />
            <Input label="Port" type="number" placeholder="4370" {...register('port')} />
            <Input label="ZK Password" type="password" placeholder="••••" {...register('zkPassword')} />
          </div>
        </section>
      )}

      {/* ── ANVIZ ────────────────────────────────────────────────── */}
      {type === 'ANVIZ' && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Anviz Cloud</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Anviz Request ID" placeholder="CrossChex request id" {...register('anvizRequestId')} />
            <Input label="Serial Number" helperText="Device serial (if applicable)" {...register('serialNumber')} />
            <Input label="API URL" placeholder="https://api.anviz.com/..." {...register('apiUrl')} />
            <Input label="API Token" {...register('apiToken')} />
            <Input label="API Key" {...register('apiKey')} />
            <Input label="API Secret" {...register('apiSecret')} />
          </div>
        </section>
      )}

      {/* ── COSEC ────────────────────────────────────────────────── */}
      {type === 'COSEC' && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">COSEC (Matrix)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Machine IP" placeholder="192.168.1.50" {...register('machineIp')} />
            <Input label="Port" type="number" placeholder="8080" {...register('port')} />
            <Input label="Bio Username" {...register('bioUsername')} />
            <Input label="Bio Password" type="password" {...register('bioPassword')} />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            COSEC attendance arguments are configured separately on the device record after saving.
          </p>
        </section>
      )}

      {/* ── DAHUA ────────────────────────────────────────────────── */}
      {type === 'DAHUA' && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Dahua</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Machine IP" placeholder="192.168.1.108" {...register('machineIp')} />
            <Input label="Port" type="number" placeholder="80" {...register('port')} />
            <Input label="Bio Username" {...register('bioUsername')} />
            <Input label="Bio Password" type="password" {...register('bioPassword')} />
          </div>
        </section>
      )}

      {/* ── eTimeOffice ──────────────────────────────────────────── */}
      {type === 'ETIMEOFFICE' && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">eTimeOffice</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="API URL" placeholder="https://app.etimeoffice.com/..." {...register('apiUrl')} />
            <Input label="API Key" {...register('apiKey')} />
            <Input label="API Secret" {...register('apiSecret')} />
            <Input label="API Token" {...register('apiToken')} />
            <Input label="Token Expires" type="date" {...register('apiExpires')} />
          </div>
        </section>
      )}

      {/* ── Scheduling & status ──────────────────────────────────── */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Automation</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Scheduler Duration (minutes)"
            type="number"
            placeholder="15"
            helperText="Polling interval, if scheduler enabled"
            {...register('schedulerDuration')}
          />
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" {...register('isLive')} />
              Live mode
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" {...register('isScheduler')} />
              Scheduler
            </label>
          </div>
        </div>
      </section>
    </div>
  )
}
