
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

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
          user_role: 'child',
        },
      }
    )

    if (inviteError || !inviteData?.user) {
      console.error('Invite error:', inviteError)
      return new Response(JSON.stringify({ error: inviteError?.message || 'Failed to invite child.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
      })
    }
    
    const childUser = inviteData.user

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

    return new Response(JSON.stringify(childUser), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
