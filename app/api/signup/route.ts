import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, gymName } = await request.json()

    if (!email || !password || !gymName) {
      return NextResponse.json(
        { error: 'Email, password, and gym name are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 400 }
      )
    }

    // Wait a moment for the session to be established
    await new Promise(resolve => setTimeout(resolve, 100))

    // Sign in the user to establish session
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 400 })
    }

    // Create gym record (now with active session)
    const { error: gymError } = await supabase.from('gyms').insert({
      user_id: authData.user.id,
      name: gymName,
      email,
    })

    if (gymError) {
      return NextResponse.json({ error: gymError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during signup' },
      { status: 500 }
    )
  }
}
