import type { DeliveryZone } from "@/types";

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "zona-1",
    name: "Zona 1 · Lima Top",
    districts: [
      "Barranco",
      "Jesús María",
      "La Molina",
      "Lince",
      "Magdalena del Mar",
      "Miraflores",
      "Pueblo Libre",
      "San Borja",
      "San Isidro",
      "San Miguel",
      "Santiago de Surco",
      "Surquillo",
    ],
    costCents: 1200,
    freeFromCents: 25000,
    eta: "Entrega en 24 horas",
  },
  {
    id: "zona-2",
    name: "Zona 2 · Lima Metropolitana y Callao",
    districts: [
      "Ate",
      "Bellavista",
      "Breña",
      "Callao",
      "Cercado de Lima",
      "Chorrillos",
      "Comas",
      "El Agustino",
      "Independencia",
      "La Perla",
      "La Victoria",
      "Los Olivos",
      "Rímac",
      "San Juan de Lurigancho",
      "San Juan de Miraflores",
      "San Luis",
      "San Martín de Porres",
      "Santa Anita",
      "Villa El Salvador",
      "Villa María del Triunfo",
    ],
    costCents: 2000,
    freeFromCents: 35000,
    eta: "Entrega en 24 a 48 horas",
  },
];

export function findZoneByDistrict(district: string): DeliveryZone | null {
  return (
    DELIVERY_ZONES.find((zone) => zone.districts.includes(district)) ?? null
  );
}

export function allDistricts(): { district: string; zone: DeliveryZone }[] {
  return DELIVERY_ZONES.flatMap((zone) =>
    zone.districts.map((district) => ({ district, zone })),
  ).sort((a, b) => a.district.localeCompare(b.district, "es"));
}
