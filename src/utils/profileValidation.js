/**
 * Utility functions for validating user profile data
 */

import { userService } from '../services/userService'

/**
 * Check if user has all required profile fields filled
 * Required fields: name (celé jméno), phone, email
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if all required fields are filled
 */
export async function hasRequiredProfileFields(userId) {
  if (!userId) return false
  
  try {
    const { data, error } = await userService.getProfile(userId)
    if (error || !data) {
      return false
    }
    
    // Check required fields
    const name = data.name?.trim() || ''
    const phone = data.phone?.trim() || ''
    const email = data.email?.trim() || ''
    
    // Name must be at least 2 characters
    // Phone and email must be non-empty
    return name.length >= 2 && phone.length > 0 && email.length > 0
  } catch (error) {
    console.error('Error checking required profile fields:', error)
    return false
  }
}

/**
 * Validate profile data
 * @param {object} profileData - Profile data to validate
 * @returns {object} { valid: boolean, errors: object }
 */
export function validateProfileData(profileData) {
  const errors = {}
  
  const name = profileData.name?.trim() || ''
  const phone = profileData.phone?.trim() || ''
  const email = profileData.email?.trim() || ''
  
  if (name.length < 2) {
    errors.name = 'Jméno a příjmení musí obsahovat alespoň 2 znaky'
  }
  
  if (phone.length === 0) {
    errors.phone = 'Telefon je povinný'
  }
  
  if (email.length === 0) {
    errors.email = 'Email je povinný'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email není ve správném formátu'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

