
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const fetchUserRole = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_role, full_name')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
  return data;
};

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsNameSetup, setNeedsNameSetup] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle redirection based on user role when user is authenticated
  useEffect(() => {
    const handleUserRedirection = async () => {
      if (user) {
        console.log('User authenticated, checking role and profile for redirection...');
        const profile = await fetchUserRole(user.id);
        
        if (profile) {
          // Check if child user needs to set up their name
          if (profile.user_role === 'child' && !profile.full_name) {
            console.log('Child needs to set up their name');
            setNeedsNameSetup(true);
            return;
          }
          
          if (profile.user_role === 'child') {
            console.log('Redirecting child to child dashboard');
            navigate('/child-dashboard', { replace: true });
          } else {
            console.log('Redirecting to parent dashboard');
            navigate('/dashboard', { replace: true });
          }
        }
      }
    };

    handleUserRedirection();
  }, [user, navigate]);

  const handleNameSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user!.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update your profile. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome!",
          description: "Your profile has been set up successfully.",
        });
        navigate('/child-dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const authData = {
      email,
      password,
    };

    let error;

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        ...authData,
        options: {
          data: {
            user_role: 'parent',
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      error = signUpError;
      if (!error) {
        toast({
          title: "Check your email!",
          description: "We've sent you a confirmation link to verify your account.",
        });
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword(authData);
      error = signInError;
      // Redirection will be handled by the useEffect above
    }

    if (error) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  // If user is already authenticated but needs name setup
  if (user && needsNameSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Please enter your name to get started with Safe Tots Track.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNameSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is already authenticated, show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create an Account' : 'Welcome Back'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Enter your details to sign up as a parent.' : 'Sign in to access your dashboard.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
