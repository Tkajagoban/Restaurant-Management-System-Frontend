import { useAppSelector } from '../redux/hooks';

export function usePrivilege(privilegeName: string) {
    const privileges = useAppSelector((state) => state.privilege.privileges);
    const privilege = privileges[privilegeName];

    if (!privilege) {
        return {
            canRead: false,
            canWrite: false,
            canMaintain: false,
        };
    }

    const { privilegeStatus, isMaintain } = privilege;

    return {
        canRead: ['READ', 'WRITE', 'MAINTAIN'].includes(privilegeStatus),
        canWrite: ['WRITE', 'MAINTAIN'].includes(privilegeStatus),
        canMaintain: isMaintain === 1 || privilegeStatus === 'MAINTAIN',
    };
}
