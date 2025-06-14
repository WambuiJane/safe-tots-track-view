
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const { email, parentId } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the origin from the request headers
    const origin = req.headers.get('origin') || 'https://your-app.com'

    // Create user with child role
    const { data: userData, error: userError } = await supabaseClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          user_role: 'child',
        },
        // Set redirect URL to auth page so role-based redirection can work
        redirectTo: `${origin}/auth`
      }
    )

    if (userError) {
      console.error('Error creating user:', userError)
      return new Response(
        JSON.stringify({ error: userError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create parent-child relationship
    const { error: relationError } = await supabaseClient
      .from('parent_child_relations')
      .insert({
        parent_id: parentId,
        child_id: userData.user.id
      })

    if (relationError) {
      console.error('Error creating parent-child relation:', relationError)
      
      // Clean up the created user if relation creation fails
      await supabaseClient.auth.admin.deleteUser(userData.user.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to create parent-child relationship' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, childId: userData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
