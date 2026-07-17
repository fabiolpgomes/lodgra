import * as Sentry from '@sentry/nextjs'

interface AutoFixSuggestion {
  propertyId: string
  fieldName: string
  issue: string
  suggestedFix: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedImpact: string
  autoFixable: boolean
  fixCode?: string
}

export interface FixResult {
  applied: boolean
  fieldName: string
  oldValue?: unknown
  newValue?: unknown
  message: string
}

export class AutoFixer {
  getAutoFixSuggestions(
    propertyId: string,
    issues: Array<{
      fieldName: string
      severity: string
      message: string
      currentValue?: unknown
    }>
  ): AutoFixSuggestion[] {
    const suggestions: AutoFixSuggestion[] = []

    for (const issue of issues) {
      const suggestion = this.generateFixForIssue(propertyId, issue)
      if (suggestion) {
        suggestions.push(suggestion)
      }
    }

    return suggestions.sort((a, b) => {
      const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 }
      return priorityMap[a.priority] - priorityMap[b.priority]
    })
  }

  private generateFixForIssue(
    propertyId: string,
    issue: {
      fieldName: string
      severity: string
      message: string
      currentValue?: unknown
    }
  ): AutoFixSuggestion | null {
    const { fieldName, severity, message, currentValue } = issue

    switch (fieldName) {
      case 'title':
        if (message.includes('too long')) {
          return {
            propertyId,
            fieldName: 'title',
            issue: 'Title exceeds 100 characters',
            suggestedFix: `Truncate title to first 100 chars: "${String(currentValue).substring(0, 100)}"`,
            priority: 'high',
            estimatedImpact: 'Low - improves Google compliance',
            autoFixable: true,
            fixCode: `title = "${String(currentValue).substring(0, 100)}"`,
          }
        }
        break

      case 'description':
        if (message.includes('too short')) {
          return {
            propertyId,
            fieldName: 'description',
            issue: 'Description is too short (min 30 chars)',
            suggestedFix: 'Expand with amenities, features, and house rules',
            priority: 'medium',
            estimatedImpact: 'Medium - improves CTR by 5-10%',
            autoFixable: false,
          }
        }
        if (message.includes('very long')) {
          return {
            propertyId,
            fieldName: 'description',
            issue: 'Description is very long',
            suggestedFix: 'Consider moving to separate amenities section',
            priority: 'low',
            estimatedImpact: 'Low - readability improvement',
            autoFixable: false,
          }
        }
        break

      case 'address':
        if (message.includes('incomplete')) {
          return {
            propertyId,
            fieldName: 'address',
            issue: 'Address seems incomplete',
            suggestedFix: 'Add postal code and city to address',
            priority: 'high',
            estimatedImpact: 'High - critical for mapping and search',
            autoFixable: false,
            fixCode: 'Update address format: Street No, PostalCode City',
          }
        }
        break

      case 'price':
        if (message.includes('invalid') || message.includes('unreasonably high')) {
          return {
            propertyId,
            fieldName: 'price',
            issue: `Price is invalid or unreasonable: ${currentValue}`,
            suggestedFix: 'Verify and correct the nightly rate',
            priority: 'critical',
            estimatedImpact: 'Critical - affects bookings',
            autoFixable: false,
          }
        }
        break

      case 'photos':
        if (message.includes('no photos')) {
          return {
            propertyId,
            fieldName: 'photos',
            issue: 'Property has no photos',
            suggestedFix: 'Upload at least 5 high-quality photos (bedroom, bathroom, kitchen, living, exterior)',
            priority: 'critical',
            estimatedImpact: 'Critical - properties without photos rarely book',
            autoFixable: false,
          }
        }
        if (message.includes('photo(s)')) {
          const count = parseInt(String(currentValue))
          return {
            propertyId,
            fieldName: 'photos',
            issue: `Only ${count} photo(s) uploaded`,
            suggestedFix: `Add ${5 - count} more photos to reach recommended minimum`,
            priority: 'high',
            estimatedImpact: 'High - increases CTR by 20-30%',
            autoFixable: false,
            fixCode: `Add photos of: bedroom, bathroom, kitchen (${5 - count} total)`,
          }
        }
        break

      case 'amenities':
        if (message.includes('No amenities')) {
          return {
            propertyId,
            fieldName: 'amenities',
            issue: 'No amenities listed',
            suggestedFix: 'Add essential amenities: WiFi, Kitchen, AC/Heating, Washer, Dryer, TV, Parking',
            priority: 'high',
            estimatedImpact: 'High - increases appeal and CTR',
            autoFixable: false,
          }
        }
        if (message.includes('Only')) {
          const count = parseInt(String(currentValue))
          return {
            propertyId,
            fieldName: 'amenities',
            issue: `Only ${count} amenities listed`,
            suggestedFix: `Add ${10 - count} more amenities (WiFi, parking, kitchen, etc)`,
            priority: 'medium',
            estimatedImpact: 'Medium - improves booking rate',
            autoFixable: false,
          }
        }
        break

      case 'availability':
        if (message.includes('unavailable')) {
          return {
            propertyId,
            fieldName: 'availability',
            issue: 'Property is marked as unavailable',
            suggestedFix: 'Update calendar to mark available dates',
            priority: 'critical',
            estimatedImpact: 'Critical - property is not bookable',
            autoFixable: true,
            fixCode: 'Mark property as available in calendar',
          }
        }
        break

      case 'bedrooms':
      case 'bathrooms':
        return {
          propertyId,
          fieldName,
          issue: `${fieldName} count is missing`,
          suggestedFix: `Specify the number of ${fieldName}`,
          priority: 'critical',
          estimatedImpact: 'Critical - needed for search filtering',
          autoFixable: false,
        }

      case 'reviews':
        return {
          propertyId,
          fieldName: 'reviews',
          issue: 'Property has no reviews yet',
          suggestedFix: 'Encourage guests to leave reviews; improve guest experience',
          priority: 'medium',
          estimatedImpact: 'Medium - new properties take time to accumulate reviews',
          autoFixable: false,
        }

      case 'rating':
        if (message.includes('low')) {
          return {
            propertyId,
            fieldName: 'rating',
            issue: `Rating is low (${currentValue}/5)`,
            suggestedFix: 'Improve cleanliness, amenities, and communication; address guest complaints',
            priority: 'high',
            estimatedImpact: 'High - low ratings reduce bookings significantly',
            autoFixable: false,
          }
        }
        break
    }

    return null
  }

  async autoFixProperty(
    propertyId: string,
    propertyData: Record<string, unknown>
  ): Promise<FixResult[]> {
    const results: FixResult[] = []

    try {
      // Auto-fix: Trim whitespace from string fields
      const stringFields = ['title', 'description', 'address']
      for (const field of stringFields) {
        const value = propertyData[field]
        if (typeof value === 'string') {
          const trimmed = value.trim()
          if (trimmed !== value) {
            results.push({
              applied: true,
              fieldName: field,
              oldValue: value,
              newValue: trimmed,
              message: `Trimmed whitespace from ${field}`,
            })
            propertyData[field] = trimmed
          }
        }
      }

      // Auto-fix: Capitalize title
      if (typeof propertyData.title === 'string') {
        const title = propertyData.title as string
        const capitalized = title.charAt(0).toUpperCase() + title.slice(1)
        if (capitalized !== title) {
          results.push({
            applied: true,
            fieldName: 'title',
            oldValue: title,
            newValue: capitalized,
            message: 'Capitalized first letter of title',
          })
          propertyData.title = capitalized
        }
      }

      // Auto-fix: Ensure price is positive
      const price = propertyData.price
      if (price !== undefined) {
        const numPrice = typeof price === 'string' ? parseFloat(price) : (price as number)
        if (numPrice < 0) {
          results.push({
            applied: true,
            fieldName: 'price',
            oldValue: price,
            newValue: Math.abs(numPrice),
            message: 'Corrected negative price to absolute value',
          })
          propertyData.price = Math.abs(numPrice)
        }
      }

      // Auto-fix: Remove duplicate amenities
      if (Array.isArray(propertyData.amenities)) {
        const amenities = propertyData.amenities as string[]
        const unique = Array.from(new Set(amenities))
        if (unique.length < amenities.length) {
          results.push({
            applied: true,
            fieldName: 'amenities',
            oldValue: amenities.length,
            newValue: unique.length,
            message: `Removed ${amenities.length - unique.length} duplicate amenities`,
          })
          propertyData.amenities = unique
        }
      }

      return results
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'AutoFixer', propertyId, method: 'autoFixProperty' },
      })

      return [
        {
          applied: false,
          fieldName: 'all',
          message: error instanceof Error ? error.message : 'Auto-fix failed',
        },
      ]
    }
  }
}

export const autoFixer = new AutoFixer()
