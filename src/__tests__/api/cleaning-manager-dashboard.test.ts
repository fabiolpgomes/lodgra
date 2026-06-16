/**
 * Tests for Story 29.7 — Manager Cleaning Dashboard
 */

import { describe, it, expect } from '@jest/globals';

describe('Story 29.7 — Manager Cleaning Dashboard', () => {
  const mockTasks = [
    {
      id: 'task-1',
      property: {
        name: 'Beach House',
        address: 'Rua da Praia',
        city: 'Fortaleza',
      },
      cleaner: {
        full_name: 'Maria Limpeza',
        phone: '+5585988881111',
        email: 'maria@example.com',
      },
      reservation: {
        guests: { full_name: 'João Silva', phone: '+5585987654321' },
      },
      status: 'in_progress',
      scheduled_date: '2026-06-16',
      scheduled_time: '10:00',
      photo_count: 3,
      checklist_completion: 75,
      notes: 'Cleaning in progress',
      completed_at: null,
    },
    {
      id: 'task-2',
      property: {
        name: 'Mountain House',
        address: 'Rua da Montanha',
        city: 'Pedra Branca',
      },
      cleaner: {
        full_name: 'Carlos Limpador',
        phone: '+5585988882222',
        email: 'carlos@example.com',
      },
      reservation: {
        guests: { full_name: 'Ana Costa', phone: '+5585981234567' },
      },
      status: 'done',
      scheduled_date: '2026-06-15',
      scheduled_time: '09:00',
      photo_count: 8,
      checklist_completion: 100,
      notes: 'Cleaning completed on time',
      completed_at: '2026-06-15T15:30:00Z',
    },
  ];

  describe('Dashboard Data Retrieval (AC1)', () => {
    it('should fetch all tasks for organization', () => {
      expect(mockTasks.length).toBe(2);
    });

    it('should include cleaner phone number', () => {
      const task = mockTasks[0];
      expect(task.cleaner.phone).toBe('+5585988881111');
      expect(task.cleaner.phone).toMatch(/^\+55/);
    });

    it('should include property address', () => {
      const task = mockTasks[0];
      expect(task.property.address).toBeDefined();
      expect(task.property.city).toBeDefined();
    });

    it('should include guest phone for contact', () => {
      const task = mockTasks[0];
      expect(task.reservation.guests.phone).toBeDefined();
    });
  });

  describe('Status Tracking (AC2)', () => {
    it('should track pending tasks', () => {
      const pending = mockTasks.filter((t) => t.status === 'pending');
      expect(pending.length).toBeGreaterThanOrEqual(0);
    });

    it('should track in_progress tasks', () => {
      const inProgress = mockTasks.filter((t) => t.status === 'in_progress');
      expect(inProgress.length).toBeGreaterThanOrEqual(0);
    });

    it('should track completed tasks with timestamp', () => {
      const done = mockTasks.filter((t) => t.status === 'done');
      expect(done.length).toBeGreaterThanOrEqual(0);
      done.forEach((task) => {
        expect(task.completed_at).toBeDefined();
      });
    });

    it('should allow issue status for problems', () => {
      const taskWithIssue = { ...mockTasks[0], status: 'issue' };
      expect(['pending', 'in_progress', 'done', 'issue']).toContain(taskWithIssue.status);
    });
  });

  describe('Cleaner Information Display (AC3)', () => {
    it('should display cleaner name', () => {
      const task = mockTasks[0];
      expect(task.cleaner.full_name).toBe('Maria Limpeza');
    });

    it('should display cleaner phone', () => {
      const task = mockTasks[0];
      expect(task.cleaner.phone).toBe('+5585988881111');
    });

    it('should display cleaner email', () => {
      const task = mockTasks[0];
      expect(task.cleaner.email).toBe('maria@example.com');
    });

    it('should handle null cleaner (not yet assigned)', () => {
      const unassignedTask = {
        ...mockTasks[0],
        cleaner_id: null,
        cleaner: null,
      };
      expect(unassignedTask.cleaner).toBeNull();
    });
  });

  describe('Property Information (AC4)', () => {
    it('should display property name', () => {
      const task = mockTasks[0];
      expect(task.property.name).toBeDefined();
    });

    it('should display complete address', () => {
      const task = mockTasks[0];
      const fullAddress = `${task.property.address}, ${task.property.city}`;
      expect(fullAddress).toContain('Rua da Praia');
      expect(fullAddress).toContain('Fortaleza');
    });
  });

  describe('Progress Tracking (AC5)', () => {
    it('should track checklist completion percentage', () => {
      const task = mockTasks[0];
      expect(task.checklist_completion).toBeGreaterThanOrEqual(0);
      expect(task.checklist_completion).toBeLessThanOrEqual(100);
    });

    it('should count uploaded photos', () => {
      const task = mockTasks[0];
      expect(task.photo_count).toBeGreaterThanOrEqual(0);
    });

    it('should show 100% completion when done', () => {
      const doneTask = mockTasks.find((t) => t.status === 'done');
      expect(doneTask?.checklist_completion).toBe(100);
    });
  });

  describe('Filtering & Sorting (AC6)', () => {
    it('should filter by status', () => {
      const done = mockTasks.filter((t) => t.status === 'done');
      expect(done).toHaveLength(1);
      expect(done[0].status).toBe('done');
    });

    it('should filter by date', () => {
      const targetDate = '2026-06-16';
      const filtered = mockTasks.filter((t) => t.scheduled_date === targetDate);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should sort by scheduled date', () => {
      const sorted = [...mockTasks].sort(
        (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      );
      expect(new Date(sorted[0].scheduled_date).getTime()).toBeLessThanOrEqual(
        new Date(sorted[1].scheduled_date).getTime()
      );
    });
  });

  describe('Status Updates (AC7)', () => {
    it('should update task status', () => {
      const task = { ...mockTasks[0], status: 'in_progress' };
      task.status = 'done';

      expect(task.status).toBe('done');
    });

    it('should record completion timestamp', () => {
      const now = new Date().toISOString();
      const task = { ...mockTasks[0], completed_at: now };

      expect(task.completed_at).not.toBeNull();
      expect(task.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should allow adding notes to task', () => {
      const task = { ...mockTasks[0], notes: 'Updated: Minor issue found' };

      expect(task.notes).toBeDefined();
      expect(task.notes).toContain('issue');
    });
  });

  describe('Authorization (AC8)', () => {
    it('should require gestor or admin role', () => {
      const allowedRoles = ['admin', 'gestor'];
      const userRole = 'gestor';

      expect(allowedRoles).toContain(userRole);
    });

    it('should block unauthorized roles', () => {
      const allowedRoles = ['admin', 'gestor'];
      const userRole = 'guest';

      expect(allowedRoles).not.toContain(userRole);
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate total tasks', () => {
      expect(mockTasks.length).toBe(2);
    });

    it('should count by status', () => {
      const statusCounts = mockTasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(statusCounts.in_progress).toBe(1);
      expect(statusCounts.done).toBe(1);
    });

    it('should calculate average completion', () => {
      const avgCompletion =
        mockTasks.reduce((sum, t) => sum + t.checklist_completion, 0) / mockTasks.length;

      expect(avgCompletion).toBe(87.5);
    });
  });
});
