import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const path = params.path?.join('/') || ''
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${API_URL}/leads${path ? `/${path}` : ''}${searchParams ? `?${searchParams}` : ''}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const path = params.path?.join('/') || ''
  const url = `${API_URL}/leads${path ? `/${path}` : ''}`

  try {
    const body = await request.json()
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
