/**
 * Permission utilities for role-based access control
 */

/**
 * Check if user is organizer of a trip
 * @param {object} trip - Trip object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function isTripOrganizer(trip, userId) {
  return trip?.organizerId === userId
}

/**
 * Check if user is captain in a trip
 * @param {object} participant - Participant object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function isCaptain(participant, userId) {
  return participant?.userId === userId && participant?.role === 'captain'
}

/**
 * Check if user is participant in a trip
 * @param {object} participant - Participant object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function isParticipant(participant, userId) {
  return participant?.userId === userId
}

/**
 * Get user's role in a trip
 * @param {object} trip - Trip object
 * @param {object} participant - Participant object (optional)
 * @param {string} userId - User ID
 * @returns {string|null} - 'organizer', 'captain', 'participant', or null
 */
export function getUserRoleInTrip(trip, participant, userId) {
  if (!trip || !userId) return null
  
  // Check if organizer
  if (trip.organizerId === userId) {
    // If organizer is also a participant, return their participant role
    if (participant && participant.userId === userId) {
      return participant.role === 'captain' ? 'captain' : 'participant'
    }
    return 'organizer'
  }
  
  // Check participant role
  if (participant && participant.userId === userId) {
    return participant.role
  }
  
  return null
}

/**
 * Check if user can edit trip
 * @param {object} trip - Trip object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canEditTrip(trip, userId) {
  return isTripOrganizer(trip, userId)
}

/**
 * Check if user can delete trip
 * @param {object} trip - Trip object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canDeleteTrip(trip, userId) {
  return isTripOrganizer(trip, userId)
}

/**
 * Check if user can manage participants
 * @param {object} trip - Trip object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canManageParticipants(trip, userId) {
  return isTripOrganizer(trip, userId)
}

/**
 * Check if user can manage boats
 * @param {object} trip - Trip object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canManageBoats(trip, userId) {
  return isTripOrganizer(trip, userId)
}

/**
 * Check if user can edit boat
 * @param {object} trip - Trip object
 * @param {object} boat - Boat object
 * @param {object} participant - Participant object (optional)
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canEditBoat(trip, boat, participant, userId) {
  if (isTripOrganizer(trip, userId)) return true
  if (isCaptain(participant, userId) && participant?.boatId === boat?.id) return true
  return false
}

/**
 * Check if user can edit boat log
 * @param {object} trip - Trip object
 * @param {object} boat - Boat object
 * @param {object} participant - Participant object (optional)
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canEditBoatLog(trip, boat, participant, userId) {
  if (isTripOrganizer(trip, userId)) return true
  if (isCaptain(participant, userId) && participant?.boatId === boat?.id) return true
  return false
}

/**
 * Check if user can view boat log
 * @param {object} trip - Trip object
 * @param {object} boat - Boat object
 * @param {object} participant - Participant object (optional)
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canViewBoatLog(trip, boat, participant, userId) {
  if (isTripOrganizer(trip, userId)) return true
  if (isCaptain(participant, userId) && participant?.boatId === boat?.id) return true
  if (isParticipant(participant, userId) && participant?.boatId === boat?.id) return true
  return false
}

/**
 * Check if user can manage documents
 * @param {object} trip - Trip object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canManageDocuments(trip, userId) {
  return isTripOrganizer(trip, userId)
}

/**
 * Check if user can view documents
 * @param {object} trip - Trip object
 * @param {object} participant - Participant object (optional)
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canViewDocuments(trip, participant, userId) {
  if (isTripOrganizer(trip, userId)) return true
  if (isParticipant(participant, userId)) return true
  return false
}

/**
 * Check if user can manage timeline events
 * @param {object} trip - Trip object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canManageTimelineEvents(trip, userId) {
  return isTripOrganizer(trip, userId)
}

/**
 * Check if user can edit participant
 * @param {object} trip - Trip object
 * @param {object} participant - Participant object to edit
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canEditParticipant(trip, participant, userId) {
  if (isTripOrganizer(trip, userId)) return true
  if (participant?.userId === userId) return true
  return false
}

/**
 * Check if user can view participant details
 * @param {object} trip - Trip object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canViewParticipantDetails(trip, userId) {
  return isTripOrganizer(trip, userId)
}

/**
 * Check if user can manage checklist templates
 * @param {string} organizerId - Organizer ID
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canManageChecklistTemplates(organizerId, userId) {
  return organizerId === userId
}

/**
 * Check if user can manage trip templates
 * @param {string} organizerId - Organizer ID
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canManageTripTemplates(organizerId, userId) {
  return organizerId === userId
}

/**
 * Check if event is visible to user based on role
 * @param {object} event - Timeline event
 * @param {string} userRole - User's role ('organizer', 'captain', 'participant')
 * @returns {boolean}
 */
