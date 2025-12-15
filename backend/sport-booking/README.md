# Sport Booking Platform

Повноцінна інформаційна система для мережі спортивних центрів:
- публічний каталог залів/секцій/розкладу (`/api/catalog/*`);
- особистий кабінет користувача з бронюваннями, абонементами, бонусами та сповіщеннями (`/api/me/*`);
- адміністративний модуль керування сутностями (`/api/admin/*`) + стандартна Django Admin;
- мінімальний веб-інтерфейс на `/app/`, що ілюструє взаємодію через REST.

## Швидкий старт

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd sportbooking
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Демодані

```bash
cd sportbooking
python manage.py seed_demo
# або з пересозданням
python manage.py seed_demo --force
```

Далі:
- Swagger UI – `http://localhost:8000/api/schema/swagger-ui/`
- Публічна сторінка – `http://localhost:8000/app/`

## Основні можливості

- Каталог спортивних центрів, залів, секцій, тренерів, слотів розкладу з фільтрами.
- JWT-автентифікація, реєстрація з розширеним профілем.
- Онлайн-бронювання з платіжною фабрикою (карта / Apple Pay / Google Pay / готівка).
- Лояльність (стратегії стандарт/преміум/корпоратив), автоматичні бонуси та апгрейд тиру.
- Персональні сповіщення (Observer), нагадування про тренування, промо.
- Управління абонементами/підписками (користувацьке та адміністративне).
- Автоматична документація API через `drf-spectacular`.

## Архітектура та документація

- **Сервісний шар** (`api/services/`) реалізує GoF/GRASP-патерни:
  - Strategy (`loyalty.py`)
  - Observer (`notifications.py`)
  - Factory Method (`payments.py`)
  - Facade/Controller (`booking.py`)
- **Діаграми**: `docs/use-case.puml`, `docs/class-diagram.puml`
- **Архітектурний опис**: `docs/design.md`

## Маршрути

| Маршрут | Призначення |
| --- | --- |
| `/api/catalog/*` | публічні каталоги (зали, секції, розклад) |
| `/api/me/bookings/` | бронювання користувача (CRUD + `POST /{id}/cancel`) |
| `/api/me/memberships/` | абонементи користувача |
| `/api/me/loyalty/` | бонусний рахунок |
| `/api/me/notifications/` | сповіщення, `POST /{id}/mark_read` |
| `/api/admin/*` | CRUD для центрів, залів, тренерів, секцій, розкладів, підписок, абонементів |
| `/app/` | мінімальний веб-клієнт |

## Подальший розвиток

- Інтеграція з реальними платіжними сервісами та e-mail/SMS шлюзами.
- KPI-панель для менеджерів, звіти по завантаженню та фінансах.
- Mobile-first SPA або React Native клієнт.