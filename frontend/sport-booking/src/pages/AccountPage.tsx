import { useLocation, useNavigate } from 'react-router-dom';

import AccountDrawer, { type AccountSection } from '../components/account/AccountDrawer';

const AccountPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialSection = (location.state?.section ?? 'profile') as AccountSection;
  const returnPath = location.state?.from ?? '/';

  return (
    <AccountDrawer
      isOpen
      initialSection={initialSection}
      onClose={() => navigate(returnPath, { replace: true })}
    />
  );
};

export default AccountPage;