export function isEventVisibleToUser(event, userRole) {
  if (!event.roles || event.roles.length === 0) return true
  if (userRole === 'organizer') return true // Organizers can see all events
  return event.roles.includes(userRole) || event.roles.includes('all')
}

/**
 * Check if user can complete event
 * @param {object} event - Timeline event
 * @param {string} userRole - User's role
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canCompleteEvent(event, userRole, userId) {
  if (!event.checkable) return false
  if (userRole === 'organizer') return true
  return isEventVisibleToUser(event, userRole)
}

/**
 * Check if user can edit a crewlist row
 * @param {object} trip - Trip object
 * @param {object} boat - Boat object (optional)
 * @param {object} targetParticipant - Participant object whose row is being edited
 * @param {string} userId - Current user ID
 * @param {string} targetUserId - User ID of the row being edited
 * @param {string} viewContext - View context ('organizer' | 'captain' | 'participant')
 * @returns {boolean}
 */
export function canEditCrewlistRow(trip, boat, targetParticipant, userId, targetUserId, viewContext) {
  if (!trip || !userId || !targetParticipant) return false
  
  // Organizer can edit all rows when viewing from organizer view
  if (viewContext === 'organizer' && isTripOrganizer(trip, userId)) {
    return true
  }
  
  // Captain can edit only their own row when viewing from captain view
  if (viewContext === 'captain') {
    if (isCaptain(targetParticipant, userId) && targetUserId === userId) {
      return true
    }
  }
  
  // Participant cannot edit any rows
  return false
}

/**
 * Get all roles a user has in a trip
 * @param {object} trip - Trip object
 * @param {object} participant - Participant object (optional)
 * @param {string} userId - User ID
 * @returns {string[]} Array of role strings: ['organizer', 'captain', 'participant']
 */
export function getUserTripRoles(trip, participant, userId) {
  if (!trip || !userId) return []
  
  const roles = []
  
  // Check if organizer
  if (trip.organizerId === userId) {
    roles.push('organizer')
  }
  
  // Check participant role
  if (participant && participant.userId === userId) {
    if (participant.role === 'captain') {
      roles.push('captain')
    } else {
      roles.push('participant')
    }
  }
  
  return roles
}

/**
 * Get role label for display
 * @param {string} role - Role string
 * @returns {string} Display label
 */
export function getRoleLabel(role) {
  const labels = {
    organizer: 'Organizátor',
    captain: 'Kapitán',
    participant: 'Účastník'
  }
  return labels[role] || role
}

/**
 * Check if user can edit checklist instance
 * @param {object} trip - Trip object
 * @param {object} instance - Checklist instance object
 * @param {object} boat - Boat object (optional)
 * @param {object} participant - Participant object (optional)
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function canEditChecklist(trip, instance, boat, participant, userId) {
  if (!trip || !instance || !userId) return false
  
  // Organizer can always edit checklists
  if (isTripOrganizer(trip, userId)) return true
  
  // If checklist is assigned to a boat, captain of that boat can edit
  if (instance.boatId && boat && boat.id === instance.boatId) {
    if (isCaptain(participant, userId) && participant?.boatId === boat.id) {
      return true
    }
  }
  
  // If checklist is assigned to a user, that user can edit
  if (instance.userId === userId) {
    return true
  }
  
  // If checklist is assigned to organizer role and user is organizer
  if (instance.role === 'organizer' && isTripOrganizer(trip, userId)) {
    return true
  }
  
  return false
}


