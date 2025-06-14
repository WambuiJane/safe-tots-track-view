
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
        return new Response(JSON.stringify({ error: 'User not authenticated' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        })
    }

    const { email, fullName } = await req.json()
    if (!email || !fullName) {
        return new Response(JSON.stringify({ error: 'Email and full name are required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check if user already exists by trying to invite them first
    // If they exist, the invite will fail with a specific error
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
          user_role: 'child',
        },
      }
    )

    let childUser = null
    let isExistingUser = false

    if (inviteError) {
      // Check if the error is because user already exists
      if (inviteError.message?.includes('already been registered') || inviteError.message?.includes('already exists')) {
        console.log('User already exists, will try to link existing user')
        isExistingUser = true
        
        // Try to find the existing user in profiles table
        const { data: existingProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .eq('id', 'auth.users.id')
          .limit(1)
          .single()

        if (profileError) {
          console.error('Could not find existing user profile')
          return new Response(JSON.stringify({ error: 'User exists but could not be found. Please ask them to sign up first.' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
          })
        }

        // For existing users, we'll create a simulated user object
        childUser = { id: existingProfile.id }
      } else {
        console.error('Invite error:', inviteError)
        return new Response(JSON.stringify({ error: inviteError.message || 'Failed to invite child.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
      }
    } else {
      childUser = inviteData?.user
    }

    if (!childUser) {
      return new Response(JSON.stringify({ error: 'Failed to get or create child user' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
      })
    }

    // Check if relationship already exists
    const { data: existingRelation, error: relationCheckError } = await supabaseAdmin
      .from('parent_child_relations')
      .select('*')
      .eq('parent_id', user.id)
      .eq('child_id', childUser.id)
      .single()

    if (relationCheckError && relationCheckError.code !== 'PGRST116') {
      console.error('Relation check error:', relationCheckError)
      return new Response(JSON.stringify({ error: 'Failed to check existing relationship' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
      })
    }

    // If relationship doesn't exist, create it
    if (!existingRelation) {
      const { error: relationError } = await supabaseAdmin
        .from('parent_child_relations')
        .insert({
          parent_id: user.id,
          child_id: childUser.id,
        })

      if (relationError) {
        console.error('Relation error:', relationError)
        return new Response(JSON.stringify({ error: 'Failed to link child to parent profile.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
      }
    }

    return new Response(JSON.stringify({ 
      user: childUser,
      message: isExistingUser ? 'Existing user linked successfully' : 'Child invited and linked successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
