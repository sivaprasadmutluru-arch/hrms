import { useState } from 'react'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import Button from '../../components/common/Button'

export default function TagsSettingsSection({ title, tags, companyId, onCreate, onUpdate, onDelete }) {
  const dispatch = useDispatch()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#6366f1')

  const handleCreate = async () => {
    if (!newName.trim()) return
    const res = await dispatch(onCreate({ name: newName.trim(), color: newColor, company: { id: companyId } }))
    if (res.error) { toast.error(res.payload); return }
    toast.success('Tag created')
    setNewName('')
    setNewColor('#6366f1')
  }

  const startEdit = (tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color || '#6366f1')
  }

  const handleUpdate = async (tag) => {
    const res = await dispatch(onUpdate({ id: tag.id, data: { name: editName, color: editColor, company: { id: companyId } } }))
    if (res.error) { toast.error(res.payload); return }
    toast.success('Tag updated')
    setEditingId(null)
  }

  const handleDelete = async (id) => {
    const res = await dispatch(onDelete(id))
    if (res.error) toast.error(res.payload)
    else toast.success('Tag deleted')
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map(tag => (
          <div key={tag.id}>
            {editingId === tag.id ? (
              <div className="flex items-center gap-1 border border-gray-300 rounded-full px-2 py-0.5">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="text-xs w-20 outline-none bg-transparent"
                />
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0" />
                <button onClick={() => handleUpdate(tag)} className="text-xs text-green-600 font-medium">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">✕</button>
              </div>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white cursor-pointer group"
                style={{ backgroundColor: tag.color || '#6366f1' }}
              >
                {tag.name}
                <button onClick={() => startEdit(tag)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 hover:text-white">✎</button>
                <button onClick={() => handleDelete(tag.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 hover:text-white">✕</button>
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New tag name"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-300"
        />
        <Button size="sm" onClick={handleCreate}>Add Tag</Button>
      </div>
    </div>
  )
}
