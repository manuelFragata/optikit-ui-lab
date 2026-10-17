/**
 * Everything the lab stands in for, given to the views below it: the light
 * (the optics engine's place), the parts library and the service. The one
 * place the stand-ins are wired in; the app gives the real ones here.
 */
import type { ReactNode } from 'react';
import { LibraryProvider } from '../ports/library';
import { LightProvider } from '../ports/light';
import { ServiceProvider } from '../ports/service';
import { demoLight } from './kernel/light';
import { standinLibrary } from './library';
import { standinService } from './service';

const service = standinService(standinLibrary);

export function StandinsProvider({ children }: { children: ReactNode }) {
  return (
    <LightProvider value={demoLight}>
      <LibraryProvider value={standinLibrary}>
        <ServiceProvider value={service}>{children}</ServiceProvider>
      </LibraryProvider>
    </LightProvider>
  );
}
