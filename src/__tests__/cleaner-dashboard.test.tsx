import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CleanerTaskCard from '@/app/[locale]/cleaner/_components/CleanerTaskCard'
import { CleaningTask } from '@/types/cleaning'

const mockTasks: CleaningTask[] = [
  {
    id: 'task-1',
    cleaner_id: 'cleaner-123',
    organization_id: 'org-1',
    property_id: 'prop-1',
    property_name: 'Refúgio Perfeito',
    booking_id: '1234',
    guest_name: 'Maria S.',
    scheduled_time: new Date().toISOString(),
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    reservation_id: 'res-1',
    checklist_template_id: null,
    started_at: null,
    completed_at: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'task-2',
    cleaner_id: 'cleaner-123',
    organization_id: 'org-1',
    property_id: 'prop-2',
    property_name: 'Casa do Lago',
    booking_id: '1235',
    guest_name: 'Carlos M.',
    scheduled_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    scheduled_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'in_progress',
    reservation_id: 'res-2',
    checklist_template_id: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

describe('CleanerTaskCard', () => {
  it('should render task details correctly', () => {
    const onStatusChange = jest.fn()

    render(
      <CleanerTaskCard
        task={mockTasks[0]}
        onStatusChange={onStatusChange}
      />
    )

    expect(screen.getByText('Refúgio Perfeito')).toBeInTheDocument()
    expect(screen.getByText(/Reserva #1234/)).toBeInTheDocument()
    expect(screen.getByText(/Maria S\./)).toBeInTheDocument()
  })

  it('should display pending status badge', () => {
    render(
      <CleanerTaskCard
        task={mockTasks[0]}
        onStatusChange={jest.fn()}
      />
    )

    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('should display in_progress status badge', () => {
    render(
      <CleanerTaskCard
        task={mockTasks[1]}
        onStatusChange={jest.fn()}
      />
    )

    expect(screen.getByText('Em Progresso')).toBeInTheDocument()
  })

  it('should render start button for pending tasks', () => {
    render(
      <CleanerTaskCard
        task={mockTasks[0]}
        onStatusChange={jest.fn()}
      />
    )

    const startButton = screen.getByRole('button', { name: /Iniciar/i })
    expect(startButton).toBeInTheDocument()
  })

  it('should not render start button for in_progress tasks', () => {
    render(
      <CleanerTaskCard
        task={mockTasks[1]}
        onStatusChange={jest.fn()}
      />
    )

    const startButton = screen.queryByRole('button', { name: /Iniciar/i })
    expect(startButton).not.toBeInTheDocument()
  })

  it('should handle button click for starting task', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({...mockTasks[0], status: 'in_progress'})
    })

    const onStatusChange = jest.fn()

    render(
      <CleanerTaskCard
        task={mockTasks[0]}
        onStatusChange={onStatusChange}
      />
    )

    const startButton = screen.getByRole('button', { name: /Iniciar/i })
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(mockTasks[0].id, 'in_progress')
    })
  })
})
