export interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  website?: string;
  logo?: string;
}

export const restaurantData: Restaurant[] = [
  {
    id: '1',
    name: 'The Golden Spoon',
    address: '123 Model Town',
    city: 'Colombo',
    email: 'contact@goldenspoon.lk',
    phone: '0112345678',
    website: 'https://goldenspoon.lk',
    logo: 'https://placehold.co/100x100?text=GS',
  },
  
];
