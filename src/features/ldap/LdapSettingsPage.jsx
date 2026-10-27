import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchLdapSettings, saveLdapSettings, selectLdapSettings, selectLdapLoading } from './ldapSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function LdapSettingsPage() {
  const dispatch = useDispatch()
  const settings = useSelector(selectLdapSettings)
  const loading = useSelector(selectLdapLoading)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchLdapSettings()) }, [dispatch])

  useEffect(() => {
    if (settings) {
      reset({
        ldapServer: settings.ldapServer,
        bindDn: settings.bindDn,
        bindPassword: settings.bindPassword,
        baseDn: settings.baseDn,
      })
    }
  }, [settings, reset])

  const onSubmit = async (data) => {
    try {
      await dispatch(saveLdapSettings(data)).unwrap()
      toast.success('LDAP settings saved')
    } catch (e) { toast.error(e || 'Failed to save') }
  }

  return (
    <div className="admin-settings-workspace">
      <PageHeader title="LDAP Settings" subtitle="Configure LDAP / Active Directory integration" />

      <div className="admin-settings-panel max-w-2xl bg-white rounded-xl border border-gray-200 p-6">
        <div className="admin-settings-form">
          <Input
            label="LDAP Server"
            placeholder="ldap://example.com:389"
            error={errors.ldapServer?.message}
            {...register('ldapServer', { required: 'Required' })}
          />
          <Input
            label="Bind DN"
            placeholder="cn=admin,dc=example,dc=com"
            error={errors.bindDn?.message}
            {...register('bindDn', { required: 'Required' })}
          />
          <Input
            label="Bind Password"
            type="password"
            {...register('bindPassword')}
          />
          <Input
            label="Base DN"
            placeholder="dc=example,dc=com"
            error={errors.baseDn?.message}
            {...register('baseDn', { required: 'Required' })}
          />
          <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
            Save LDAP Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
