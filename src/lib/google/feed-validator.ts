import { parseStringPromise } from 'xml2js'
import * as Sentry from '@sentry/nextjs'

interface ValidationError {
  field: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  value?: string
}

interface FeedValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  timestamp: string
}

export class FeedValidator {
  private requiredFields = [
    'title',
    'address',
    'price',
    'currency',
    'check_in_time',
    'check_out_time',
    'bedroom_count',
  ]

  async validateXML(xmlContent: string): Promise<FeedValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    try {
      // Parse XML
      const parsed = await parseStringPromise(xmlContent)

      if (!parsed.feed || !Array.isArray(parsed.feed.property)) {
        errors.push({
          field: 'root',
          severity: 'critical',
          message: 'Invalid XML structure: missing feed or property elements',
        })

        return {
          valid: false,
          errors,
          warnings,
          timestamp: new Date().toISOString(),
        }
      }

      // Validate each property
      const properties = parsed.feed.property
      for (let i = 0; i < properties.length; i++) {
        const property = properties[i]
        const propertyId = property.id?.[0] || `property-${i}`

        // Check required fields
        for (const field of this.requiredFields) {
          if (!property[field]?.[0]) {
            errors.push({
              field,
              severity: 'critical',
              message: `Missing required field: ${field}`,
              value: propertyId,
            })
          }
        }

        // Validate photos
        const photos = property.photo || []
        if (photos.length === 0) {
          errors.push({
            field: 'photo',
            severity: 'critical',
            message: 'Property has no photos (minimum 1 required)',
            value: propertyId,
          })
        } else if (photos.length < 5) {
          warnings.push({
            field: 'photo',
            severity: 'medium',
            message: `Property has only ${photos.length} photos (recommend 5+)`,
            value: propertyId,
          })
        }

        // Validate price format
        if (property.price?.[0]) {
          const price = parseFloat(property.price[0])
          if (isNaN(price) || price <= 0) {
            errors.push({
              field: 'price',
              severity: 'critical',
              message: 'Invalid price: must be a positive number',
              value: propertyId,
            })
          }
        }

        // Validate address
        if (property.address?.[0]) {
          const address = property.address[0]
          if (address.length < 5) {
            warnings.push({
              field: 'address',
              severity: 'medium',
              message: 'Address seems incomplete',
              value: propertyId,
            })
          }
        }

        // Validate phone format
        if (property.phone?.[0]) {
          const phone = property.phone[0]
          const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
          if (!phoneRegex.test(phone)) {
            warnings.push({
              field: 'phone',
              severity: 'low',
              message: 'Phone number format may be invalid',
              value: propertyId,
            })
          }
        }

        // Validate email format
        if (property.email?.[0]) {
          const email = property.email[0]
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
            errors.push({
              field: 'email',
              severity: 'high',
              message: 'Invalid email format',
              value: propertyId,
            })
          }
        }

        // Validate availability dates
        if (property.availability?.[0]) {
          const availability = property.availability[0]
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/
          if (!dateRegex.test(availability)) {
            warnings.push({
              field: 'availability',
              severity: 'medium',
              message: 'Date should be in YYYY-MM-DD format',
              value: propertyId,
            })
          }
        }
      }

      const valid = errors.length === 0

      return {
        valid,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'FeedValidator', method: 'validateXML' },
      })

      errors.push({
        field: 'xml',
        severity: 'critical',
        message: error instanceof Error ? error.message : 'XML parsing failed',
      })

      return {
        valid: false,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
      }
    }
  }

  validatePropertyData(property: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = []

    // Validate title
    const title = property.title as string | undefined
    if (!title || title.trim().length === 0) {
      errors.push({
        field: 'title',
        severity: 'critical',
        message: 'Title is required',
      })
    } else if (title.length > 100) {
      errors.push({
        field: 'title',
        severity: 'high',
        message: 'Title is too long (max 100 characters)',
        value: title,
      })
    }

    // Validate description
    const description = property.description as string | undefined
    if (description && description.length < 20) {
      errors.push({
        field: 'description',
        severity: 'medium',
        message: 'Description is too short (min 20 characters)',
        value: description,
      })
    }

    // Validate bedroom count
    const bedrooms = property.bedroom_count as number | undefined
    if (bedrooms === undefined || bedrooms < 1) {
      errors.push({
        field: 'bedroom_count',
        severity: 'critical',
        message: 'Bedroom count must be at least 1',
      })
    }

    // Validate guest count
    const guests = property.guest_count as number | undefined
    if (guests === undefined || guests < 1) {
      errors.push({
        field: 'guest_count',
        severity: 'critical',
        message: 'Guest capacity must be at least 1',
      })
    }

    return errors
  }
}

export const feedValidator = new FeedValidator()
