import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import facebook from "../../../attached_assets/facebook.svg"
import tiktok from "../../../attached_assets/tiktok.svg"
import { Helmet } from "react-helmet-async";

import { functions } from '@/lib/firebase';

export default function DeleteAccount() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');


  const mutation = useMutation({
    mutationFn: async () => {
      const fn = httpsCallable(functions, 'deleteUserRequest');
      await fn({ email });
    },
    onSuccess: () => {
      toast({ title: 'Request sent', description: 'Check your email for confirmation link.' });
      setEmail('');
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
  <div className="clay-bg min-h-screen flex flex-col items-center p-4">
      <Helmet>
        <title>Delete Account | TwoPaws</title>
        <meta name="description" content="Request deletion of your TwoPaws account." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://twopaws.pet/delete-account" />
      </Helmet>
      <SiteHeader />
    <Card className="w-full max-w-md my-24">
        <CardContent className="pt-6 space-y-4">
          <h1 className="text-2xl font-bold">Request account deletion</h1>
          <p className="text-sm text-gray-600">Deleting your account is permanent and cannot be undone.</p>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !email}>
            {mutation.isPending ? 'Sending...' : 'Request deletion'}
          </Button>
        </CardContent>
      </Card>
    <SiteFooter />

    </div>
  );
}
