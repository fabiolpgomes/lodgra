import * as Sentry from '@sentry/nextjs'

interface PropertyIssue {
  propertyId: string
  fieldName: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  currentValue?: string | number | boolean
  suggestion?: string
}

interface ValidationReport {
  propertyId: string
  indexationStatus: 'indexed' | 'pending' | 'rejected' | 'error'
  issues: PropertyIssue[]
  lastValidated: string
  nextCheckTime: string
}

export class PropertyValidator {
  async validateProperty(
    propertyId: string,
    propertyData: Record<string, unknown>
  ): Promise<ValidationReport> {
    const issues: PropertyIssue[] = []

    try {
      // Title validation
      const title = propertyData.name as string | undefined
      if (!title || title.trim().length === 0) {
        issues.push({
          propertyId,
          fieldName: 'name',
          severity: 'critical',
          message: 'Property name is missing',
          suggestion: 'Add a descriptive property name (e.g., "Cozy Apartment in Lisbon")',
        })
      } else if (title.length > 100) {
        issues.push({
          propertyId,
          fieldName: 'name',
          severity: 'high',
          message: `Property name is too long (${title.length}/100 chars)`,
          currentValue: title,
          suggestion: 'Shorten the name to maximum 100 characters',
        })
      } else if (title.length < 10) {
        issues.push({
          propertyId,
          fieldName: 'name',
          severity: 'medium',
          message: `Property name is too short (${title.length}/10+ chars)`,
          currentValue: title,
          suggestion: 'Use a more descriptive name',
        })
      }

      // Description validation
      const description = propertyData.description as string | undefined
      if (!description || description.trim().length === 0) {
        issues.push({
          propertyId,
          fieldName: 'description',
          severity: 'high',
          message: 'Property description is missing',
          suggestion: 'Add a detailed description of your property',
        })
      } else if (description.length < 30) {
        issues.push({
          propertyId,
          fieldName: 'description',
          severity: 'medium',
          message: `Description too short (${description.length}/30+ chars)`,
          currentValue: description,
          suggestion: 'Expand description with more details about amenities and features',
        })
      } else if (description.length > 5000) {
        issues.push({
          propertyId,
          fieldName: 'description',
          severity: 'low',
          message: `Description is very long (${description.length} chars)`,
          suggestion: 'Consider shortening for better readability',
        })
      }

      // Address validation
      const address = propertyData.address as string | undefined
      if (!address || address.trim().length === 0) {
        issues.push({
          propertyId,
          fieldName: 'address',
          severity: 'critical',
          message: 'Address is missing',
          suggestion: 'Add complete property address with street, number, and city',
        })
      } else if (address.length < 10) {
        issues.push({
          propertyId,
          fieldName: 'address',
          severity: 'high',
          message: 'Address seems incomplete',
          currentValue: address,
          suggestion: 'Include street, number, postal code, and city',
        })
      }

      // Price validation
      const price = propertyData.price as number | string | undefined
      if (price === undefined || price === null) {
        issues.push({
          propertyId,
          fieldName: 'price',
          severity: 'critical',
          message: 'Price is missing',
          suggestion: 'Set a nightly rate for your property',
        })
      } else {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price
        if (isNaN(numPrice) || numPrice <= 0) {
          issues.push({
            propertyId,
            fieldName: 'price',
            severity: 'critical',
            message: 'Price is invalid',
            currentValue: price,
            suggestion: 'Set a positive numeric price',
          })
        } else if (numPrice > 100000) {
          issues.push({
            propertyId,
            fieldName: 'price',
            severity: 'high',
            message: 'Price seems unreasonably high',
            currentValue: numPrice,
            suggestion: 'Verify nightly rate is correct',
          })
        }
      }

      // Photos validation
      const photos = propertyData.photos as unknown[] | undefined
      const photoCount = Array.isArray(photos) ? photos.length : 0

      if (photoCount === 0) {
        issues.push({
          propertyId,
          fieldName: 'photos',
          severity: 'critical',
          message: 'Property has no photos',
          suggestion: 'Add at least 5-10 high-quality photos',
        })
      } else if (photoCount < 5) {
        issues.push({
          propertyId,
          fieldName: 'photos',
          severity: 'high',
          message: `Only ${photoCount} photo(s) (recommend 5+)`,
          currentValue: photoCount,
          suggestion: 'Add more photos to increase bookings (bedroom, bathroom, kitchen, living area)',
        })
      } else if (photoCount < 10) {
        issues.push({
          propertyId,
          fieldName: 'photos',
          severity: 'medium',
          message: `Property has ${photoCount} photos (recommend 8+)`,
          currentValue: photoCount,
          suggestion: 'Add a few more photos (exterior, amenities, views)',
        })
      }

      // Amenities validation
      const amenities = propertyData.amenities as string[] | undefined
      if (!amenities || amenities.length === 0) {
        issues.push({
          propertyId,
          fieldName: 'amenities',
          severity: 'high',
          message: 'No amenities listed',
          suggestion: 'Add at least 10 amenities (WiFi, kitchen, AC, etc)',
        })
      } else if (amenities.length < 5) {
        issues.push({
          propertyId,
          fieldName: 'amenities',
          severity: 'medium',
          message: `Only ${amenities.length} amenities listed`,
          currentValue: amenities.length,
          suggestion: 'Add more amenities to improve appeal',
        })
      }

      // Availability validation
      const availability = propertyData.availability as boolean | undefined
      if (!availability) {
        issues.push({
          propertyId,
          fieldName: 'availability',
          severity: 'high',
          message: 'Property is marked as unavailable',
          suggestion: 'Mark property as available in your calendar',
        })
      }

      // Bedrooms validation
      const bedrooms = propertyData.bedrooms as number | undefined
      if (!bedrooms || bedrooms < 1) {
        issues.push({
          propertyId,
          fieldName: 'bedrooms',
          severity: 'critical',
          message: 'Bedroom count is missing or invalid',
          suggestion: 'Specify number of bedrooms',
        })
      }

      // Bathrooms validation
      const bathrooms = propertyData.bathrooms as number | undefined
      if (!bathrooms || bathrooms < 1) {
        issues.push({
          propertyId,
          fieldName: 'bathrooms',
          severity: 'critical',
          message: 'Bathroom count is missing or invalid',
          suggestion: 'Specify number of bathrooms',
        })
      }

      // Reviews validation
      const reviewCount = (propertyData.review_count as number) || 0
      const rating = (propertyData.rating as number) || 0

      if (reviewCount === 0 && rating === 0) {
        issues.push({
          propertyId,
          fieldName: 'reviews',
          severity: 'medium',
          message: 'Property has no reviews yet',
          suggestion: 'Encourage guests to leave reviews after their stay',
        })
      } else if (rating > 0 && rating < 4.0) {
        issues.push({
          propertyId,
          fieldName: 'rating',
          severity: 'high',
          message: `Rating is low (${rating}/5)`,
          currentValue: rating,
          suggestion: 'Address guest concerns by improving cleanliness, amenities, or communication',
        })
      }

      const indexationStatus = this.determineIndexationStatus(issues)

      return {
        propertyId,
        indexationStatus,
        issues,
        lastValidated: new Date().toISOString(),
        nextCheckTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'PropertyValidator', propertyId },
      })

      issues.push({
        propertyId,
        fieldName: 'validation',
        severity: 'critical',
        message: error instanceof Error ? error.message : 'Validation failed',
      })

      return {
        propertyId,
        indexationStatus: 'error',
        issues,
        lastValidated: new Date().toISOString(),
        nextCheckTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      }
    }
  }

  private determineIndexationStatus(
    issues: PropertyIssue[]
  ): 'indexed' | 'pending' | 'rejected' | 'error' {
    const criticalIssues = issues.filter((i) => i.severity === 'critical')

    if (criticalIssues.length > 0) {
      return 'rejected'
    }

    const highIssues = issues.filter((i) => i.severity === 'high')
    if (highIssues.length > 2) {
      return 'pending'
    }

    return issues.length === 0 ? 'indexed' : 'pending'
  }
}

export const propertyValidator = new PropertyValidator()
