import { NextRequest, NextResponse } from 'next/server'
import { validatePasswordResetToken } from '@/lib/auth/passwordResetToken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      )
    }

    // Validate token
    const userId = await validatePasswordResetToken(token)

    if (!userId) {
      return NextResponse.json(
        { error: 'Token inválido, expirado ou já utilizado' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      userId,
    })
  } catch (error) {
    console.error('Error validating password token:', error)
    return NextResponse.json(
      { error: 'Erro ao validar token' },
      { status: 500 }
    )
  }
}
