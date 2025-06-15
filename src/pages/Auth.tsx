
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [loginType, setLoginType] = useState<'parent' | 'child'>('parent');
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
          
          // Check if user needs to set up password (invited child)
          if (profile.user_role === 'child') {
            // Check if this is their first login by checking if they have a password set
            const { data: session } = await supabase.auth.getSession();
            if (session?.session?.user?.app_metadata?.provider === 'email' && 
                !session?.session?.user?.user_metadata?.password_set) {
              console.log('Child needs to set up password');
              setNeedsPasswordSetup(true);
              return;
            }
            
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

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast({
        title: "Password Required",
        description: "Please enter a password with at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
        data: { password_set: true }
      });

      if (error) {
        console.error('Error setting password:', error);
        toast({
          title: "Error",
          description: "Failed to set password. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Set!",
          description: "Your password has been set successfully.",
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
        // Check if password also needs to be set
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user?.app_metadata?.provider === 'email' && 
            !session?.session?.user?.user_metadata?.password_set) {
          setNeedsNameSetup(false);
          setNeedsPasswordSetup(true);
        } else {
          navigate('/child-dashboard', { replace: true });
        }
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
      // Validate full name for parent signup
      if (!fullName.trim()) {
        toast({
          title: "Name Required",
          description: "Please enter your full name to create an account.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        ...authData,
        options: {
          data: {
            user_role: 'parent',
            full_name: fullName.trim(),
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

  // If user needs to set up password
  if (user && needsPasswordSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Set Your Password</CardTitle>
            <CardDescription>
              Please set a password for your account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Setting password...' : 'Set Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-700">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {isSignUp ? 'Create Parent Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isSignUp ? 'Join Linda Mtoto App to keep your children safe.' : 'Sign in to access your dashboard.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSignUp && (
            <Tabs value={loginType} onValueChange={(value) => setLoginType(value as 'parent' | 'child')} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                <TabsTrigger value="parent" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">Parent Login</TabsTrigger>
                <TabsTrigger value="child" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">Child Login</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-700">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg" 
              disabled={loading}
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : `Sign In as ${loginType}`}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-purple-600 hover:text-purple-800 underline font-medium"
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
