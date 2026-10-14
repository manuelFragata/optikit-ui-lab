/**
 * Placeholder sharing for the File tab: who has access to a design, and its
 * link. In the product both come from the accounts service.
 */
import type { SharePerson } from '../components/views/file/ShareSection';

export const demoPeople: SharePerson[] = [
  { name: 'Manu', email: 'manu@openuc2.example', role: 'owner' },
  { name: 'Paul Hartmann', email: 'paul.h@openuc2.example', role: 'edit' },
  { name: 'Lena Vogt', email: 'l.vogt@uni-jena.example', role: 'view' },
];

export const demoShareLink = (id: string) => `https://optikit.openuc2.com/d/${id}`;
