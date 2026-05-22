# QA Fix Request — Story 29.9 AC1.4

**Story:** 29.9 — Photo Upload Enhancements  
**AC Required:** AC1.4 — Handle connection lifecycle (connect, disconnect, error, reconnect)  
**Severity:** MEDIUM (core feature gap)  
**Agent:** @dev  
**Status:** Pending Implementation

---

## Current Implementation Gap

**Current Code** (CleaningPhotoGallery.tsx, lines 54-79):
```typescript
const channel = supabase
  .channel(`cleaning_photos:task_id=eq.${taskId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'cleaning_photos',
      filter: `task_id=eq.${taskId}`,
    },
    async (payload) => {
      if (payload.eventType === 'INSERT') {
        load();
      } else if (payload.eventType === 'DELETE') {
        setPhotos((prev) => prev.filter((p) => p.id !== (payload.old as Photo).id));
      } else if (payload.eventType === 'UPDATE') {
        load();
      }
    }
  )
  .subscribe();

return () => {
  channel.unsubscribe();
};
```

**What's Missing:**
- No error event handler
- No disconnect/reconnect logic
- No fallback to polling if Realtime unavailable
- No status logging

---

## Implementation Requirements

### Requirement 1: Connection Status Lifecycle

Add handlers for: `SUBSCRIBE`, `SIGNED_IN`, `SIGNED_OUT`, `CHANNEL_ERROR`

```typescript
.on('system', { event: 'join' }, () => {
  console.log('✅ Realtime connected');
  setError(null); // Clear any previous errors
})
.on('system', { event: 'leave' }, () => {
  console.log('⚠️ Realtime disconnected');
})
.subscribe((status) => {
  console.log('Realtime status:', status);
  if (status === 'CHANNEL_ERROR') {
    // Error occurred
  }
});
```

### Requirement 2: Error Handling with Fallback

If Realtime fails, fallback to polling:

```typescript
let pollInterval: NodeJS.Timeout | null = null;

const channel = supabase.channel(...).subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    // Realtime active, clear any polling
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    setError(null);
  } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
    // Fallback to polling
    console.log('Realtime unavailable, falling back to 5s polling');
    pollInterval = setInterval(load, 5000);
  }
});

return () => {
  channel.unsubscribe();
  if (pollInterval) {
    clearInterval(pollInterval);
  }
};
```

### Requirement 3: Unit Test Coverage

Add test case to `CleaningPhotos.test.tsx`:

```typescript
test('falls back to polling when Realtime unavailable', async () => {
  // Mock Realtime error
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn((callback) => {
      // Simulate CHANNEL_ERROR
      callback('CHANNEL_ERROR');
      return { unsubscribe: jest.fn() };
    }),
    unsubscribe: jest.fn(),
  };

  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => [],
  });

  render(<CleaningPhotoGallery taskId="test-task-id" />);

  // Verify fallback polling started
  await waitFor(() => {
    // After CHANNEL_ERROR, polling should be active
    // (verify with setInterval spy if needed)
  });
});
```

---

## Acceptance Criteria for This Fix

- [ ] Connection status lifecycle implemented (join/leave events)
- [ ] Error handler added for CHANNEL_ERROR
- [ ] Fallback polling activated on disconnect (5s interval)
- [ ] Polling cleared when Realtime reconnects
- [ ] No memory leaks (intervals cleared on unmount)
- [ ] Unit test added for error/fallback scenario
- [ ] All tests passing (13/13)
- [ ] No new linting errors

---

## Testing Checklist

Before returning to @qa:

```bash
npm test -- CleaningPhotos.test.tsx
# Expected: 13/13 passing (1 new test for AC1.4)

npm run lint
# Expected: No errors in modified file

npm run typecheck
# Expected: All strict mode compliant
```

---

## Pseudo-Code Reference

```typescript
// Complete updated implementation pattern
useEffect(() => {
  let pollInterval: NodeJS.Timeout | null = null;
  let mounted = true;

  const load = async () => {
    try {
      const response = await fetch(`/api/cleaner/tasks/${taskId}/photos`);
      if (!response.ok) throw new Error('Failed to load photos');
      const data = await response.json();
      if (mounted) {
        setPhotos(data);
        setError(null);
      }
    } catch (err) {
      if (mounted) {
        console.error('Error loading photos:', err);
        setError(t('load_error'));
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  load();

  // Realtime subscription with lifecycle management
  const channel = supabase
    .channel(`cleaning_photos:task_id=eq.${taskId}`)
    .on('postgres_changes', { ... }, async (payload) => { ... })
    .on('system', { event: 'join' }, () => {
      if (mounted) {
        console.log('✅ Realtime connected');
        // Clear polling if active
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    })
    .on('system', { event: 'leave' }, () => {
      if (mounted) {
        console.log('⚠️ Realtime disconnected, starting polling fallback');
        // Start polling
        pollInterval = setInterval(load, 5000);
      }
    })
    .subscribe(async (status) => {
      console.log('Realtime status:', status);
      if (status === 'SUBSCRIBED') {
        if (mounted && pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        if (mounted && !pollInterval) {
          console.log('Starting polling fallback due to:', status);
          pollInterval = setInterval(load, 5000);
        }
      }
    });

  return () => {
    mounted = false;
    channel.unsubscribe();
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
}, [taskId]);
```

---

## Estimate

**Time:** 45 minutes  
**Complexity:** MEDIUM  
**Risk:** LOW (additive, non-breaking)

---

## Next Steps

1. Implement AC1.4 fix in CleaningPhotoGallery.tsx
2. Add unit test for error/fallback scenario
3. Run `npm test` — verify 13/13 passing
4. Run `npm run lint` — verify clean
5. Return to @qa for re-validation

When complete, reply: **"AC1.4 implemented and tested"**

---

*Generated by @qa (Quinn) — 2026-05-22*
