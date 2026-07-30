import { AppModeSwitcher } from '@/components/admin/app-mode-switcher';
import { CriteriosManager } from '@/components/admin/criterios-manager';
import { FinalCriteriaEditor } from '@/components/admin/final-criteria-editor';
import { FrenteWeightsEditor } from '@/components/admin/frente-weights-editor';
import {
  getAppMode,
  getCriteria,
  getFinalCriteria,
  getRatingWeights,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function AdminCriteriosPage() {
  const { user } = await getSession();

  if (!user || user.role !== 'Admin') {
    redirect('/dashboard');
  }

  const [criteria, weights, appMode, finalCriteria] = await Promise.all([
    getCriteria(),
    getRatingWeights(),
    getAppMode(),
    getFinalCriteria(),
  ]);

  return (
    <div className="container mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Criterios de evaluación
        </h1>
        <p className="text-muted-foreground">
          Elige el modo de la app y administra qué se evalúa en la
          preselección: pesos por frente, niveles, agregar nuevos criterios o
          eliminar los existentes.
        </p>
      </div>
      <AppModeSwitcher current={appMode} />
      <FinalCriteriaEditor initial={finalCriteria} />
      <FrenteWeightsEditor initial={weights} />
      <CriteriosManager criteria={criteria} />
    </div>
  );
}
