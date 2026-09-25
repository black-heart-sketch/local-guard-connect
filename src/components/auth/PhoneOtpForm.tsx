import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function PhoneOtpForm() {
  const [phone, setPhone] = useState('+2376');
  const [code, setCode] = useState('');
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const requestCode = async () => {
    setLoading(true);
    const { data, error } = await api.auth.requestOtp(phone);
    setLoading(false);
    if (error) return toast({ title: 'OTP error', description: error.message, variant: 'destructive' });
    setRequested(true);
    toast({ title: data?.sent ? 'Code sent by SMS' : 'SMS gateway not configured', description: data?.developmentCode ? `Development code: ${data.developmentCode}` : 'Enter the six-digit code.' });
  };

  const verify = async () => {
    setLoading(true);
    const { error } = await api.auth.verifyOtp(phone, code);
    setLoading(false);
    if (error) toast({ title: 'Invalid code', description: error.message, variant: 'destructive' });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label htmlFor="phone-otp">Cameroon phone number</Label><Input id="phone-otp" inputMode="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+2376XXXXXXXX" /></div>
      {requested && <div className="space-y-2"><Label htmlFor="otp-code">Six-digit code</Label><Input id="otp-code" inputMode="numeric" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} /></div>}
      <Button className="w-full" disabled={loading || (requested && code.length !== 6)} onClick={requested ? verify : requestCode}>{loading ? 'Please wait…' : requested ? 'Verify and sign in' : 'Send SMS code'}</Button>
      {requested && <Button variant="ghost" className="w-full" onClick={() => setRequested(false)}>Change number</Button>}
    </div>
  );
}
