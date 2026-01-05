/**
 * Utility functions for fetching and displaying user names and initials
 */

import { userService } from '../services/userService'

// Cache for user profiles to reduce redundant Firestore calls
const userProfilesCache = new Map()

/**
 * Get user profile from cache or Firestore
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User profile data
 */
export async function getUserProfile(userId) {
  if (!userId) return null
  
  // Check cache first
  if (userProfilesCache.has(userId)) {
    return userProfilesCache.get(userId)
  }
  
  // Fetch from Firestore
  try {
    const { data, error } = await userService.getProfile(userId)
    if (error || !data) {
      return null
    }
    
    // Cache the result
    userProfilesCache.set(userId, data)
    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Get user display name
 * @param {string} userId - User ID
 * @param {string} defaultName - Default name if not found
 * @returns {Promise<string>} User display name
 */
export async function getUserDisplayName(userId, defaultName = 'Neznámý uživatel') {
  if (!userId) return defaultName
  
  const profile = await getUserProfile(userId)
  return profile?.name || defaultName
}

/**
 * Get user initials
 * @param {string} userId - User ID
 * @param {string} defaultName - Default name if not found
 * @returns {Promise<string>} User initials (2 characters)
 */
export async function getUserInitials(userId, defaultName = 'NN') {
  if (!userId) return defaultName
  
  const profile = await getUserProfile(userId)
  if (profile?.name) {
    const nameParts = profile.name.trim().split(/\s+/)
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    } else {
      return profile.name.substring(0, 2).toUpperCase()
    }
  }
  
  return userId.substring(0, 2).toUpperCase()
}

/**
 * Load multiple user profiles at once
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<Map>} Map of userId -> profile data
 */
export async function loadUserProfiles(userIds) {
  if (!userIds || userIds.length === 0) {
    return new Map()
  }
  
  const profiles = new Map()
  const uncachedIds = []
  
  // Check cache first
  for (const userId of userIds) {
    if (userProfilesCache.has(userId)) {
      profiles.set(userId, userProfilesCache.get(userId))
    } else {
      uncachedIds.push(userId)
    }
  }
  
  // Fetch uncached profiles in parallel
  if (uncachedIds.length > 0) {
    const profilePromises = uncachedIds.map(userId => getUserProfile(userId))
    const fetchedProfiles = await Promise.all(profilePromises)
    
    fetchedProfiles.forEach((profile, index) => {
      if (profile) {
        const userId = uncachedIds[index]
        profiles.set(userId, profile)
      }
    })
  }
  
  return profiles
}

/**
 * Clear the user profiles cache
 */
export function clearUserProfilesCache() {
  userProfilesCache.clear()
}

