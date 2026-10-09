import { citySlug, tramLines } from './city';
import type { Vehicle } from '../types/transit';

export type VehicleKind = 'BUS' | 'TRAM';
export interface VehicleFilters {
  types: VehicleKind[];
  models: string[];
  electricOnly: boolean;
  konstaleOnly: boolean;
  withPhoto: boolean;
  searchSideNumber: string;
  onlyWithoutFleetNumber: boolean;
}
export const emptyVehicleFilters = (): VehicleFilters => ({ types: [], models: [], electricOnly: false, konstaleOnly: false, withPhoto: false, searchSideNumber: '', onlyWithoutFleetNumber: false });
export const formatFleetNumber = (value: unknown) => {
  const number = String(value ?? '');
  return citySlug === 'torun' && /^\d{3}-\d{3}$/.test(number) ? number.replace('-', '+') : number;
};
export const isKonstalVehicle = (vehicle: Vehicle) => citySlug === 'torun' && /^\d{3}-\d{3}$/.test(String(vehicle.nr_rzeczywisty || vehicle.wiki_nr || vehicle.nr_boczny || '').trim());
export const vehicleKind = (vehicle: Vehicle): VehicleKind => vehicle.typ === 'TRAM' || tramLines.has(vehicle.linia) ? 'TRAM' : 'BUS';
export const hasFleetNumber = (vehicle: Vehicle) => Boolean(String(vehicle.wiki_nr || vehicle.nr_rzeczywisty || '').trim());
export const hasVehiclePhoto = (vehicle: Vehicle) => Boolean(String(vehicle.photo || '').trim());
export const hasVehicleIdentity = (vehicle: Vehicle) => Boolean(String(vehicle.model || '').trim() || (vehicle.nr_boczny && !/^(ISKA\d|GTFS-)/i.test(vehicle.nr_boczny)));
export function vehicleMatchesFilters(vehicle: Vehicle, filters: VehicleFilters): boolean {
  if (filters.types.length && !filters.types.includes(vehicleKind(vehicle))) return false;
  if (filters.models.length && !filters.models.includes(String(vehicle.model || '').trim())) return false;
  if (filters.electricOnly && vehicle.electric !== true) return false;
  if (filters.konstaleOnly && !isKonstalVehicle(vehicle)) return false;
  if (filters.withPhoto && !hasVehiclePhoto(vehicle)) return false;
  if (citySlug === 'torun' && filters.onlyWithoutFleetNumber && hasFleetNumber(vehicle)) return false;
  const terms = filters.searchSideNumber.trim().toLowerCase().replace(/\+/g, '-').split(/[,\s]+/).filter(Boolean);
  const identity = `${vehicle.brygada || ''} ${vehicle.nr_boczny} ${vehicle.nr_rzeczywisty || ''} ${vehicle.wiki_nr || ''}`.toLowerCase();
  return terms.every(term => identity.includes(term));
}
export function activeVehicleFilterCount(filters: VehicleFilters): number {
  return filters.types.length + filters.models.length + Number(filters.electricOnly) + Number(filters.konstaleOnly) + Number(filters.withPhoto) + Number(Boolean(filters.searchSideNumber.trim())) + Number(citySlug === 'torun' && filters.onlyWithoutFleetNumber);
}
