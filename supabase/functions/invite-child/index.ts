
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, childName, parentId } = await req.json()

    console.log('Inviting child:', { email, childName, parentId })

    // First, try to invite the user
    const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: childName,
        user_role: 'child'
      }
    })

    let childUserId: string

    if (inviteError) {
      console.log('Invite error:', inviteError)
      
      // If user already exists, get their ID
      if (inviteError.message.includes('already been registered')) {
        console.log('User already exists, finding existing user...')
        
        // Get the existing user by email
        const { data: users, error: getUserError } = await supabaseClient.auth.admin.listUsers()
        
        if (getUserError) {
          console.error('Error fetching users:', getUserError)
          throw new Error('Failed to check existing users')
        }

        const existingUser = users.users.find(user => user.email === email)
        
        if (!existingUser) {
          throw new Error('User not found despite registration error')
        }

        childUserId = existingUser.id

        // Update the existing user to be a child if they aren't already
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ 
            user_role: 'child',
            full_name: childName 
          })
          .eq('id', childUserId)

        if (updateError) {
          console.error('Error updating user role:', updateError)
          throw new Error('Failed to update user role')
        }
      } else {
        throw inviteError
      }
    } else {
      childUserId = inviteData.user.id
      console.log('User invited successfully:', childUserId)
    }

    // Create parent-child relationship
    const { error: relationError } = await supabaseClient
      .from('parent_child_relations')
      .insert({
        parent_id: parentId,
        child_id: childUserId
      })

    if (relationError) {
      // Check if relationship already exists
      if (relationError.code === '23505') {
        console.log('Parent-child relationship already exists')
        return new Response(
          JSON.stringify({ success: true, message: 'Child already linked to parent' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      } else {
        console.error('Error creating parent-child relation:', relationError)
        throw new Error('Failed to create parent-child relationship')
      }
    }

    console.log('Child invitation process completed successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
