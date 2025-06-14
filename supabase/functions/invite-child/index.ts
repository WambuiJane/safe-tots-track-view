
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

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    
    if (checkError && checkError.message !== 'User not found') {
      console.error('Error checking existing user:', checkError)
      return new Response(JSON.stringify({ error: 'Failed to check user existence' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
      })
    }

    let childUser = existingUser

    // If user doesn't exist, invite them
    if (!existingUser) {
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name: fullName,
            user_role: 'child',
          },
        }
      )

      if (inviteError) {
        console.error('Invite error:', inviteError)
        return new Response(JSON.stringify({ error: inviteError.message || 'Failed to invite child.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
      }
      
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
      message: existingUser ? 'Child linked successfully' : 'Child invited and linked successfully'
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
