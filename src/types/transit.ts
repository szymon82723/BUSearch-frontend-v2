import type { CitySlug } from "../config/city";

export interface Vehicle {
  linia: string;
  nr_boczny: string;
  lat: number;
  lon: number;
  raw_lat?: number;
  raw_lon?: number;
  predkosc: number;
  cel: string;
  trayecto?: string;
  ts?: string;
  opoznienie_s?: number;
  kierunek_ruch_deg?: number;
  calc_source?: string;
  trip_id?: string;
  brygada?: string;
  model?: string;
  electric?: boolean;
  photo?: string;
  wiki_nr?: string;
  nr_rzeczywisty?: string;
  typ?: "BUS" | "TRAM";
  offline?: boolean;
  layover_until_ms?: number;
  position_imprecise?: boolean;
  rok_produkcji?: number;
  notatka?: string;
  patron?: string;
}

export interface Stop {
  tram?: boolean;
  kolej?: boolean;
  kierunek?: number | null;
  kierunek_opis?: string;
  id: number;
  nazwa: string;
  kod: string;
  lat: number;
  lon: number;
  lines: string[];
  linie_kierunki?: {
    linia: string;
    kierunek: string;
    kierunki?: string[];
  }[];
}

export interface TransitLine {
  id: string;
  number: string;
  type: "BUS" | "TRAM" | string;
  grupa?: string;
  przystanki?: string;
}

export interface RouteGeometry {
  linia: number | string;
  trayectos: {
    trayecto_id: number;
    direccion: number;
    color?: string;
    nazwa: string;
    tekst_kierunkowy: string;
    punkty: [number, number][]; // [lat, lon]
    przystanki?: { id: number | string; nazwa: string; lat: number | null; lon: number | null; kod?: string; kolejnosc?: number }[];
  }[];
}

export interface StopDeparture {
  linia: string;
  cel: string;
  czas: string;
  niskopodlogowy?: boolean;
  atMs?: number;
  godzina?: string;
  delayMin?: number;
  wariant?: string;
  tripId?: string;
  source?: string;
  vehicleId?: string;
  sourceCity?: CitySlug;
  originCity?: CitySlug;
}

export interface VehicleEtaStop {
  id: number;
  name: string;
  lat: number;
  lon: number;
  passed?: boolean;
  current?: boolean;
  etaMin?: number;
  time?: string;
  plannedTime?: string;
  actualTime?: string;
  delayMin?: number;
}

export interface VehicleEtaResponse {
  ok: boolean;
  vehicleId: string;
  line: string;
  trayectoId?: string;
  vehicleLat?: number;
  vehicleLon?: number;
  nextIndex?: number;
  currentIndex?: number;
  delayMin?: number;
  stops: VehicleEtaStop[];
}

export interface Announcement {
  id: string;
  title: string;
  shortDesc: string;
  content?: string;
  body?: string;
  photos?: string[];
  createdAt: number;
}

export interface ConnectionTripLeg {
  line: string;
  type?: string;
  fromStop: string;
  toStop: string;
  depTime: string;
  arrTime: string;
  durationMin: number;
  stopsCount?: number;
  geometry?: [number, number][];
  fromStopId?: number | null;
  toStopId?: number | null;
  destination?: string;
}

export interface ConnectionOption {
  depTime: string;
  arrTime: string;
  durationMin: number;
  transfersCount: number;
  legs: ConnectionTripLeg[];
}


export interface LineTimetable {
  linia: string;
  przystanek: { id: string; nazwa: string };
  warianty: { idx: number; litera: string | null; kierunek: string; opis?: string }[];
  dni: { klucz: string; nazwa: string; data: string; date?: string; godziny: { h: number; m: { min: number; w: number; ozn?: string; litera?: string }[] }[] }[];
  objasnienia?: string[];
  zrodlo?: string;
  wazny_od?: string | null;
  wazny_do?: string | null;
  powod?: string;
}

export interface TripRun {
  linia: string;
  kierunek: string;
  odjazd: string;
  dzien: { klucz: string; nazwa: string; data: string };
  przystanki: { id: string | number; nazwa: string; czas: string; lat: number | null; lon: number | null; wybrany?: boolean }[];
  punkty: [number, number][];
}
