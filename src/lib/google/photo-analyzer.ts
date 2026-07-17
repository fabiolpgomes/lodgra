import * as Sentry from '@sentry/nextjs'

interface PhotoMetadata {
  url: string
  size: number
  width?: number
  height?: number
  format?: string
}

interface PhotoQualityIssue {
  photoUrl: string
  issue: 'low_resolution' | 'dark' | 'blurry' | 'duplicate' | 'irrelevant'
  severity: 'high' | 'medium' | 'low'
  message: string
  suggestion?: string
}

interface PhotoAnalysisResult {
  propertyId: string
  totalPhotos: number
  qualityScore: number // 1-5
  coverageScore: number // 1-5 (diversity of spaces)
  issues: PhotoQualityIssue[]
  missingTypes: string[]
  recommendations: string[]
  timestamp: string
}

export class PhotoAnalyzer {
  private requiredPhotoTypes = [
    'bedroom',
    'bathroom',
    'kitchen',
    'living_area',
    'exterior',
  ]

  async analyzePhotos(propertyId: string, photos: PhotoMetadata[]): Promise<PhotoAnalysisResult> {
    const issues: PhotoQualityIssue[] = []
    const missingTypes: string[] = []

    try {
      if (photos.length === 0) {
        return {
          propertyId,
          totalPhotos: 0,
          qualityScore: 1,
          coverageScore: 1,
          issues: [
            {
              photoUrl: '',
              issue: 'irrelevant',
              severity: 'high',
              message: 'No photos uploaded',
              suggestion: 'Upload at least 5 high-quality photos',
            },
          ],
          missingTypes: this.requiredPhotoTypes,
          recommendations: ['Upload 5-10 professional photos with good lighting and composition'],
          timestamp: new Date().toISOString(),
        }
      }

      // Analyze each photo
      for (const photo of photos) {
        const photoIssues = this.analyzePhoto(photo)
        issues.push(...photoIssues)
      }

      // Analyze coverage (assuming photo types are tagged)
      const coverageScore = this.calculateCoverageScore(photos.length)

      // Determine missing types (would require image analysis in production)
      const hasVariety = photos.length >= 5
      if (!hasVariety) {
        this.requiredPhotoTypes.forEach((type) => {
          missingTypes.push(type)
        })
      }

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(photos.length, issues.length)

      // Generate recommendations
      const recommendations = this.generatePhotoRecommendations(
        photos.length,
        issues,
        missingTypes
      )

      return {
        propertyId,
        totalPhotos: photos.length,
        qualityScore,
        coverageScore,
        issues,
        missingTypes,
        recommendations,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'PhotoAnalyzer', propertyId },
      })

      return {
        propertyId,
        totalPhotos: photos.length,
        qualityScore: 1,
        coverageScore: 1,
        issues: [
          {
            photoUrl: '',
            issue: 'irrelevant',
            severity: 'high',
            message: 'Photo analysis failed',
          },
        ],
        missingTypes: [],
        recommendations: ['Contact support for photo analysis'],
        timestamp: new Date().toISOString(),
      }
    }
  }

  private analyzePhoto(photo: PhotoMetadata): PhotoQualityIssue[] {
    const issues: PhotoQualityIssue[] = []

    // Check resolution (minimum 1024x768 for web)
    if (photo.width && photo.height) {
      const minDimension = Math.min(photo.width, photo.height)
      if (minDimension < 768) {
        issues.push({
          photoUrl: photo.url,
          issue: 'low_resolution',
          severity: 'medium',
          message: `Resolution is low (${photo.width}x${photo.height}). Recommend 1024x768 or higher.`,
          suggestion: 'Upload high-resolution version',
        })
      }
    }

    // Check file size (should be < 5MB for web)
    if (photo.size > 5 * 1024 * 1024) {
      issues.push({
        photoUrl: photo.url,
        issue: 'low_resolution',
        severity: 'low',
        message: `File size is large (${(photo.size / 1024 / 1024).toFixed(1)}MB). Consider compressing.`,
        suggestion: 'Compress to < 2MB for faster loading',
      })
    }

    // Format check (JPEG/PNG preferred)
    if (photo.format && !['jpeg', 'jpg', 'png', 'webp'].includes(photo.format.toLowerCase())) {
      issues.push({
        photoUrl: photo.url,
        issue: 'irrelevant',
        severity: 'low',
        message: `Format ${photo.format} may not be optimal. Use JPEG or PNG.`,
        suggestion: 'Convert to JPEG or PNG format',
      })
    }

    return issues
  }

  private calculateQualityScore(photoCount: number, issueCount: number): number {
    // Base score on count
    let score = Math.min(5, 1 + (photoCount / 10) * 4)

    // Deduct for issues
    const issuePenalty = Math.min(2, issueCount * 0.2)
    score = Math.max(1, score - issuePenalty)

    return Math.round(score * 10) / 10
  }

  private calculateCoverageScore(photoCount: number): number {
    if (photoCount < 5) return Math.ceil((photoCount / 5) * 3)
    if (photoCount < 8) return 4
    return 5
  }

  private generatePhotoRecommendations(
    photoCount: number,
    issues: PhotoQualityIssue[],
    missingTypes: string[]
  ): string[] {
    const recommendations: string[] = []

    if (photoCount === 0) {
      recommendations.push('Upload at least 5 high-quality photos')
      return recommendations
    }

    if (photoCount < 5) {
      recommendations.push(
        `Add ${5 - photoCount} more photos (focus on: ${missingTypes.slice(0, 3).join(', ')})`
      )
    }

    if (photoCount < 8) {
      recommendations.push('Add 2-3 more photos for better coverage (exterior, amenities, detail shots)')
    }

    if (photoCount < 12) {
      recommendations.push('Consider adding 360° virtual tour or drone shots for premium listing')
    }

    // Address specific issues
    const highSeverityIssues = issues.filter((i) => i.severity === 'high')
    if (highSeverityIssues.length > 0) {
      const issueTypes = new Set(highSeverityIssues.map((i) => i.issue))
      if (issueTypes.has('low_resolution')) {
        recommendations.push('Replace low-resolution photos with high-quality versions')
      }
      if (issueTypes.has('dark')) {
        recommendations.push('Improve lighting in dark photos (use natural light or better flash)')
      }
      if (issueTypes.has('blurry')) {
        recommendations.push('Replace blurry photos with sharp, well-focused images')
      }
    }

    // Composition suggestions
    if (missingTypes.length > 0) {
      recommendations.push(`Ensure coverage of: ${missingTypes.slice(0, 2).join(', ')}`)
    }

    recommendations.push('Use consistent lighting and composition style across all photos')
    recommendations.push('Avoid cluttered backgrounds and focus on property highlights')

    return recommendations
  }
}

export const photoAnalyzer = new PhotoAnalyzer()
