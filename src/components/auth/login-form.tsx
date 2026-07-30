'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { handleLoginWithCode } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Ingresando...' : 'Ingresar'}
      <KeyRound className="ml-2" />
    </Button>
  );
}

function CodeLoginForm() {
  const [state, formAction] = useActionState(handleLoginWithCode, undefined);
  const [showCode, setShowCode] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div className="relative space-y-2">
        <Label htmlFor="loginCode">Código de 4 dígitos</Label>
        <Input
          id="loginCode"
          name="loginCode"
          type="text"
          inputMode="numeric"
          placeholder="1234"
          required
          minLength={4}
          maxLength={4}
          className="pr-10"
          style={{ WebkitTextSecurity: showCode ? 'none' : 'disc' } as React.CSSProperties}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3"
          onClick={() => setShowCode(!showCode)}
          style={{ top: '1.25rem' }}
          aria-label={showCode ? 'Ocultar código' : 'Mostrar código'}
        >
          {showCode ? (
            <EyeOff className="h-5 w-5 text-gray-400" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>
      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <CardFooter className="p-0 pt-4">
        <SubmitButton />
      </CardFooter>
    </form>
  );
}

export function LoginForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl">Iniciar Sesión</CardTitle>
      </CardHeader>
      <CardContent>
        <CodeLoginForm />
      </CardContent>
    </Card>
  );
}
