import { ConakryCommune, Region } from "@/services/addresses.service";

// Codes de base pour les régions (respectant le type Region)
const REGION_BASE_CODES: Record<Region, string> = {
  'CONAKRY': '10000',
  'BOKE': '20000',
  'KINDIA': '30000',
  'LABE': '40000',
  'MAMOU': '50000',
  'NZEREKORE': '60000',
  'FARANAH': '70000',
  'KANKAN': '80000',
};

// Codes spécifiques pour les communes de Conakry, ajustés pour 2025
const CONAKRY_DISTRICT_BASE_CODES: Record<ConakryCommune, string> = {
  'Kaloum': '10000',
  'Dixinn': '11000',
  'Ratoma': '12000',
  'Matam': '13000',
  'Matoto': '14000',
  'Lambanyi': '15000',
  'Sonfonia': '16000',
  'Gbessia': '17000',
  'Tombolia': '18000',
  'Kagbelen': '19000',
  'Sanoyah': '19100', 
  'Manéah': '19200',  
  'Kassa': '19300',
};

export const generatePostalCode = (region: Region, locationType: 'URBAIN' | 'RURAL', locationData: any): string => {
  if (locationType === 'URBAIN' && region === 'CONAKRY') {
    const commune = locationData.commune as ConakryCommune;
    return CONAKRY_DISTRICT_BASE_CODES[commune] || REGION_BASE_CODES['CONAKRY'];
  }
  return REGION_BASE_CODES[region] || '00000';
};

export const formatAddress = (address: any, postalCode: string): string => {
  const lines = [
    ...(address.location.type === 'URBAIN'
      ? [`${address.location.street ? address.location.street + ', ' : ''}Quartier ${address.location.district}, ${address.location.landmark}, Commune de ${address.location.commune} BP: ${postalCode} Conakry REPUBLIQUE DE GUINEE`]
      : [`Quartier ${address.location.district}, ${address.location.landmark}, Sous-préfecture de ${address.location.subPrefecture} BP: ${postalCode} ${address.location.prefecture} REPUBLIQUE DE GUINEE`])
  ];
  return lines.filter(Boolean).join(', ');
};