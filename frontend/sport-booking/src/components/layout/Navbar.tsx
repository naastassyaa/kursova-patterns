import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../context/AuthContext';
import type { AccountSection } from '../account/AccountDrawer';
import { loadProfile } from '../../utils/profileStorage';
import { fetchNotifications } from '../../api/customer';

const navLinks = [
  { label: 'Головна', path: '/' },
  { label: 'Секції', path: '/sections' },
  { label: 'Центри', path: '/centers' },
  { label: 'Тренери', path: '/coaches' },
  { label: 'Абонементи', path: '/subscriptions' },
];

const dropdownItems: Array<{ id: AccountSection; label: string }> = [
  { id: 'profile', label: 'Профіль' },
  { id: 'notifications', label: 'Повідомлення' },
  { id: 'bookings', label: 'Бронювання' },
  { id: 'subscriptions', label: 'Абонементи' },
  { id: 'loyalty', label: 'Лояльність' },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const initials = user?.username?.[0]?.toUpperCase() ?? 'П';
  const greetingName = useMemo(() => {
    const profile = loadProfile();
    if (profile) {
      const composed = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
      if (composed) {
        return composed.toUpperCase();
      }
    }
    if (user?.username) {
      const namePart = user.username.split('@')[0];
      return namePart ? namePart.toUpperCase() : user.username.toUpperCase();
    }
    return 'КОРИСТУВАЧ';
  }, [user?.username]);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ['me', 'notifications'],
    queryFn: fetchNotifications,
    enabled: isAuthenticated,
  });

  const unreadCount = useMemo(() => {
    if (!notificationsQuery.data) return 0;
    return notificationsQuery.data.filter((n) => !n.is_read).length;
  }, [notificationsQuery.data]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen]);

  const openSection = (section: AccountSection) => {
    setMenuOpen(false);
    navigate('/account', {
      state: { section, from: location.pathname, background: location, modal: 'account' },
    });
  };

  return (
    <header className="app-navbar">
      <div className="app-navbar__brand">
        <NavLink to="/">
          <span className="brand-mark">Sport Booking</span>
        </NavLink>
        <p className="brand-caption">Мережа спортивних центрів</p>
      </div>
      <nav className="app-navbar__nav">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              clsx('nav-link', {
                active: isActive || (link.path === '/' && location.pathname === '/'),
              })
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="app-navbar__actions">
        {isAuthenticated ? (
          <div className="account-dropdown" ref={menuRef}>
            <button
              type="button"
              className="account-dropdown__toggle"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
                  <span className="profile-initial">{initials}</span>
                  <span>{`Вітаємо, ${greetingName}`}</span>
              <span aria-hidden="true">▾</span>
            </button>
            {isMenuOpen && (
              <div className="account-dropdown__menu">
                {dropdownItems.map((item) => {
                  const showBadge = item.id === 'notifications' && unreadCount > 0;
                  return (
                    <button key={item.id} type="button" onClick={() => openSection(item.id)} style={{ position: 'relative' }}>
                      {item.label}
                      {showBadge && (
                        <span className="notification-badge notification-badge--count">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/admin');
                    }}
                  >
                    Адмін панель
                  </button>
                )}
                <button type="button" onClick={logout}>
                  Вийти з акаунту
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link className="ghost-button" to="/auth/login">
              Увійти
            </Link>
            <Link className="primary-button" to="/auth/register">
              Реєстрація
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;

