import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import toast from 'react-hot-toast'
import axios from 'axios'
import api from '../lib/api'
import useAppStore from '../store/useAppStore'
import type { EmailRecipient } from '../store/useAppStore'

interface RecipientRow {
  id: string
  name: string
  email: string
  group_tag: string | null
  notes: string | null
}

function rowToRecipient(row: RecipientRow): EmailRecipient {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    groupTag: row.group_tag,
    notes: row.notes,
  }
}

function serverError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
  }
  return fallback
}

interface FormState { name: string; email: string; groupTag: string; notes: string }
const EMPTY_FORM: FormState = { name: '', email: '', groupTag: '', notes: '' }

export default function Recipients() {
  const { emailRecipients, setEmailRecipients, upsertEmailRecipient, removeEmailRecipient } = useAppStore(
    useShallow((s) => ({
      emailRecipients: s.emailRecipients,
      setEmailRecipients: s.setEmailRecipients,
      upsertEmailRecipient: s.upsertEmailRecipient,
      removeEmailRecipient: s.removeEmailRecipient,
    }))
  )

  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [editingId, setEditing] = useState<string | null>(null)
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    api.get<RecipientRow[]>('/api/recipients')
      .then(({ data }) => setEmailRecipients(data.map(rowToRecipient).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => toast.error('Failed to load recipients'))
      .finally(() => setLoading(false))
  }, [setEmailRecipients])

  const startAdd = () => { setAdding(true); setEditing(null); setForm(EMPTY_FORM) }
  const startEdit = (r: EmailRecipient) => {
    setEditing(r.id); setAdding(false)
    setForm({ name: r.name, email: r.email, groupTag: r.groupTag || '', notes: r.notes || '' })
  }
  const cancel = () => { setAdding(false); setEditing(null); setForm(EMPTY_FORM) }

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email required'); return }
    setSaving(true)
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      group_tag: form.groupTag.trim() || null,
      notes: form.notes.trim() || null,
    }
    try {
      if (editingId) {
        const { data } = await api.put<RecipientRow>(`/api/recipients/${editingId}`, body)
        upsertEmailRecipient(rowToRecipient(data))
        toast.success('Recipient updated')
      } else {
        const { data } = await api.post<RecipientRow>('/api/recipients', body)
        upsertEmailRecipient(rowToRecipient(data))
        toast.success('Recipient added')
      }
      cancel()
    } catch (err) {
      toast.error(serverError(err, 'Failed to save recipient'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r: EmailRecipient) => {
    if (!confirm(`Remove ${r.name} (${r.email})?`)) return
    try {
      await api.delete(`/api/recipients/${r.id}`)
      removeEmailRecipient(r.id)
      toast.success('Recipient removed')
    } catch {
      toast.error('Failed to remove recipient')
    }
  }

  const filtered = search
    ? emailRecipients.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
        || r.email.toLowerCase().includes(search.toLowerCase())
        || (r.groupTag || '').toLowerCase().includes(search.toLowerCase()))
    : emailRecipients

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the people you can send Gmail posts to. Add tags to group similar contacts.
          </p>
        </div>
        <button onClick={startAdd} className="btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0">
          + Add recipient
        </button>
      </div>

      {(adding || editingId) && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {editingId ? 'Edit recipient' : 'New recipient'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Group / tag <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                value={form.groupTag}
                onChange={(e) => setForm({ ...form, groupTag: e.target.value })}
                placeholder="investors, team, friends…"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. met at conf, prefers short updates"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-gradient text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add recipient'}
            </button>
            <button onClick={cancel} className="text-sm text-gray-500 hover:text-gray-700 px-2">Cancel</button>
          </div>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or tag…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 border-dashed rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500">
            {emailRecipients.length === 0
              ? 'No recipients yet. Add the first one to start sending Gmail posts.'
              : 'No recipients match your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {filtered.map((r) => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{r.name}</p>
                <p className="text-sm text-gray-500 truncate">{r.email}</p>
                {(r.groupTag || r.notes) && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {r.groupTag && (
                      <span className="text-[10px] font-medium uppercase tracking-wide bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">
                        {r.groupTag}
                      </span>
                    )}
                    {r.notes && <span className="text-xs text-gray-400 truncate">— {r.notes}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(r)} className="text-xs text-indigo-600 hover:underline px-2 py-1">Edit</button>
                <button onClick={() => remove(r)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
