// Restaurant Data
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

let restaurants: Restaurant[] = [
    { id: '1', name: 'The Golden Spoon', address: '123 Main St', city: 'Colombo', email: 'gold@spoon.lk', phone: '0112345678', website: 'https://goldenspoon.lk', logo: 'https://placehold.co/100x100?text=GS' },
    // { id: '2', name: 'Spicy Hut', address: '45 Galle Rd', city: 'Dehiwala', email: 'info@spicy.lk', phone: '0771234567', logo: 'https://placehold.co/100x100?text=SH' },
    // { id: '3', name: 'Ocean View', address: '89 Beach Rd', city: 'Negombo', email: 'hello@oceanview.lk', phone: '0311234567', website: 'https://oceanview.lk', logo: 'https://placehold.co/100x100?text=OV' },
];

export const restaurantService = {
    getAll: () => [...restaurants],
    getById: (id: string) => restaurants.find(r => r.id === id),
    add: (data: Omit<Restaurant, 'id'>) => {
        const newRestaurant: Restaurant = { ...data, id: Date.now().toString() };
        restaurants = [newRestaurant, ...restaurants];
        return newRestaurant;
    },
    update: (id: string, data: Partial<Restaurant>) => {
        restaurants = restaurants.map(r => r.id === id ? { ...r, ...data } : r);
        return restaurants.find(r => r.id === id);
    },
    remove: (id: string) => {
        restaurants = restaurants.filter(r => r.id !== id);
    },
};

// Role Data
export interface Role {
    id: string;
    name: string;
    restaurantId: string;
    createdAt: string;
}

let roles: Role[] = [];

export const roleService = {
    getAll: () => [...roles],
    getById: (id: string) => roles.find(r => r.id === id),
    add: (data: Omit<Role, 'id' | 'createdAt'>) => {
        const newRole: Role = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] };
        roles = [newRole, ...roles];
        return newRole;
    },
    update: (id: string, data: Partial<Role>) => {
        roles = roles.map(r => r.id === id ? { ...r, ...data } : r);
        return roles.find(r => r.id === id);
    },
    remove: (id: string) => {
        roles = roles.filter(r => r.id !== id);
    },
};