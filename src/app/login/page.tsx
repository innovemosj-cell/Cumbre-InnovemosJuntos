import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/icons/logo';

export const runtime = 'edge';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col justify-center space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Logo className="mb-4 h-16 w-16" />
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            CalificApp
          </h1>
          <p className="text-muted-foreground">Innovemos Juntos</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}