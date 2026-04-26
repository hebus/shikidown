import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'guide',
    loadComponent: () => import('../pages/guide/guide').then((m) => m.GuideComponent),
  },
  {
    path: 'components',
    loadComponent: () => import('../pages/components/components-page').then((m) => m.ComponentsPageComponent),
  },
  {
    path: 'playground',
    loadComponent: () => import('../pages/playground/playground').then((m) => m.PlaygroundComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
