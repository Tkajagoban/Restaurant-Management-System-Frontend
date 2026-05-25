
import { getAllRoles } from '../roleManagement/RoleManagement.api';
import { getUsers, type User } from '../userManagement/UserManagement.api';

export const getStewards = async (restaurantId: string): Promise<User[]> => {
    try {
        // 1. Get all roles to find the ID for "Steward"
        const rolesResponse = await getAllRoles(restaurantId);
        const stewardRole = rolesResponse.data.find(
            role => role.roleName.toLowerCase() === 'steward'
        );

        if (!stewardRole) {
            console.warn('Steward role not found');
            return [];
        }

        // 2. Fetch users with the Steward role ID
        const usersResponse = await getUsers(Number(restaurantId), {
            roleId: stewardRole.id,
            size: 100 // Fetch a reasonable number of stewards
        });

        return usersResponse.data.content;
    } catch (error) {
        console.error('Error fetching stewards:', error);
        return [];
    }
};
