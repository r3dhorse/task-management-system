import { TaskHistoryAction } from '@/features/tasks/types/history'
import { detectTaskChanges, formatHistoryMessage, getActionColor } from '@/features/tasks/utils/history'
import { Task, TaskStatus } from '@/features/tasks/types'

// Mock task for testing
const mockTask: Task = {
  $id: 'task-1',
  name: 'Test Task',
  status: TaskStatus.TODO,
  workspaceId: 'workspace-1',
  serviceId: 'service-1',
  position: 1000,
  creatorId: 'user-1',
  assigneeId: '',
  description: 'Test description',
  dueDate: '',
  attachmentId: '',
  followedIds: '["user-1", "user-2"]',
  isConfidential: false,
  $createdAt: '2024-01-01T00:00:00.000Z',
  $updatedAt: '2024-01-01T00:00:00.000Z',
  $permissions: [],
  $databaseId: 'db-1',
  $collectionId: 'col-1',
}

describe('Follower Activity Logging', () => {
  describe('Change Detection', () => {
    it('detects when followers are added', () => {
      const originalTask = { ...mockTask, followedIds: '["user-1"]' }
      const updatedTask = { followedIds: '["user-1", "user-2", "user-3"]' }

      const changes = detectTaskChanges(originalTask, updatedTask)
      
      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: 'followedIds',
        oldValue: '["user-1"]',
        newValue: '["user-1", "user-2", "user-3"]',
        displayName: 'Followers'
      })
    })

    it('detects when followers are removed', () => {
      const originalTask = { ...mockTask, followedIds: '["user-1", "user-2", "user-3"]' }
      const updatedTask = { followedIds: '["user-1"]' }

      const changes = detectTaskChanges(originalTask, updatedTask)
      
      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: 'followedIds',
        oldValue: '["user-1", "user-2", "user-3"]',
        newValue: '["user-1"]',
        displayName: 'Followers'
      })
    })

    it('detects when followers are added and removed simultaneously', () => {
      const originalTask = { ...mockTask, followedIds: '["user-1", "user-2"]' }
      const updatedTask = { followedIds: '["user-1", "user-3", "user-4"]' }

      const changes = detectTaskChanges(originalTask, updatedTask)
      
      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: 'followedIds',
        oldValue: '["user-1", "user-2"]',
        newValue: '["user-1", "user-3", "user-4"]',
        displayName: 'Followers'
      })
    })

    it('does not detect changes when followers list is the same', () => {
      const originalTask = { ...mockTask, followedIds: '["user-1", "user-2"]' }
      const updatedTask = { followedIds: '["user-1", "user-2"]' }

      const changes = detectTaskChanges(originalTask, updatedTask)
      
      expect(changes).toHaveLength(0)
    })

    it('handles empty followers list', () => {
      const originalTask = { ...mockTask, followedIds: '[]' }
      const updatedTask = { followedIds: '["user-1"]' }

      const changes = detectTaskChanges(originalTask, updatedTask)
      
      expect(changes).toHaveLength(1)
      expect(changes[0].oldValue).toBe('[]')
      expect(changes[0].newValue).toBe('["user-1"]')
    })

    it('handles undefined and null followedIds', () => {
      const originalTask = { ...mockTask, followedIds: '' }
      const updatedTask = { followedIds: '["user-1"]' }

      const changes = detectTaskChanges(originalTask, updatedTask)
      
      expect(changes).toHaveLength(1)
      expect(changes[0].oldValue).toBe('[]') // Empty string gets normalized to "[]"
      expect(changes[0].newValue).toBe('["user-1"]')
    })
  })

  describe('History Message Formatting', () => {
    it('formats message when followers are added', () => {
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'John Doe',
        'followedIds',
        '["user-1"]',
        '["user-1", "user-2", "user-3"]'
      )

      expect(message).toBe('John Doe added 2 followers')
    })

    it('formats message when a single follower is added', () => {
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Jane Smith',
        'followedIds',
        '["user-1"]',
        '["user-1", "user-2"]'
      )

      expect(message).toBe('Jane Smith added 1 follower')
    })

    it('formats message when followers are removed', () => {
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Bob Wilson',
        'followedIds',
        '["user-1", "user-2", "user-3"]',
        '["user-1"]'
      )

      expect(message).toBe('Bob Wilson removed 2 followers')
    })

    it('formats message when a single follower is removed', () => {
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Alice Brown',
        'followedIds',
        '["user-1", "user-2"]',
        '["user-1"]'
      )

      expect(message).toBe('Alice Brown removed 1 follower')
    })

    it('formats message when followers are both added and removed', () => {
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Charlie Davis',
        'followedIds',
        '["user-1", "user-2"]',
        '["user-1", "user-3", "user-4"]'
      )

      expect(message).toBe('Charlie Davis updated the followers list')
    })

    it('handles malformed JSON gracefully', () => {
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'David Evans',
        'followedIds',
        'invalid-json',
        '["user-1"]'
      )

      expect(message).toBe('David Evans updated the followers')
    })

    it('handles empty followers arrays', () => {
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Eva Green',
        'followedIds',
        '[]',
        '["user-1"]'
      )

      expect(message).toBe('Eva Green added 1 follower')
    })

    it('formats message when all followers are removed', () => {
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Frank Miller',
        'followedIds',
        '["user-1", "user-2"]',
        '[]'
      )

      expect(message).toBe('Frank Miller removed 2 followers')
    })

    it('formats message using UPDATED action but followedIds field', () => {
      // This tests the fallback handling when action is UPDATED but field is followedIds
      const message = formatHistoryMessage(
        TaskHistoryAction.UPDATED,
        'Grace Wilson',
        'followedIds',
        '["user-1"]',
        '["user-1", "user-2"]'
      )

      expect(message).toBe('Grace Wilson added 1 follower')
    })
  })

  describe('Action Color Coding', () => {
    it('returns correct color for FOLLOWERS_CHANGED action', () => {
      const color = getActionColor(TaskHistoryAction.FOLLOWERS_CHANGED)
      expect(color).toBe('bg-teal-500')
    })

    it('returns correct color for UPDATED action with followedIds field', () => {
      const color = getActionColor(TaskHistoryAction.UPDATED, 'followedIds')
      expect(color).toBe('bg-teal-500')
    })

    it('returns different color for other actions', () => {
      const statusColor = getActionColor(TaskHistoryAction.STATUS_CHANGED)
      const assigneeColor = getActionColor(TaskHistoryAction.ASSIGNEE_CHANGED)
      
      expect(statusColor).toBe('bg-blue-500')
      expect(assigneeColor).toBe('bg-purple-500')
      expect(statusColor).not.toBe('bg-teal-500')
      expect(assigneeColor).not.toBe('bg-teal-500')
    })
  })

  describe('Integration Scenarios', () => {
    it('handles complete follower management workflow', () => {
      // Scenario 1: Start with creator only
      const initialTask = { ...mockTask, followedIds: '["creator-id"]' }
      
      // Scenario 2: Add visitor followers
      const withVisitors = { followedIds: '["creator-id", "visitor-1", "visitor-2"]' }
      const addChanges = detectTaskChanges(initialTask, withVisitors)
      
      expect(addChanges).toHaveLength(1)
      expect(addChanges[0].field).toBe('followedIds')
      
      const addMessage = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Admin User',
        'followedIds',
        addChanges[0].oldValue,
        addChanges[0].newValue
      )
      
      expect(addMessage).toBe('Admin User added 2 followers')
      
      // Scenario 3: Remove one visitor
      const withOneVisitor = { followedIds: '["creator-id", "visitor-1"]' }
      const removeChanges = detectTaskChanges(
        { ...initialTask, followedIds: withVisitors.followedIds },
        withOneVisitor
      )
      
      expect(removeChanges).toHaveLength(1)
      
      const removeMessage = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Admin User',
        'followedIds',
        removeChanges[0].oldValue,
        removeChanges[0].newValue
      )
      
      expect(removeMessage).toBe('Admin User removed 1 follower')
    })

    it('validates that followers changes are properly categorized', () => {
      const originalTask = { ...mockTask, followedIds: '["user-1"]' }
      const updatedTask = { 
        followedIds: '["user-1", "user-2"]',
        name: 'Updated Task Name',
        status: TaskStatus.IN_PROGRESS
      }

      const changes = detectTaskChanges(originalTask, updatedTask)
      
      // Should detect all three changes
      expect(changes).toHaveLength(3)
      
      const followerChange = changes.find(c => c.field === 'followedIds')
      const nameChange = changes.find(c => c.field === 'name')
      const statusChange = changes.find(c => c.field === 'status')
      
      expect(followerChange).toBeDefined()
      expect(nameChange).toBeDefined()
      expect(statusChange).toBeDefined()
      
      // Verify follower change formatting
      const followerMessage = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Test User',
        'followedIds',
        followerChange!.oldValue,
        followerChange!.newValue
      )
      
      expect(followerMessage).toBe('Test User added 1 follower')
    })

    it('ensures follower changes have distinct visual treatment', () => {
      const followerColor = getActionColor(TaskHistoryAction.FOLLOWERS_CHANGED)
      const statusColor = getActionColor(TaskHistoryAction.STATUS_CHANGED)
      const assigneeColor = getActionColor(TaskHistoryAction.ASSIGNEE_CHANGED)
      const createdColor = getActionColor(TaskHistoryAction.CREATED)
      
      // Follower changes should have unique color
      expect(followerColor).toBe('bg-teal-500')
      expect(followerColor).not.toBe(statusColor)
      expect(followerColor).not.toBe(assigneeColor)
      expect(followerColor).not.toBe(createdColor)
    })
  })

  describe('Edge Cases', () => {
    it('handles array order differences', () => {
      const originalTask = { ...mockTask, followedIds: '["user-1", "user-2"]' }
      const reorderedTask = { followedIds: '["user-2", "user-1"]' }

      const changes = detectTaskChanges(originalTask, reorderedTask)
      
      // Should detect change due to string comparison
      expect(changes).toHaveLength(1)
      
      // But the formatted message should handle it gracefully
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Test User',
        'followedIds',
        originalTask.followedIds,
        reorderedTask.followedIds
      )
      
      expect(message).toBe('Test User updated the followers')
    })

    it('handles very large follower lists', () => {
      const manyFollowers = Array.from({ length: 50 }, (_, i) => `user-${i + 1}`)
      const originalTask = { ...mockTask, followedIds: JSON.stringify(manyFollowers.slice(0, 25)) }
      const updatedTask = { followedIds: JSON.stringify(manyFollowers) }

      const changes = detectTaskChanges(originalTask, updatedTask)
      expect(changes).toHaveLength(1)
      
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Test User',
        'followedIds',
        changes[0].oldValue,
        changes[0].newValue
      )
      
      expect(message).toBe('Test User added 25 followers')
    })

    it('handles special characters in user IDs', () => {
      const specialIds = ['user-1@company.com', 'user_2-test', 'user.3']
      const originalTask = { ...mockTask, followedIds: JSON.stringify(specialIds.slice(0, 1)) }
      const updatedTask = { followedIds: JSON.stringify(specialIds) }

      const changes = detectTaskChanges(originalTask, updatedTask)
      expect(changes).toHaveLength(1)
      
      const message = formatHistoryMessage(
        TaskHistoryAction.FOLLOWERS_CHANGED,
        'Test User',
        'followedIds',
        changes[0].oldValue,
        changes[0].newValue
      )
      
      expect(message).toBe('Test User added 2 followers')
    })
  })
})