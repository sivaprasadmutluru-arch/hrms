import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import { sendLetterEmail } from './documentsSlice'
import { DocumentTextIcon, PaperClipIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export default function SendLetterEmailModal({ open, onClose, letter, onSuccess }) {
  const dispatch = useDispatch()
  const [sending, setSending] = useState(false)
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  useEffect(() => {
    if (!open || !letter) return

    const typeNames = {
      OFFER_LETTER: 'Job Offer Letter',
      EXPERIENCE_CERTIFICATE: 'Experience Certificate',
      RELIEVING_LETTER: 'Relieving Letter',
    }

    const typeName = typeNames[letter.letterType] || 'Official Document'
    const companyName = letter.company?.name || 'AccrueHR'

    setValue('to', letter.recipientEmail || '')
    setValue('subject', `${typeName} - ${letter.recipientName || ''} (Ref: ${letter.referenceNumber || ''})`)
    setValue('message', `Dear ${letter.recipientName || 'Candidate/Employee'},\n\nPlease find attached your official ${typeName} from ${companyName}.\n\nIf you have any questions or require further clarification, please feel free to reach out to the Human Resources department.`)
  }, [open, letter, setValue])

  const onSubmit = async (data) => {
    if (!letter?.id) return
    setSending(true)
    try {
      const result = await dispatch(sendLetterEmail({
        id: letter.id,
        to: data.to,
        subject: data.subject,
        message: data.message,
      })).unwrap()

      if (result.data?.success) {
        toast.success(result.data.message || 'Email sent successfully with PDF attachment!')
      } else {
        toast.error(result.data?.message || 'Email sending failed (check SMTP settings)')
      }

      if (onSuccess) onSuccess()
      onClose()
      reset()
    } catch (err) {
      toast.error(err || 'Failed to dispatch email')
    } finally {
      setSending(false)
    }
  }

  const safeRef = (letter?.referenceNumber || 'DOC').replace(/[^a-zA-Z0-9.-]/g, '_')
  const attachmentFilename = `${letter?.letterType || 'LETTER'}_${safeRef}.pdf`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Document via Email"
      size="lg"
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={sending}>
            Send Email & Attachment
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-900 leading-relaxed">
            This will send an email with the generated <strong>PDF document attached</strong> directly to the recipient using your company SMTP configuration.
          </div>
        </div>

        <Input
          label="Recipient Email"
          type="email"
          placeholder="candidate@example.com"
          error={errors.to?.message}
          {...register('to', {
            required: 'Recipient email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email address',
            },
          })}
        />

        <Input
          label="Email Subject"
          placeholder="Job Offer Letter - Acme Corp"
          error={errors.subject?.message}
          {...register('subject', { required: 'Subject is required' })}
        />

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Email Message / Cover Note
          </label>
          <textarea
            rows={4}
            className="block w-full rounded-xl border border-gray-300 shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 bg-white"
            placeholder="Write a message to the recipient..."
            {...register('message')}
          />
        </div>

        {/* Attachment Card */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Attached Document
          </label>
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {attachmentFilename}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <PaperClipIcon className="w-3.5 h-3.5" />
                <span>Official Generated PDF • Ready to dispatch</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
