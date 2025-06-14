import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Shield, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
import AddChildDialog from "./AddChildDialog";

// The RLS policy on 'profiles' ensures parents can only see their own children.
const fetchChildren = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_role', 'child');

    if (error) {
        console.error("Error fetching children:", error);
        throw error;
    }
    return data;
}

type ChildrenManagerProps = {
    setSelectedChildId: (id: string | null) => void;
};

const ChildrenManager = ({ setSelectedChildId }: ChildrenManagerProps) => {
    const { user } = useAuth();
    const { data: children, isLoading, isError } = useQuery({
        queryKey: ['children', user?.id],
        queryFn: fetchChildren,
        enabled: !!user,
    });

    const ChildCard = ({ child }: { child: Tables<'profiles'> }) => (
        <div className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <p className="font-semibold">{child.full_name || "Unnamed Child"}</p>
                    <p className="text-sm text-muted-foreground">Status: Safe</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedChildId(child.id)}><MapPin className="h-4 w-4 mr-2" /> View on Map</Button>
                <Button variant="ghost" size="sm" disabled><Shield className="h-4 w-4 mr-2" /> Settings</Button>
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap gap-4 justify-between items-center">
                    <div>
                        <CardTitle>My Children</CardTitle>
                        <CardDescription>Manage your children's profiles and safety settings.</CardDescription>
                    </div>
                    <AddChildDialog />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading && (
                        <>
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </>
                    )}
                    {isError && <p className="text-destructive text-center py-8">Failed to load children.</p>}
                    {children && children.length > 0 ? (
                        children.map(child => <ChildCard key={child.id} child={child} />)
                    ) : (
                       !isLoading && !isError && <p className="text-center text-muted-foreground py-8">You haven't added any children yet. Click "Add Child" to get started.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default ChildrenManager;
