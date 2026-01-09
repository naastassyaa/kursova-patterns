from __future__ import annotations

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
    Booking,
    GymHall,
    LoyaltyAccount,
    LoyaltyTier,
    Notification,
    Payment,
    ScheduleSlot,
    Section,
    SportCenter,
    Subscription,
    Trainer,
    User,
    UserMembership,
)
from api.services.booking import BookingService


class Command(BaseCommand):
    help = "Populate the database with demo sport centers, sections, schedules and bookings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recreate demo data even if records already exist.",
        )

    def handle(self, *args, **options):
        has_data = any([
            GymHall.objects.exists(),
            Section.objects.exists(),
            ScheduleSlot.objects.exists(),
            Booking.objects.exists(),
            Trainer.objects.exists(),
        ])
        if has_data and not options["force"]:
            self.stdout.write(self.style.WARNING("Existing data detected. Use --force to recreate demo content."))
            return
        if has_data and options["force"]:
            self._reset_data()
        centers = self._create_centers()
        halls = self._create_halls(centers)
        trainers = self._create_trainers(centers, halls)
        sections = self._create_sections(halls, trainers)
        slots = self._create_schedule_slots(sections)
        subscriptions = self._create_subscriptions()
        users = self._create_users()
        self._assign_memberships(users, subscriptions)
        self._create_sample_bookings(users, slots)

        self.stdout.write(self.style.SUCCESS("Demo data successfully created."))

    def _reset_data(self):
        Payment.objects.all().delete()
        Booking.objects.all().delete()
        Notification.objects.all().delete()
        LoyaltyAccount.objects.all().delete()
        UserMembership.objects.all().delete()
        ScheduleSlot.objects.all().delete()
        Section.objects.all().delete()
        Trainer.objects.all().delete()
        GymHall.objects.all().delete()
        SportCenter.objects.all().delete()
        Subscription.objects.all().delete()
        LoyaltyTier.objects.all().delete()
        User.objects.all().delete()

    def _create_centers(self):
        centers_data = [
            {
                "name": "Спортивна арена Львів",
                "city": "Львів",
                "address": "вул. Стрийська, 45",
                "contact_phone": "+380671112233",
                "email": "lviv1@sportarena.ua",
                "opening_hours": "07:00 - 23:00",
            },
            {
                "name": "Фітнес центр Львів",
                "city": "Львів",
                "address": "пр. Свободи, 28",
                "contact_phone": "+380671234567",
                "email": "lviv2@fitness.ua",
                "opening_hours": "06:00 - 22:00",
            },
            {
                "name": "Спортивний комплекс Київ",
                "city": "Київ",
                "address": "вул. Хрещатик, 15",
                "contact_phone": "+380501234567",
                "email": "kyiv1@sportcomplex.ua",
                "opening_hours": "06:00 - 23:00",
            },
            {
                "name": "Активне життя Київ",
                "city": "Київ",
                "address": "пр. Перемоги, 88",
                "contact_phone": "+380509876543",
                "email": "kyiv2@activelife.ua",
                "opening_hours": "07:00 - 22:00",
            },
            {
                "name": "Спорт центр Тернопіль",
                "city": "Тернопіль",
                "address": "вул. Грушевського, 12",
                "contact_phone": "+380352123456",
                "email": "ternopil@sportcenter.ua",
                "opening_hours": "07:00 - 22:00",
            },
            {
                "name": "Спортивна база Луцьк",
                "city": "Луцьк",
                "address": "вул. Винниченка, 30",
                "contact_phone": "+380332234567",
                "email": "lutsk@sportbase.ua",
                "opening_hours": "08:00 - 21:00",
            },
            {
                "name": "Фітнес клуб Чернівці",
                "city": "Чернівці",
                "address": "вул. Головна, 25",
                "contact_phone": "+380372345678",
                "email": "chernivtsi@fitnessclub.ua",
                "opening_hours": "07:00 - 22:00",
            },
        ]
        centers = []
        for data in centers_data:
            center, _ = SportCenter.objects.get_or_create(
                city=data["city"],
                address=data["address"],
                defaults=data
            )
            centers.append(center)
        return centers

    def _create_halls(self, centers):
        halls = []
        num_halls = 5

        for center in centers:
            for hall_num in range(1, num_halls + 1):
                hall, _ = GymHall.objects.get_or_create(
                    center=center,
                    name=f"Зал {hall_num}",
                    defaults={
                        "type": "Універсальна зала",
                        "capacity": 15,
                        "equipment": "Універсальне спортивне обладнання",
                        "availability": "Щоденно 08:00-22:00",
                    },
                )
                halls.append(hall)
        return halls

    def _create_trainers(self, centers, halls):
        trainers = []

        sports_needed = [
            "Футбол", "Йога", "Фітнес", "Баскетбол", "Плавання",
            "Теніс", "Волейбол", "Бокс", "Аеробіка"
        ]

        first_names = [
            "Олександр", "Андрій", "Сергій", "Дмитро", "Іван", "Максим", "Володимир",
            "Роман", "Віталій", "Олег", "Юрій", "Василь", "Петро", "Михайло",
            "Ірина", "Марія", "Олена", "Наталія", "Тетяна", "Оксана", "Юлія",
            "Анна", "Катерина", "Вікторія", "Світлана", "Людмила", "Галина", "Валентина"
        ]
        last_names = [
            "Коваль", "Мельник", "Шевченко", "Бондаренко", "Кравченко", "Олійник",
            "Шевчук", "Поліщук", "Петренко", "Мороз", "Лисенко", "Демчук", "Федоренко",
            "Ткаченко", "Коваленко", "Бондар", "Савченко", "Бойко", "Ткач", "Марченко",
            "Левченко", "Клименко", "Романенко", "Павленко", "Кравчук", "Овчаренко", "Гончаренко"
        ]

        used_names_per_center = {}

        for center_idx, center in enumerate(centers):
            center_used_names = used_names_per_center.setdefault(center.id, set())
            center_trainer_index = 0


            for sport_idx, sport in enumerate(sports_needed):
                for trainer_num in range(3):
                    base_offset = center_idx * 1000 + sport_idx * 100 + trainer_num * 10

                    max_attempts = 100
                    attempt = 0
                    while attempt < max_attempts:
                        first_idx = (base_offset + center_trainer_index) % len(first_names)
                        last_idx = (base_offset * 2 + center_trainer_index * 3) % len(last_names)

                        first_name = first_names[first_idx]
                        last_name = last_names[last_idx]
                        name_key = f"{first_name}_{last_name}"

                        if name_key not in center_used_names:
                            center_used_names.add(name_key)
                            break

                        center_trainer_index += 1
                        attempt += 1

                    if attempt >= max_attempts:
                        first_name = first_names[(base_offset + center_trainer_index) % len(first_names)]
                        last_name = last_names[
                            (base_offset * 2 + center_trainer_index * 3 + trainer_num * 7) % len(last_names)]

                    center_trainer_index += 1

                    trainer, _ = Trainer.objects.get_or_create(
                        center=center,
                        first_name=first_name,
                        last_name=last_name,
                        specialization=sport,
                        defaults={
                            "experience_years": random.randint(3, 15),
                            "biography": f"{first_name} {last_name} – сертифікований тренер з {sport}. Досвід роботи {random.randint(3, 15)} років.",
                        },
                    )
                    trainers.append(trainer)

        return trainers

    def _create_sections(self, halls, trainers):
        sections = []

        levels = ["Початковий", "Середній", "Просунутий"]
        adult_age = "Дорослі"
        kids_ages = {
            "Футбол": ["Діти 8-12", "Діти 13-17"],
            "Йога": ["Діти 8-12", "Діти 13-17"],
            "Фітнес": ["Діти 8-12", "Діти 13-17"],
            "Баскетбол": ["Діти 8-12", "Діти 13-17"],
            "Плавання": ["Діти 8-12", "Діти 13-17"],
            "Теніс": ["Діти 8-12", "Діти 13-17"],
            "Волейбол": ["Діти 8-12", "Діти 13-17"],
            "Бокс": ["Діти 8-12", "Діти 13-17"],
            "Аеробіка": ["Діти 8-12", "Діти 13-17"],
        }

        sport_configs = {
            "Футбол": {
                "adult_price": Decimal("450.00"),
                "adult_capacity": 22,
                "kids_price": Decimal("400.00"),
                "kids_capacity": 20,
            },
            "Йога": {
                "adult_price": Decimal("320.00"),
                "adult_capacity": 10,
                "kids_price": Decimal("280.00"),
                "kids_capacity": 10,
            },
            "Фітнес": {
                "adult_price": Decimal("350.00"),
                "adult_capacity": 10,
                "kids_price": Decimal("300.00"),
                "kids_capacity": 10,
            },
            "Баскетбол": {
                "adult_price": Decimal("400.00"),
                "adult_capacity": 20,
                "kids_price": Decimal("350.00"),
                "kids_capacity": 18,
            },
            "Плавання": {
                "adult_price": Decimal("380.00"),
                "adult_capacity": 10,
                "kids_price": Decimal("320.00"),
                "kids_capacity": 10,
            },
            "Теніс": {
                "adult_price": Decimal("420.00"),
                "adult_capacity": 8,
                "kids_price": Decimal("360.00"),
                "kids_capacity": 8,
            },
            "Волейбол": {
                "adult_price": Decimal("380.00"),
                "adult_capacity": 18,
                "kids_price": Decimal("330.00"),
                "kids_capacity": 16,
            },
            "Бокс": {
                "adult_price": Decimal("400.00"),
                "adult_capacity": 12,
                "kids_price": Decimal("350.00"),
                "kids_capacity": 10,
            },
            "Аеробіка": {
                "adult_price": Decimal("320.00"),
                "adult_capacity": 12,
                "kids_price": Decimal("280.00"),
                "kids_capacity": 12,
            },
        }

        halls_by_center = {}
        for hall in halls:
            center_id = hall.center_id
            if center_id not in halls_by_center:
                halls_by_center[center_id] = []
            halls_by_center[center_id].append(hall)

        all_sports = list(sport_configs.keys())

        for center_id, center_halls in halls_by_center.items():
            center_trainers = {sport: [] for sport in all_sports}
            for trainer in trainers:
                if trainer.center_id == center_id:
                    if trainer.specialization in center_trainers:
                        center_trainers[trainer.specialization].append(trainer)

            for sport in all_sports:
                config = sport_configs[sport]
                sport_trainers = center_trainers.get(sport, [])


                sport_sections = []


                for level in levels:
                    sport_sections.append((
                        sport, level, adult_age,
                        config["adult_price"] + Decimal(str(levels.index(level) * 30)),
                        config["adult_capacity"]
                    ))


                for kids_age in kids_ages.get(sport, []):
                    for level in levels:
                        sport_sections.append((
                            sport, level, kids_age,
                            config["kids_price"] + Decimal(str(levels.index(level) * 30)),
                            config["kids_capacity"]
                        ))


                for section_idx, (sport_type, level, age, base_price, capacity) in enumerate(sport_sections):

                    hall = center_halls[section_idx % len(center_halls)]

                    if len(sport_trainers) > 0:
                        assigned_trainer = sport_trainers[section_idx % len(sport_trainers)]
                    else:

                        assigned_trainer = None

                    section, _ = Section.objects.get_or_create(
                        hall=hall,
                        sportType=sport_type,
                        level=level,
                        ageCategory=age,
                        defaults={
                            "capacity": capacity,
                            "base_price": base_price,
                            "description": f"{sport_type} заняття для {age} ({level} рівень).",
                        },
                    )
                    if section.base_price != base_price:
                        section.base_price = base_price
                        section.save(update_fields=["base_price"])
                    if section.capacity != capacity:
                        section.capacity = capacity
                        section.save(update_fields=["capacity"])


                    if assigned_trainer:
                        section.trainers.set([assigned_trainer])

                    sections.append(section)

        return sections

    def _create_schedule_slots(self, sections):
        slots = []
        now = timezone.now()


        schedule_patterns = {

            ("Футбол", "Початковий", "Дорослі"): (1, 4, 16, 17),
            ("Футбол", "Середній", "Дорослі"): (2, 5, 17, 18),
            ("Футбол", "Просунутий", "Дорослі"): (0, 3, 18, 18),

            ("Йога", "Початковий", "Дорослі"): (1, 4, 10, 11),
            ("Йога", "Середній", "Дорослі"): (2, 5, 11, 12),
            ("Йога", "Просунутий", "Дорослі"): (0, 3, 10, 10),

            ("Фітнес", "Початковий", "Дорослі"): (1, 4, 16, 17),
            ("Фітнес", "Середній", "Дорослі"): (2, 5, 17, 18),
            ("Фітнес", "Просунутий", "Дорослі"): (0, 3, 18, 18),

            ("Баскетбол", "Початковий", "Дорослі"): (1, 4, 15, 16),
            ("Баскетбол", "Середній", "Дорослі"): (2, 5, 16, 17),
            ("Баскетбол", "Просунутий", "Дорослі"): (0, 3, 17, 18),

            ("Плавання", "Початковий", "Дорослі"): (1, 4, 10, 12),
            ("Плавання", "Середній", "Дорослі"): (2, 5, 11, 13),
            ("Плавання", "Просунутий", "Дорослі"): (0, 3, 12, 14),

            ("Теніс", "Початковий", "Дорослі"): (1, 4, 14, 15),
            ("Теніс", "Середній", "Дорослі"): (2, 5, 15, 16),
            ("Теніс", "Просунутий", "Дорослі"): (0, 3, 16, 17),

            ("Волейбол", "Початковий", "Дорослі"): (1, 4, 15, 16),
            ("Волейбол", "Середній", "Дорослі"): (2, 5, 16, 17),
            ("Волейбол", "Просунутий", "Дорослі"): (0, 3, 17, 18),

            ("Бокс", "Початковий", "Дорослі"): (1, 4, 16, 17),
            ("Бокс", "Середній", "Дорослі"): (2, 5, 17, 18),
            ("Бокс", "Просунутий", "Дорослі"): (0, 3, 18, 18),

            ("Аеробіка", "Початковий", "Дорослі"): (1, 4, 10, 11),
            ("Аеробіка", "Середній", "Дорослі"): (2, 5, 11, 12),
            ("Аеробіка", "Просунутий", "Дорослі"): (0, 3, 12, 13),
        }

        kids_schedule_base = {
            ("Футбол", "Початковий"): (0, 2, 14, 15),
            ("Футбол", "Середній"): (1, 3, 15, 16),
            ("Футбол", "Просунутий"): (4, 5, 14, 15),

            ("Йога", "Початковий"): (0, 2, 10, 11),
            ("Йога", "Середній"): (1, 3, 11, 12),
            ("Йога", "Просунутий"): (4, 5, 12, 13),

            ("Фітнес", "Початковий"): (0, 2, 14, 15),
            ("Фітнес", "Середній"): (1, 3, 15, 16),
            ("Фітнес", "Просунутий"): (4, 5, 13, 14),

            ("Баскетбол", "Початковий"): (0, 2, 14, 15),
            ("Баскетбол", "Середній"): (1, 3, 15, 16),
            ("Баскетбол", "Просунутий"): (4, 5, 14, 15),

            ("Плавання", "Початковий"): (0, 2, 10, 12),
            ("Плавання", "Середній"): (1, 3, 11, 13),
            ("Плавання", "Просунутий"): (4, 5, 14, 15),

            ("Теніс", "Початковий"): (0, 2, 14, 15),
            ("Теніс", "Середній"): (1, 3, 15, 16),
            ("Теніс", "Просунутий"): (4, 5, 14, 15),

            ("Волейбол", "Початковий"): (0, 2, 14, 15),
            ("Волейбол", "Середній"): (1, 3, 15, 16),
            ("Волейбол", "Просунутий"): (4, 5, 13, 14),

            ("Бокс", "Початковий"): (0, 2, 14, 15),
            ("Бокс", "Середній"): (1, 3, 15, 16),
            ("Бокс", "Просунутий"): (4, 5, 13, 14),

            ("Аеробіка", "Початковий"): (0, 2, 10, 11),
            ("Аеробіка", "Середній"): (1, 3, 11, 12),
            ("Аеробіка", "Просунутий"): (4, 5, 12, 13),
        }

        for section in sections:
            hall = section.hall
            center = hall.center

            section_trainers = list(section.trainers.all())
            if len(section_trainers) == 0:
                continue
            trainer = section_trainers[0]

            is_kids = "Діти" in section.ageCategory
            section_key = (section.sportType, section.level, section.ageCategory)

            center_offset = center.id % 3

            if is_kids:

                kids_key = (section.sportType, section.level)
                if kids_key in kids_schedule_base:
                    base_day1, base_day2, base_hour1, base_hour2 = kids_schedule_base[kids_key]

                    day1 = (base_day1 + center_offset) % 7
                    day2 = (base_day2 + center_offset * 2) % 7

                    hour1 = max(10, min(16, base_hour1 + (center_offset % 2)))
                    hour2 = max(10, min(16, base_hour2 + (center_offset % 2)))
                else:

                    day1 = (0 + center_offset) % 7
                    day2 = (2 + center_offset * 2) % 7
                    hour1 = 10 + (center_offset % 3)
                    hour2 = 14 + (center_offset % 2)
            else:

                if section_key in schedule_patterns:
                    base_day1, base_day2, base_hour1, base_hour2 = schedule_patterns[section_key]

                    day1 = (base_day1 + center_offset) % 7
                    day2 = (base_day2 + center_offset * 2) % 7

                    hour1 = max(10, min(18, base_hour1 + (center_offset % 2)))
                    hour2 = max(10, min(18, base_hour2 + (center_offset % 2)))
                else:

                    day1 = (1 + center_offset) % 7
                    day2 = (4 + center_offset * 2) % 7
                    hour1 = 10 + (center_offset * 2)
                    hour2 = 14 + (center_offset * 2)


            days_to_create = [(day1, hour1), (day2, hour2)]

            for target_day_of_week, target_hour in days_to_create:

                for day_offset in range(1, 8):
                    target_date = now + timedelta(days=day_offset)
                    if target_date.weekday() == target_day_of_week:
                        # Базовий час початку
                        start = target_date.replace(hour=target_hour, minute=0, second=0, microsecond=0)
                        end = start + timedelta(hours=1)

                        # Уникаємо накладок: якщо в цьому залі на цю годину вже є слот,
                        # зсуваємо час на +1 годину, поки не знайдемо вільний або не вийдемо за межі дня
                        max_hour = 21
                        while ScheduleSlot.objects.filter(hall=hall, start_time=start).exists() and start.hour < max_hour:
                            start = start + timedelta(hours=1)
                            end = start + timedelta(hours=1)

                        # Якщо знайшли вільний час у межах дня – створюємо слот
                        if start.hour <= max_hour and not ScheduleSlot.objects.filter(hall=hall, start_time=start).exists():
                            slot = ScheduleSlot.objects.create(
                                section=section,
                                hall=hall,
                                trainer=trainer,
                                start_time=start,
                                end_time=end,
                                capacity=section.capacity,
                                available_spots=section.capacity,
                            )
                            slots.append(slot)
                        break

        return slots

    def _create_subscriptions(self):
        subscriptions = []
        configs = [
            (
                Subscription.SubscriptionType.MONTHLY,
                2500,
                30,
                "Місячний абонемент з безлімітним доступом до групових тренувань та тренажерної зали.",
                {
                    "group_classes": "Необмежено",
                    "gym": "Щоденний доступ 06:00–23:00",
                    "pool": "Вихідні з 08:00 до 20:00",
                },
            ),
            (
                Subscription.SubscriptionType.PREMIUM,
                4200,
                30,
                "Преміум пакет із сауною, басейном та двома персональними тренуваннями з тренером.",
                {
                    "personal_sessions": "2 індивідуальні тренування з тренером",
                    "wellness": "Сауна та басейн без обмежень",
                    "priority_booking": "Пріоритетні бронювання слотів",
                },
            ),
            (
                Subscription.SubscriptionType.CORPORATE,
                12000,
                30,
                "Корпоративний абонемент для команд до 5 людей з персональним менеджером та спортивними активностями.",
                {
                    "team_size": "До 5 співробітників",
                    "manager": "Персональний менеджер розкладу",
                    "sport_events": "Спортивні тімбілдинги та командні челенджі щомісяця",
                },
            ),
        ]
        for sub_type, price, duration, description, perks in configs:
            sub, _ = Subscription.objects.get_or_create(
                type=sub_type,
                defaults={
                    "price": price,
                    "duration": duration,
                    "description": description,
                    "perks": perks,
                },
            )
            subscriptions.append(sub)
        return subscriptions

    def _create_users(self):
        users = []
        admin_email = "admin@sportbooking.local"
        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "username": admin_email,
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        if created or not admin.has_usable_password():
            admin.username = admin_email
            admin.set_password("admin12345")
            admin.is_staff = True
            admin.is_superuser = True
            admin.is_active = True
            admin.save()
        users.append(admin)

        customer_data = [
            ("demo_user", "demo@sportbooking.local"),
            ("corporate_user", "corp@sportbooking.local"),
        ]

        from datetime import date
        adult_birth_date = date.today().replace(year=date.today().year - 25)

        for username, email in customer_data:
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "role": User.Role.CUSTOMER,
                    "preferred_sports": "Йога, Фітнес",
                    "date_of_birth": adult_birth_date,
                },
            )

            if not user.date_of_birth:
                user.date_of_birth = adult_birth_date
                user.save(update_fields=['date_of_birth'])
            if not user.has_usable_password():
                user.set_password("demo12345")
                user.is_active = True
                user.save()
            users.append(user)
        return users

    def _assign_memberships(self, users, subscriptions):
        today = timezone.now().date()
        for user in users:
            if user.role != User.Role.CUSTOMER:
                continue
            subscription = random.choice(subscriptions)
            UserMembership.objects.get_or_create(
                user=user,
                subscription=subscription,
                defaults={
                    "start_date": today,
                    "end_date": today + timedelta(days=subscription.duration),
                },
            )

    def _create_sample_bookings(self, users, slots):
        booking_service = BookingService()
        customer_users = [u for u in users if u.role == User.Role.CUSTOMER]


        adult_slots = [
            slot for slot in slots
            if slot.section.ageCategory == "Дорослі"
        ]


        slots_to_use = adult_slots if adult_slots else slots

        for slot in slots_to_use[:20]:
            user = random.choice(customer_users)
            try:
                booking_service.create_booking(
                    user=user,
                    schedule_slot=slot,
                    payment_method=random.choice(list(dict(Payment.PaymentMethod.choices).keys())),
                    notes="Тестове бронювання",
                )
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Пропущено бронювання для слота {slot.id}: {e}"))
                continue

