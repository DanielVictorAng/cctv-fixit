'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck } from 'lucide-react'

import { dispatchTicket } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'

export type TechOption = { id: string; full_name: string }

export function TechAssignment({
  ticketId,
  availableTechs,
  onDone,
}: {
  ticketId: string
  availableTechs: TechOption[]
  onDone?: () => void
}) {
  const router = useRouter()
  const [techId, setTechId] = useState('')
  const [pending, setPending] = useState(false)

  async function handleAssign() {
    if (!techId) {
      toast({ title: 'Choose a technician', variant: 'destructive' })
      return
    }
    setPending(true)
    try {
      const result = await dispatchTicket({ ticket_id: ticketId, assigned_tech_id: techId })
      if (!result.success) {
        toast({ title: 'Could not assign', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Technician assigned' })
      onDone?.()
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (availableTechs.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No active technicians available. Add a technician to assign this job.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="tech">Technician</Label>
        <Select id="tech" value={techId} onChange={(e) => setTechId(e.target.value)}>
          <option value="">Select a technician…</option>
          {availableTechs.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.full_name}
            </option>
          ))}
        </Select>
      </div>
      <Button onClick={handleAssign} disabled={pending}>
        <UserCheck className="h-4 w-4" />
        {pending ? 'Assigning…' : 'Assign & dispatch'}
      </Button>
    </div>
  )
}
