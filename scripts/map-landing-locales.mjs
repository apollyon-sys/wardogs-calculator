/*
 * Build-time copy for localized map landing pages.
 *
 * Map ids, source URLs and section ids stay in map-landing-pages.mjs. This
 * module contains only human-facing copy, so the lightweight landing pages do
 * not download the application's runtime locale bundles.
 */
export const MAP_LANDING_LOCALIZATIONS = {
    ru: {
        ui: {
            skip: 'Перейти к содержимому карты',
            brandHome: 'Главная страница WARDOGS Artillery Calculator',
            calculator: 'Калькулятор',
            language: 'Язык',
            breadcrumbAria: 'Навигационная цепочка',
            footerAria: 'Навигация в подвале',
            breadcrumb: 'Карта {map}',
            eyebrow: 'КАРТА WARDOGS',
            imageCaption: '{map} в WARDOGS',
            capabilities: 'Возможности карты {map}',
            workspace: 'Инструменты {map}',
            factsEyebrow: 'ОПУБЛИКОВАННЫЕ ДАННЫЕ',
            factsHeading: 'Факты о поле боя {map}',
            factsIntro: 'Опубликованные сведения об игровой карте отделены от возможностей калькулятора.',
            faqHeading: 'Вопросы о карте {map}',
            sourcesHeading: 'Источники и проверка',
            sourcesIntro: 'Описание карты и правил опирается только на опубликованные материалы. Возможности калькулятора описаны отдельно; неофициальные названия точек интереса и неподтверждённые тактические выводы не добавлялись.',
            openCalculator: 'Открыть калькулятор',
            openCalculatorBody: 'Продолжить в полной версии для компьютера или телефона с уже выбранной картой {map}.',
            openMap: 'Открыть карту {map}',
            otherMaps: 'Другие карты WARDOGS',
            otherMapsAria: 'Другие карты WARDOGS',
            relatedMap: 'Интерактивная карта {map}',
            footerDisclaimer: 'Неофициальный проект сообщества. Не связан с BULKHEAD или командой разработчиков WARDOGS и не одобрен ими.',
            sourceCode: 'Исходный код'
        },
        content: {
            title: 'Интерактивная карта WARDOGS {map} | Артиллерийский калькулятор',
            description: 'Интерактивная карта WARDOGS {map}: {detail}. Расчёты L81 и SPH-2, изолинии, Terrain3D, инструменты карты и командные лобби.',
            heading: 'WARDOGS {map} — интерактивная карта',
            highlightWeapons: 'Расчёты для миномёта L81 и SPH-2',
            highlightTerrain: 'Изолинии и включаемая вручную Terrain3D-коррекция',
            highlightLobby: 'Общие отметки и личные расчёты игроков в лобби',
            factLabels: {
                setting: 'Опубликованный регион', district: 'Известный район', landmark: 'Известный ориентир',
                status: 'Статус карты', focus: 'Визуальная тема', battlefield: 'Размер поля боя', objective: 'Основная цель'
            },
            battlefieldValue: '256 км²',
            objectiveValue: 'Случайная контрольная зона 2 × 2 км',
            weaponsHeading: 'Миномёт L81 и SPH-2 на карте {map}',
            weapons: [
                'Для миномёта L81 калькулятор показывает табличное значение MIL, дистанцию, азимут и статус дальности. Для SPH-2 решения LOW и HIGH рассчитываются отдельно.',
                'Выбор оружия, активное орудие, цель и круг дальности принадлежат конкретному игроку и не заменяют расчёты союзников.'
            ],
            lobbyHeading: 'Совместное планирование на карте {map}',
            lobby: [
                'Создайте лобби и отправьте ссылку или код приглашения. Рисунки, зоны, полигоны и пользовательские метки синхронизируются между подключёнными участниками.',
                'Союзники видят подписанные позиции других игроков без чужих кругов дальности. Лобби синхронизирует браузеры, но не получает данные игрового сервера.'
            ],
            toolsHeading: 'Инструменты карты {map}',
            tools: [
                'Линейка измеряет расстояние, Карандаш создаёт свободные рисунки, а Зона и Полигон обозначают области. Также доступны тактические метки, Ластик, Отмена и Повтор.',
                'Данные инструментов карты можно импортировать и экспортировать отдельно от сохранённых целей.'
            ],
            terrainSafety: 'Terrain3D выключена по умолчанию. Кандидат применяется только со статусом SAFE; неопределённые, неподдерживаемые и недостижимые решения используют обычную таблицу. Наклон платформы и корпуса не учитывается.',
            faq: [
                { question: 'Как сразу открыть карту {map} в калькуляторе?', answer: 'Нажмите «Открыть карту {map}». Калькулятор загрузится с проверенным параметром карты и сохранит выбранный пресет обычным способом.' },
                { question: 'Какие орудия поддерживает карта {map}?', answer: 'На карте доступны табличные расчёты миномёта L81 и решения LOW/HIGH для SPH-2.' },
                { question: 'Можно ли планировать на карте {map} вместе?', answer: 'Да. Лобби синхронизирует рисунки, зоны, полигоны и тактические метки, но оставляет оружие, орудие, цель и круг дальности личными.' },
                { question: 'Обязательна ли Terrain3D?', answer: 'Нет. Это экспериментальная опция, выключенная по умолчанию. Обычная таблица остаётся доступной и используется как безопасный резервный вариант.' }
            ],
            sources: {
                team17: 'Официальное описание WARDOGS и правил матча — Team17',
                maps: 'Обзор карт WARDOGS — GameWatcher',
                reveal: 'Анонс карты Zestafona — видео WARDOGS'
            }
        },
        maps: {
            bakurani: {
                detail: 'промышленный район среди восточноевропейских гор',
                imageAlt: 'Пейзаж Bakurani в WARDOGS с церковью и полем подсолнухов',
                lead: 'Планируйте позиции артиллерии, цели и командные отметки на откалиброванной карте Bakurani, не покидая рабочее пространство калькулятора.',
                mapHighlight: 'Откалиброванная система игровых координат Bakurani',
                facts: [['setting', 'Восточноевропейские горы'], ['district', 'Промышленный район']],
                profileHeading: 'Bakurani: горы, промышленность и меняющаяся цель',
                profile: [
                    'В опубликованном описании Bakurani выделен промышленный район, окружённый восточноевропейскими горами. Это подтверждённая характеристика карты, а не придуманное название точки интереса.',
                    'В WARDOGS до 100 игроков делятся на три команды. Поле боя занимает 256 км², но очки приносит случайно выбранная контрольная зона 2 × 2 км; побеждает команда, первой набравшая 100 очков.'
                ],
                planningHeading: 'Планирование артиллерии на Bakurani',
                planning: [
                    'Поставьте орудие и цель щелчком по карте или введите координаты. Калькулятор покажет дистанцию, азимут, разницу координат и решение для выбранного оружия.',
                    'Тайлы Bakurani, координатный поиск, сохранённые цели и тактические отметки используют одну откалиброванную систему координат.'
                ],
                terrainHeading: 'Рельеф Bakurani и Terrain3D',
                terrain: ['Для Bakurani доступны изолинии и Terrain3D-данные высот. Обычное табличное значение остаётся на экране для прямого сравнения с экспериментальным кандидатом.']
            },
            ozeti: {
                detail: 'западноевропейский регион с футбольным стадионом',
                imageAlt: 'Стадион Ozeti и окружающий ландшафт в WARDOGS',
                lead: 'Используйте исправленное выравнивание Ozeti, координатный поиск и артиллерийские расчёты в одном согласованном пространстве карты.',
                mapHighlight: 'Исправленное выравнивание игровой области Ozeti',
                facts: [['setting', 'Западная Европа'], ['landmark', 'Футбольный стадион']],
                profileHeading: 'Ozeti: Западная Европа и стадион',
                profile: [
                    'Опубликованные материалы помещают Ozeti в Западную Европу и называют футбольный стадион её главным ориентиром. Страница не приписывает отдельным позициям неподтверждённую тактическую ценность.',
                    'Матчи проходят на поле боя площадью 256 км², однако область, важная для набора очков, определяется случайной контрольной зоной 2 × 2 км. До 100 игроков сражаются в составе трёх команд.'
                ],
                planningHeading: 'Координатное планирование на Ozeti',
                planning: [
                    'Введите известные координаты или разместите орудие и цель визуально. Точку можно заблокировать, пока вы корректируете другую, а полезное решение — сохранить для последующего восстановления.',
                    'Поиск координат перемещает камеру, не изменяя активную пару орудие–цель. Линейка выполняет отдельное измерение карты.'
                ],
                terrainHeading: 'Изолинии Ozeti и Terrain3D',
                terrain: ['В Ozeti можно включить слой изолиний и использовать данные высот для поддерживаемых предварительных расчётов SPH-2. LOW и HIGH проверяются независимо.']
            },
            zestafona: {
                detail: 'заброшенный промышленный комплекс, краны и контейнерная площадка',
                imageAlt: 'Промышленная зона Zestafona и контейнерная площадка в WARDOGS',
                lead: 'Откройте Zestafona по прямому URL и объедините точную постановку точек, артиллерийские расчёты и совместные инструменты карты.',
                mapHighlight: 'Многоуровневые тайлы карты Zestafona',
                facts: [['status', 'Третья карта, показанная до Early Access'], ['focus', 'Завод, краны и контейнерная площадка']],
                profileHeading: 'Zestafona: показ промышленной карты',
                profile: [
                    'Zestafona была представлена как третья карта WARDOGS перед выходом в Early Access. В ролике показан заброшенный промышленный комплекс с заводскими зданиями, кранами и штабелями контейнеров.',
                    'Подробный официальный перечень точек интереса не публиковался, поэтому здесь не выдумываются названия локаций, постоянные цели или тактические преимущества.'
                ],
                planningHeading: 'Огневой план на Zestafona',
                planning: [
                    'Укажите орудие и цель на карте или через координаты, затем прочитайте дистанцию, азимут, MIL и разницу по осям. Блокировки позволяют сохранить одну точку во время изменения другой.',
                    'Сохранённые цели можно восстановить, импортировать или экспортировать отдельно от рисунков и меток.'
                ],
                terrainHeading: 'Контекст Terrain3D для Zestafona',
                terrain: ['Рабочее пространство Zestafona включает изолинии и Terrain3D-покрытие высот. Многоуровневые тайлы позволяют приблизить карту, не меняя её координатную привязку.']
            }
        }
    },

    uk: {
        ui: {
            skip: 'Перейти до вмісту мапи', brandHome: 'Головна сторінка WARDOGS Artillery Calculator', calculator: 'Калькулятор', language: 'Мова', breadcrumbAria: 'Навігаційний ланцюжок', footerAria: 'Навігація в підвалі',
            breadcrumb: 'Мапа {map}', eyebrow: 'МАПА WARDOGS', imageCaption: '{map} у WARDOGS', capabilities: 'Можливості мапи {map}', workspace: 'Інструменти {map}',
            factsEyebrow: 'ОПУБЛІКОВАНІ ДАНІ', factsHeading: 'Факти про поле бою {map}', factsIntro: 'Опубліковані відомості про ігрову мапу відокремлено від можливостей калькулятора.',
            faqHeading: 'Запитання про мапу {map}', sourcesHeading: 'Джерела та перевірка',
            sourcesIntro: 'Опис мапи й правил спирається лише на опубліковані матеріали. Можливості калькулятора описано окремо; неофіційні назви точок інтересу та непідтверджені тактичні висновки не додавалися.',
            openCalculator: 'Відкрити калькулятор', openCalculatorBody: 'Продовжити в повній версії для комп’ютера або телефона з уже вибраною мапою {map}.', openMap: 'Відкрити мапу {map}',
            otherMaps: 'Інші мапи WARDOGS', otherMapsAria: 'Інші мапи WARDOGS', relatedMap: 'Інтерактивна мапа {map}',
            footerDisclaimer: 'Неофіційний проєкт спільноти. Не пов’язаний із BULKHEAD або командою розробників WARDOGS і не схвалений ними.', sourceCode: 'Вихідний код'
        },
        content: {
            title: 'Інтерактивна мапа WARDOGS {map} | Артилерійський калькулятор',
            description: 'Інтерактивна мапа WARDOGS {map}: {detail}. Розрахунки L81 і SPH-2, ізолінії, Terrain3D, інструменти мапи та командні лобі.',
            heading: 'WARDOGS {map} — інтерактивна мапа',
            highlightWeapons: 'Розрахунки для міномета L81 і SPH-2', highlightTerrain: 'Ізолінії та Terrain3D-корекція, що вмикається вручну', highlightLobby: 'Спільні позначки й особисті розрахунки гравців у лобі',
            factLabels: { setting: 'Опублікований регіон', district: 'Відомий район', landmark: 'Відомий орієнтир', status: 'Статус мапи', focus: 'Візуальна тема', battlefield: 'Розмір поля бою', objective: 'Основна ціль' },
            battlefieldValue: '256 км²', objectiveValue: 'Випадкова контрольна зона 2 × 2 км',
            weaponsHeading: 'Міномет L81 і SPH-2 на мапі {map}',
            weapons: ['Для міномета L81 калькулятор показує табличне значення MIL, відстань, азимут і статус дальності. Для SPH-2 рішення LOW і HIGH обчислюються окремо.', 'Вибір зброї, активна гармата, ціль і коло дальності належать конкретному гравцеві й не замінюють розрахунки союзників.'],
            lobbyHeading: 'Спільне планування на мапі {map}',
            lobby: ['Створіть лобі та надішліть посилання або код запрошення. Малюнки, зони, полігони й користувацькі позначки синхронізуються між учасниками.', 'Союзники бачать підписані позиції інших гравців без чужих кіл дальності. Лобі синхронізує браузери, але не отримує дані ігрового сервера.'],
            toolsHeading: 'Інструменти мапи {map}',
            tools: ['Лінійка вимірює відстань, Олівець створює довільні малюнки, а Зона й Полігон позначають області. Також доступні тактичні позначки, Гумка, Скасувати й Повторити.', 'Дані інструментів мапи можна імпортувати й експортувати окремо від збережених цілей.'],
            terrainSafety: 'Terrain3D вимкнено за замовчуванням. Кандидат застосовується лише зі статусом SAFE; невизначені, непідтримувані й недосяжні рішення використовують звичайну таблицю. Нахил платформи та корпусу не враховується.',
            faq: [
                { question: 'Як одразу відкрити мапу {map} у калькуляторі?', answer: 'Натисніть «Відкрити мапу {map}». Калькулятор завантажиться з перевіреним параметром мапи та збереже вибраний пресет звичайним способом.' },
                { question: 'Яку артилерію підтримує мапа {map}?', answer: 'На мапі доступні табличні розрахунки міномета L81 і рішення LOW/HIGH для SPH-2.' },
                { question: 'Чи можна планувати на мапі {map} разом?', answer: 'Так. Лобі синхронізує малюнки, зони, полігони й тактичні позначки, але залишає зброю, гармату, ціль і коло дальності особистими.' },
                { question: 'Чи обов’язкова Terrain3D?', answer: 'Ні. Це експериментальна опція, вимкнена за замовчуванням. Звичайна таблиця залишається доступною та використовується як безпечний резервний варіант.' }
            ],
            sources: { team17: 'Офіційний опис WARDOGS і правил матчу — Team17', maps: 'Огляд мап WARDOGS — GameWatcher', reveal: 'Анонс мапи Zestafona — відео WARDOGS' }
        },
        maps: {
            bakurani: {
                detail: 'промисловий район серед східноєвропейських гір', imageAlt: 'Краєвид Bakurani у WARDOGS із церквою та соняшниковим полем',
                lead: 'Плануйте артилерійські позиції, цілі й командні позначки на відкаліброваній мапі Bakurani в одному робочому просторі калькулятора.', mapHighlight: 'Відкалібрована система ігрових координат Bakurani',
                facts: [['setting', 'Східноєвропейські гори'], ['district', 'Промисловий район']], profileHeading: 'Bakurani: гори, промисловість і змінна ціль',
                profile: ['В опублікованому описі Bakurani виділено промисловий район, оточений східноєвропейськими горами. Це підтверджена характеристика мапи, а не вигадана назва точки інтересу.', 'У WARDOGS до 100 гравців діляться на три команди. Поле бою займає 256 км², але очки приносить випадково вибрана контрольна зона 2 × 2 км; перемагає команда, яка першою набере 100 очок.'],
                planningHeading: 'Планування артилерії на Bakurani', planning: ['Поставте гармату й ціль натисканням на мапу або введіть координати. Калькулятор покаже відстань, азимут, різницю координат і рішення для вибраної зброї.', 'Тайли Bakurani, пошук координат, збережені цілі й тактичні позначки використовують одну відкалібровану систему координат.'],
                terrainHeading: 'Рельєф Bakurani та Terrain3D', terrain: ['Для Bakurani доступні ізолінії й Terrain3D-дані висот. Звичайне табличне значення залишається на екрані для прямого порівняння з експериментальним кандидатом.']
            },
            ozeti: {
                detail: 'західноєвропейський регіон із футбольним стадіоном', imageAlt: 'Стадіон Ozeti та навколишній ландшафт у WARDOGS',
                lead: 'Використовуйте виправлене вирівнювання Ozeti, пошук координат і артилерійські розрахунки в одному узгодженому просторі мапи.', mapHighlight: 'Виправлене вирівнювання ігрової області Ozeti',
                facts: [['setting', 'Західна Європа'], ['landmark', 'Футбольний стадіон']], profileHeading: 'Ozeti: Західна Європа та стадіон',
                profile: ['Опубліковані матеріали розміщують Ozeti у Західній Європі й називають футбольний стадіон її головним орієнтиром. Сторінка не приписує окремим позиціям непідтверджену тактичну цінність.', 'Матчі проходять на полі бою площею 256 км², але область для набору очок визначає випадкова контрольна зона 2 × 2 км. До 100 гравців воюють у складі трьох команд.'],
                planningHeading: 'Координатне планування на Ozeti', planning: ['Введіть відомі координати або розмістіть гармату й ціль візуально. Одну точку можна заблокувати під час зміни іншої, а корисне рішення — зберегти.', 'Пошук координат пересуває камеру, не змінюючи активну пару гармата–ціль. Лінійка виконує окреме вимірювання мапи.'],
                terrainHeading: 'Ізолінії Ozeti та Terrain3D', terrain: ['На Ozeti можна ввімкнути шар ізоліній і використовувати дані висот для підтримуваних попередніх розрахунків SPH-2. LOW і HIGH перевіряються незалежно.']
            },
            zestafona: {
                detail: 'занедбаний промисловий комплекс, крани та контейнерний майданчик', imageAlt: 'Промислова зона Zestafona й контейнерний майданчик у WARDOGS',
                lead: 'Відкрийте Zestafona за прямою URL-адресою та поєднайте точне розміщення точок, артилерійські розрахунки й спільні інструменти мапи.', mapHighlight: 'Багаторівневі тайли мапи Zestafona',
                facts: [['status', 'Третя мапа, показана до Early Access'], ['focus', 'Завод, крани та контейнерний майданчик']], profileHeading: 'Zestafona: презентація промислової мапи',
                profile: ['Zestafona представили як третю мапу WARDOGS перед виходом у Early Access. У ролику показано занедбаний промисловий комплекс із заводськими будівлями, кранами та штабелями контейнерів.', 'Докладний офіційний перелік точок інтересу не публікувався, тому тут не вигадуються назви локацій, постійні цілі чи тактичні переваги.'],
                planningHeading: 'Вогневий план на Zestafona', planning: ['Укажіть гармату й ціль на мапі або через координати, а потім прочитайте відстань, азимут, MIL і різницю за осями. Блокування дають змогу зберегти одну точку під час зміни іншої.', 'Збережені цілі можна відновити, імпортувати чи експортувати окремо від малюнків і позначок.'],
                terrainHeading: 'Контекст Terrain3D для Zestafona', terrain: ['Робочий простір Zestafona містить ізолінії та Terrain3D-покриття висот. Багаторівневі тайли дають змогу наближати мапу без зміни координатної прив’язки.']
            }
        }
    },

    de: {
        ui: {
            skip: 'Zum Karteninhalt springen', brandHome: 'Startseite des WARDOGS Artillery Calculator', calculator: 'Rechner', language: 'Sprache', breadcrumbAria: 'Brotkrümelnavigation', footerAria: 'Fußnavigation',
            breadcrumb: 'Karte {map}', eyebrow: 'WARDOGS-KARTE', imageCaption: '{map} in WARDOGS', capabilities: 'Funktionen der Karte {map}', workspace: '{map}-Werkzeuge',
            factsEyebrow: 'VERÖFFENTLICHTE KARTENDATEN', factsHeading: 'Fakten zum Schlachtfeld {map}', factsIntro: 'Veröffentlichte Angaben zur Spielkarte werden getrennt von den Rechnerfunktionen dargestellt.',
            faqHeading: 'Fragen zur Karte {map}', sourcesHeading: 'Quellen und Prüfung',
            sourcesIntro: 'Karten- und Regelbeschreibungen beruhen nur auf veröffentlichtem Material. Rechnerfunktionen sind separat beschrieben; inoffizielle POI-Namen und unbelegte taktische Aussagen wurden nicht ergänzt.',
            openCalculator: 'Rechner öffnen', openCalculatorBody: 'In der vollständigen Desktop- oder Mobilansicht mit bereits ausgewählter Karte {map} fortfahren.', openMap: 'Karte {map} öffnen',
            otherMaps: 'Weitere WARDOGS-Karten', otherMapsAria: 'Weitere WARDOGS-Karten', relatedMap: 'Interaktive Karte {map}',
            footerDisclaimer: 'Inoffizielles Community-Projekt. Keine Verbindung zu BULKHEAD oder dem WARDOGS-Entwicklungsteam und nicht von ihnen unterstützt.', sourceCode: 'Quellcode'
        },
        content: {
            title: 'Interaktive WARDOGS-Karte {map} | Artillerierechner',
            description: 'Interaktive WARDOGS-Karte {map}: {detail}. L81- und SPH-2-Berechnung, Höhenlinien, Terrain3D, Kartenwerkzeuge und Team-Lobbys.',
            heading: 'WARDOGS {map} – interaktive Karte',
            highlightWeapons: 'Feuerlösungen für L81-Mörser und SPH-2', highlightTerrain: 'Höhenlinien und manuell aktivierbare Terrain3D-Korrektur', highlightLobby: 'Gemeinsame Markierungen und getrennte Spielerberechnungen in Lobbys',
            factLabels: { setting: 'Veröffentlichte Region', district: 'Bekannter Bezirk', landmark: 'Bekannte Landmarke', status: 'Kartenstatus', focus: 'Visueller Schwerpunkt', battlefield: 'Schlachtfeldgröße', objective: 'Hauptziel' },
            battlefieldValue: '256 km²', objectiveValue: 'Zufällige 2 × 2 km große Kontrollzone',
            weaponsHeading: 'L81-Mörser und SPH-2 auf {map}',
            weapons: ['Für den L81-Mörser zeigt der Rechner Tabellen-MIL, Distanz, Azimut und Reichweitenstatus. Beim SPH-2 werden LOW- und HIGH-Lösungen getrennt berechnet.', 'Waffe, aktives Geschütz, Ziel und Reichweitenkreis gehören jeweils einem Spieler und überschreiben nicht die Feuerlösung der Teammitglieder.'],
            lobbyHeading: 'Gemeinsame Planung auf {map}',
            lobby: ['Erstelle eine Lobby und teile den Einladungslink oder -code. Zeichnungen, Zonen, Polygone und Benutzermarker werden zwischen verbundenen Teilnehmern synchronisiert.', 'Teammitglieder sehen beschriftete Spielerpositionen ohne fremde Reichweitenkreise. Die Lobby synchronisiert Browser, empfängt aber keine Daten von einem Spielserver.'],
            toolsHeading: 'Kartenwerkzeuge für {map}',
            tools: ['Das Lineal misst Entfernungen, der Stift zeichnet frei und Zone sowie Polygon markieren Flächen. Zusätzlich stehen taktische Marker, Radiergummi, Rückgängig und Wiederholen bereit.', 'Kartenwerkzeug-Daten lassen sich getrennt von gespeicherten Zielen importieren und exportieren.'],
            terrainSafety: 'Terrain3D ist standardmäßig ausgeschaltet. Nur Kandidaten mit dem Status SAFE werden angewendet; unsichere, nicht unterstützte oder unerreichbare Lösungen verwenden die normale Tabelle. Plattform- und Fahrzeugneigung wird nicht berücksichtigt.',
            faq: [
                { question: 'Wie öffne ich {map} direkt im Rechner?', answer: 'Wähle „Karte {map} öffnen“. Der Rechner startet mit einem geprüften Kartenparameter und speichert die Auswahl wie gewohnt.' },
                { question: 'Welche Geschütze werden auf {map} unterstützt?', answer: 'Verfügbar sind Tabellenwerte für den L81-Mörser sowie LOW- und HIGH-Lösungen für den SPH-2.' },
                { question: 'Kann ein Team gemeinsam auf {map} planen?', answer: 'Ja. Die Lobby synchronisiert Zeichnungen, Zonen, Polygone und taktische Marker, während Waffe, Geschütz, Ziel und Reichweitenkreis persönlich bleiben.' },
                { question: 'Ist Terrain3D erforderlich?', answer: 'Nein. Die experimentelle Option ist standardmäßig aus. Die normale Feuertabelle bleibt verfügbar und dient als sicherer Rückfall.' }
            ],
            sources: { team17: 'Offizielle WARDOGS-Spiel- und Matchübersicht — Team17', maps: 'Übersicht der WARDOGS-Karten — GameWatcher', reveal: 'Vorstellung der Karte Zestafona — WARDOGS-Video' }
        },
        maps: {
            bakurani: {
                detail: 'Industriebezirk in osteuropäischen Bergen', imageAlt: 'Bakurani-Landschaft in WARDOGS mit Kirche und Sonnenblumenfeld',
                lead: 'Plane Artilleriestellungen, Ziele und Teammarkierungen auf der kalibrierten Bakurani-Karte in einem gemeinsamen Rechner-Arbeitsbereich.', mapHighlight: 'Kalibrierte Spielkoordinaten für Bakurani',
                facts: [['setting', 'Osteuropäische Berge'], ['district', 'Industriebezirk']], profileHeading: 'Bakurani: Berge, Industrie und ein wechselndes Ziel',
                profile: ['Veröffentlichte Beschreibungen kennzeichnen Bakurani durch einen von osteuropäischen Bergen umgebenen Industriebezirk. Das ist eine bestätigte Kartenangabe und kein erfundener POI-Name.', 'In WARDOGS werden bis zu 100 Spieler auf drei Teams verteilt. Das Schlachtfeld umfasst 256 km², Punkte bringt jedoch eine zufällig gewählte Kontrollzone von 2 × 2 km; das erste Team mit 100 Punkten gewinnt.'],
                planningHeading: 'Artillerieplanung auf Bakurani', planning: ['Setze Geschütz und Ziel per Klick oder gib Koordinaten ein. Der Rechner liefert Distanz, Azimut, Koordinatendifferenz und die Lösung der gewählten Waffe.', 'Bakurani-Kacheln, Koordinatensuche, gespeicherte Ziele und taktische Markierungen verwenden dieselbe kalibrierte Referenz.'],
                terrainHeading: 'Bakurani-Relief und Terrain3D', terrain: ['Für Bakurani stehen Höhenlinien und Terrain3D-Höhendaten bereit. Der normale Tabellenwert bleibt für den direkten Vergleich mit dem experimentellen Kandidaten sichtbar.']
            },
            ozeti: {
                detail: 'westeuropäische Umgebung mit einem Fußballstadion', imageAlt: 'Ozeti-Stadion und umgebende Landschaft in WARDOGS',
                lead: 'Nutze Ozetis korrigierte Ausrichtung, Koordinatensuche und Artillerieberechnung in einem konsistenten Kartenraum.', mapHighlight: 'Korrigierte Ausrichtung des spielbaren Ozeti-Gebiets',
                facts: [['setting', 'Westeuropa'], ['landmark', 'Fußballstadion']], profileHeading: 'Ozeti: Westeuropa und das Stadion',
                profile: ['Veröffentlichte Informationen verorten Ozeti in Westeuropa und nennen ein Fußballstadion als prägende Landmarke. Diese Seite behauptet keine unbelegte taktische Bedeutung einzelner Positionen.', 'Das Schlachtfeld ist 256 km² groß, der für die Wertung relevante Bereich wird jedoch durch eine zufällige 2 × 2 km große Kontrollzone festgelegt. Bis zu 100 Spieler kämpfen in drei Teams.'],
                planningHeading: 'Koordinatenbasierte Planung auf Ozeti', planning: ['Gib bekannte Koordinaten ein oder platziere Geschütz und Ziel visuell. Ein Punkt kann gesperrt werden, während du den anderen anpasst; nützliche Lösungen lassen sich speichern.', 'Die Koordinatensuche verschiebt die Kamera, ohne das aktive Geschütz-Ziel-Paar zu ändern. Das Lineal führt eine unabhängige Kartenmessung aus.'],
                terrainHeading: 'Ozeti-Höhenlinien und Terrain3D', terrain: ['Auf Ozeti lassen sich Höhenlinien einblenden und Höhendaten für unterstützte SPH-2-Vorschauen verwenden. LOW und HIGH werden unabhängig geprüft.']
            },
            zestafona: {
                detail: 'verlassener Industriekomplex mit Kränen und Containerplatz', imageAlt: 'Industriegebiet und Containerplatz von Zestafona in WARDOGS',
                lead: 'Öffne Zestafona über eine direkte URL und kombiniere präzise Punktplatzierung, Feuerberechnung und gemeinsame Kartenwerkzeuge.', mapHighlight: 'Mehrstufige Kartenkacheln für Zestafona',
                facts: [['status', 'Dritte vor dem Early Access vorgestellte Karte'], ['focus', 'Fabrik, Kräne und Containerplatz']], profileHeading: 'Zestafona: Vorstellung der Industriekarte',
                profile: ['Zestafona wurde vor dem Early Access als dritte WARDOGS-Karte vorgestellt. Das Video zeigt einen verlassenen Industriekomplex mit Fabrikgebäuden, Kränen und Containerstapeln.', 'Eine ausführliche offizielle POI-Liste wurde nicht veröffentlicht. Deshalb erfindet diese Seite keine Ortsnamen, dauerhaften Ziele oder taktischen Vorteile.'],
                planningHeading: 'Feuerplan für Zestafona', planning: ['Setze Geschütz und Ziel auf der Karte oder per Koordinate und lies Distanz, Azimut, MIL und Achsdifferenzen ab. Sperren halten einen Punkt fest, während der andere geändert wird.', 'Gespeicherte Ziele können unabhängig von Zeichnungen und Markern wiederhergestellt, importiert oder exportiert werden.'],
                terrainHeading: 'Terrain3D-Kontext für Zestafona', terrain: ['Der Zestafona-Arbeitsbereich enthält Höhenlinien und Terrain3D-Höhendaten. Mehrstufige Kacheln erlauben starkes Zoomen, ohne die Koordinatenreferenz zu ändern.']
            }
        }
    },

    fr: {
        ui: {
            skip: 'Aller au contenu de la carte', brandHome: 'Accueil de WARDOGS Artillery Calculator', calculator: 'Calculateur', language: 'Langue', breadcrumbAria: 'Fil d’Ariane', footerAria: 'Navigation de pied de page',
            breadcrumb: 'Carte {map}', eyebrow: 'CARTE WARDOGS', imageCaption: '{map} dans WARDOGS', capabilities: 'Fonctions de la carte {map}', workspace: 'Outils {map}',
            factsEyebrow: 'DONNÉES PUBLIÉES', factsHeading: 'Informations sur le champ de bataille {map}', factsIntro: 'Les informations publiées sur la carte sont présentées séparément des fonctions du calculateur.',
            faqHeading: 'Questions sur la carte {map}', sourcesHeading: 'Sources et vérification',
            sourcesIntro: 'La description de la carte et des règles se limite aux sources publiées. Les fonctions du calculateur sont décrites séparément ; aucun nom de point d’intérêt non officiel ni affirmation tactique non vérifiée n’a été ajouté.',
            openCalculator: 'Ouvrir le calculateur', openCalculatorBody: 'Continuer dans l’interface complète sur ordinateur ou mobile avec la carte {map} déjà sélectionnée.', openMap: 'Ouvrir la carte {map}',
            otherMaps: 'Autres cartes WARDOGS', otherMapsAria: 'Autres cartes WARDOGS', relatedMap: 'Carte interactive {map}',
            footerDisclaimer: 'Projet communautaire non officiel. Sans affiliation avec BULKHEAD ou l’équipe de développement de WARDOGS et sans leur approbation.', sourceCode: 'Code source'
        },
        content: {
            title: 'Carte interactive WARDOGS {map} | Calculateur d’artillerie',
            description: 'Carte interactive WARDOGS {map} : {detail}. Calculs L81 et SPH-2, courbes de niveau, Terrain3D, outils cartographiques et salons d’équipe.',
            heading: 'WARDOGS {map} — carte interactive',
            highlightWeapons: 'Solutions de tir pour le mortier L81 et le SPH-2', highlightTerrain: 'Courbes de niveau et correction Terrain3D activable manuellement', highlightLobby: 'Annotations partagées et solutions personnelles dans les salons',
            factLabels: { setting: 'Région publiée', district: 'Zone connue', landmark: 'Repère connu', status: 'Statut de la carte', focus: 'Thème visuel', battlefield: 'Taille du champ de bataille', objective: 'Objectif principal' },
            battlefieldValue: '256 km²', objectiveValue: 'Zone de contrôle aléatoire de 2 × 2 km',
            weaponsHeading: 'Mortier L81 et SPH-2 sur {map}',
            weapons: ['Pour le mortier L81, le calculateur affiche le MIL de la table de tir, la distance, l’azimut et l’état de portée. Les solutions LOW et HIGH du SPH-2 sont calculées séparément.', 'L’arme, la pièce active, la cible et le cercle de portée restent propres à chaque joueur et n’écrasent pas les solutions de ses coéquipiers.'],
            lobbyHeading: 'Planification en équipe sur {map}',
            lobby: ['Créez un salon et partagez son lien ou son code d’invitation. Les dessins, zones, polygones et marqueurs utilisateur sont synchronisés entre les participants connectés.', 'Les coéquipiers voient les positions identifiées des autres joueurs sans leurs cercles de portée. Le salon synchronise les navigateurs, mais ne reçoit aucune donnée du serveur de jeu.'],
            toolsHeading: 'Outils de la carte {map}',
            tools: ['La règle mesure les distances, le crayon permet le dessin libre et Zone ou Polygone délimitent des surfaces. Des marqueurs tactiques, une gomme, Annuler et Rétablir sont aussi disponibles.', 'Les données des outils cartographiques peuvent être importées et exportées séparément des cibles enregistrées.'],
            terrainSafety: 'Terrain3D est désactivé par défaut. Seuls les candidats marqués SAFE sont appliqués ; les solutions incertaines, non prises en charge ou hors d’atteinte utilisent la table normale. L’inclinaison de la plateforme et du châssis n’est pas prise en compte.',
            faq: [
                { question: 'Comment ouvrir directement la carte {map} dans le calculateur ?', answer: 'Sélectionnez « Ouvrir la carte {map} ». Le calculateur démarre avec un paramètre de carte validé et mémorise ensuite ce choix normalement.' },
                { question: 'Quelles pièces sont disponibles sur {map} ?', answer: 'La carte prend en charge la table de tir du mortier L81 et les solutions LOW/HIGH du SPH-2.' },
                { question: 'Une équipe peut-elle planifier ensemble sur {map} ?', answer: 'Oui. Le salon synchronise dessins, zones, polygones et marqueurs tactiques, tandis que l’arme, la pièce, la cible et le cercle de portée restent personnels.' },
                { question: 'Terrain3D est-il obligatoire ?', answer: 'Non. Cette option expérimentale est désactivée par défaut. La table de tir normale reste disponible et sert de solution de repli sûre.' }
            ],
            sources: { team17: 'Présentation officielle de WARDOGS et des règles — Team17', maps: 'Présentation des cartes WARDOGS — GameWatcher', reveal: 'Présentation de la carte Zestafona — vidéo WARDOGS' }
        },
        maps: {
            bakurani: {
                detail: 'quartier industriel entouré de montagnes d’Europe de l’Est', imageAlt: 'Paysage de Bakurani dans WARDOGS avec une église et un champ de tournesols',
                lead: 'Planifiez les positions d’artillerie, les cibles et les annotations d’équipe sur la carte calibrée de Bakurani dans un même espace de travail.', mapHighlight: 'Coordonnées de jeu calibrées pour Bakurani',
                facts: [['setting', 'Montagnes d’Europe de l’Est'], ['district', 'Quartier industriel']], profileHeading: 'Bakurani : montagnes, industrie et objectif mobile',
                profile: ['Les descriptions publiées présentent Bakurani comme un quartier industriel entouré de montagnes d’Europe de l’Est. Il s’agit d’une caractéristique confirmée, pas d’un nom de point d’intérêt inventé.', 'Dans WARDOGS, jusqu’à 100 joueurs sont répartis entre trois équipes. Le champ de bataille couvre 256 km², mais une zone de contrôle aléatoire de 2 × 2 km rapporte les points ; la première équipe à 100 points gagne.'],
                planningHeading: 'Planification de l’artillerie sur Bakurani', planning: ['Placez la pièce et la cible sur la carte ou saisissez leurs coordonnées. Le calculateur fournit distance, azimut, écarts de coordonnées et solution de l’arme choisie.', 'Les tuiles de Bakurani, la recherche de coordonnées, les cibles enregistrées et les annotations tactiques utilisent la même référence calibrée.'],
                terrainHeading: 'Relief de Bakurani et Terrain3D', terrain: ['Bakurani dispose de courbes de niveau et de données d’altitude Terrain3D. La valeur de la table normale reste visible pour comparer directement le candidat expérimental.']
            },
            ozeti: {
                detail: 'cadre d’Europe occidentale avec un stade de football', imageAlt: 'Stade d’Ozeti et paysage environnant dans WARDOGS',
                lead: 'Utilisez l’alignement corrigé d’Ozeti, la recherche de coordonnées et les calculs d’artillerie dans un espace cartographique cohérent.', mapHighlight: 'Alignement corrigé de la zone jouable d’Ozeti',
                facts: [['setting', 'Europe occidentale'], ['landmark', 'Stade de football']], profileHeading: 'Ozeti : l’Europe occidentale et le stade',
                profile: ['Les informations publiées situent Ozeti en Europe occidentale et désignent un stade de football comme son repère principal. La page n’attribue pas de valeur tactique non vérifiée à des positions particulières.', 'Le champ de bataille couvre 256 km², tandis que la zone utile au score est définie par une zone de contrôle aléatoire de 2 × 2 km. Jusqu’à 100 joueurs combattent en trois équipes.'],
                planningHeading: 'Planification par coordonnées sur Ozeti', planning: ['Saisissez des coordonnées connues ou placez visuellement la pièce et la cible. Vous pouvez verrouiller un point pendant le réglage de l’autre, puis enregistrer une solution utile.', 'La recherche de coordonnées déplace la caméra sans modifier le couple pièce–cible actif. La règle effectue une mesure indépendante.'],
                terrainHeading: 'Courbes de niveau d’Ozeti et Terrain3D', terrain: ['Sur Ozeti, les courbes de niveau peuvent être affichées et les altitudes utilisées pour les aperçus SPH-2 pris en charge. LOW et HIGH sont vérifiés indépendamment.']
            },
            zestafona: {
                detail: 'complexe industriel abandonné, grues et parc à conteneurs', imageAlt: 'Zone industrielle et parc à conteneurs de Zestafona dans WARDOGS',
                lead: 'Ouvrez Zestafona avec une URL directe et combinez placement précis, calculs de tir et outils cartographiques collaboratifs.', mapHighlight: 'Tuiles cartographiques multi-résolution pour Zestafona',
                facts: [['status', 'Troisième carte révélée avant l’accès anticipé'], ['focus', 'Usine, grues et parc à conteneurs']], profileHeading: 'Zestafona : présentation de la carte industrielle',
                profile: ['Zestafona a été présentée comme la troisième carte de WARDOGS avant l’accès anticipé. La vidéo montre un complexe industriel abandonné avec des bâtiments d’usine, des grues et des piles de conteneurs.', 'Aucune liste officielle détaillée des points d’intérêt n’a été publiée ; cette page n’invente donc ni noms de lieux, ni objectifs permanents, ni avantages tactiques.'],
                planningHeading: 'Préparer un plan de tir sur Zestafona', planning: ['Placez la pièce et la cible sur la carte ou par coordonnées, puis consultez distance, azimut, MIL et écarts sur les axes. Les verrous maintiennent un point pendant la modification de l’autre.', 'Les cibles enregistrées peuvent être restaurées, importées ou exportées séparément des dessins et marqueurs.'],
                terrainHeading: 'Contexte Terrain3D pour Zestafona', terrain: ['L’espace Zestafona comprend des courbes de niveau et une couverture d’altitude Terrain3D. Les tuiles multi-résolution autorisent un zoom précis sans modifier la référence des coordonnées.']
            }
        }
    },

    es: {
        ui: {
            skip: 'Ir al contenido del mapa', brandHome: 'Inicio de WARDOGS Artillery Calculator', calculator: 'Calculadora', language: 'Idioma', breadcrumbAria: 'Migas de pan', footerAria: 'Navegación del pie',
            breadcrumb: 'Mapa {map}', eyebrow: 'MAPA DE WARDOGS', imageCaption: '{map} en WARDOGS', capabilities: 'Funciones del mapa {map}', workspace: 'Herramientas de {map}',
            factsEyebrow: 'DATOS PUBLICADOS', factsHeading: 'Datos del campo de batalla {map}', factsIntro: 'La información publicada sobre el mapa se muestra por separado de las funciones de la calculadora.',
            faqHeading: 'Preguntas sobre el mapa {map}', sourcesHeading: 'Fuentes y verificación',
            sourcesIntro: 'La descripción del mapa y las reglas se limita a material publicado. Las funciones de la calculadora se describen aparte; no se han añadido nombres de puntos de interés no oficiales ni afirmaciones tácticas sin verificar.',
            openCalculator: 'Abrir la calculadora', openCalculatorBody: 'Continúa en la interfaz completa para ordenador o móvil con el mapa {map} ya seleccionado.', openMap: 'Abrir el mapa {map}',
            otherMaps: 'Otros mapas de WARDOGS', otherMapsAria: 'Otros mapas de WARDOGS', relatedMap: 'Mapa interactivo de {map}',
            footerDisclaimer: 'Proyecto comunitario no oficial. No está afiliado ni respaldado por BULKHEAD o el equipo de desarrollo de WARDOGS.', sourceCode: 'Código fuente'
        },
        content: {
            title: 'Mapa interactivo de WARDOGS {map} | Calculadora de artillería',
            description: 'Mapa interactivo de WARDOGS {map}: {detail}. Cálculos para L81 y SPH-2, curvas de nivel, Terrain3D, herramientas y salas de equipo.',
            heading: 'WARDOGS {map} — mapa interactivo',
            highlightWeapons: 'Soluciones de tiro para mortero L81 y SPH-2', highlightTerrain: 'Curvas de nivel y corrección Terrain3D opcional', highlightLobby: 'Anotaciones compartidas y cálculos personales en las salas',
            factLabels: { setting: 'Región publicada', district: 'Zona conocida', landmark: 'Punto de referencia', status: 'Estado del mapa', focus: 'Tema visual', battlefield: 'Tamaño del campo de batalla', objective: 'Objetivo principal' },
            battlefieldValue: '256 km²', objectiveValue: 'Zona de control aleatoria de 2 × 2 km',
            weaponsHeading: 'Mortero L81 y SPH-2 en {map}',
            weapons: ['Para el mortero L81, la calculadora muestra el MIL de la tabla, la distancia, el azimut y el estado de alcance. Las soluciones LOW y HIGH del SPH-2 se calculan por separado.', 'El arma, la pieza activa, el objetivo y el círculo de alcance pertenecen a cada jugador y no sustituyen los cálculos de sus compañeros.'],
            lobbyHeading: 'Planificación en equipo sobre {map}',
            lobby: ['Crea una sala y comparte el enlace o código de invitación. Los dibujos, zonas, polígonos y marcadores de usuario se sincronizan entre los participantes conectados.', 'Los compañeros ven las posiciones identificadas de otros jugadores sin sus círculos de alcance. La sala sincroniza navegadores, pero no recibe datos del servidor del juego.'],
            toolsHeading: 'Herramientas del mapa {map}',
            tools: ['La regla mide distancias, el lápiz permite dibujar y Zona o Polígono delimitan áreas. También hay marcadores tácticos, borrador, Deshacer y Rehacer.', 'Los datos de las herramientas del mapa se pueden importar y exportar por separado de los objetivos guardados.'],
            terrainSafety: 'Terrain3D está desactivado por defecto. Solo se aplican candidatos SAFE; las soluciones inciertas, no compatibles o inalcanzables usan la tabla normal. No se corrige la inclinación de la plataforma ni del chasis.',
            faq: [
                { question: '¿Cómo abro {map} directamente en la calculadora?', answer: 'Selecciona «Abrir el mapa {map}». La calculadora se inicia con un parámetro de mapa validado y guarda la selección de la forma habitual.' },
                { question: '¿Qué piezas admite el mapa {map}?', answer: 'Están disponibles la tabla de tiro del mortero L81 y las soluciones LOW/HIGH del SPH-2.' },
                { question: '¿Puede un equipo planificar junto en {map}?', answer: 'Sí. La sala sincroniza dibujos, zonas, polígonos y marcadores tácticos, mientras arma, pieza, objetivo y círculo de alcance siguen siendo personales.' },
                { question: '¿Es obligatorio Terrain3D?', answer: 'No. Es una opción experimental desactivada por defecto. La tabla de tiro normal sigue disponible como alternativa segura.' }
            ],
            sources: { team17: 'Descripción oficial de WARDOGS y sus partidas — Team17', maps: 'Resumen de los mapas de WARDOGS — GameWatcher', reveal: 'Presentación del mapa Zestafona — vídeo de WARDOGS' }
        },
        maps: {
            bakurani: {
                detail: 'distrito industrial entre montañas de Europa del Este', imageAlt: 'Paisaje de Bakurani en WARDOGS con una iglesia y un campo de girasoles',
                lead: 'Planifica posiciones de artillería, objetivos y anotaciones de equipo en el mapa calibrado de Bakurani dentro del mismo espacio de trabajo.', mapHighlight: 'Coordenadas de juego calibradas para Bakurani',
                facts: [['setting', 'Montañas de Europa del Este'], ['district', 'Distrito industrial']], profileHeading: 'Bakurani: montañas, industria y un objetivo cambiante',
                profile: ['Las descripciones publicadas presentan Bakurani como un distrito industrial rodeado de montañas de Europa del Este. Es un dato confirmado del mapa, no un nombre de punto de interés inventado.', 'En WARDOGS, hasta 100 jugadores se reparten en tres equipos. El campo de batalla ocupa 256 km², pero una zona de control aleatoria de 2 × 2 km concede puntos; gana el primer equipo que llega a 100.'],
                planningHeading: 'Planificación de artillería en Bakurani', planning: ['Coloca la pieza y el objetivo con un clic o introduce sus coordenadas. La calculadora devuelve distancia, azimut, diferencias de coordenadas y la solución del arma seleccionada.', 'Los tiles de Bakurani, la búsqueda de coordenadas, los objetivos guardados y las anotaciones tácticas usan la misma referencia calibrada.'],
                terrainHeading: 'Relieve de Bakurani y Terrain3D', terrain: ['Bakurani incluye curvas de nivel y datos de elevación Terrain3D. El valor de la tabla normal permanece visible para compararlo directamente con el candidato experimental.']
            },
            ozeti: {
                detail: 'entorno de Europa occidental con un estadio de fútbol', imageAlt: 'Estadio de Ozeti y paisaje circundante en WARDOGS',
                lead: 'Utiliza la alineación corregida de Ozeti, la búsqueda de coordenadas y los cálculos de artillería en un espacio cartográfico coherente.', mapHighlight: 'Alineación corregida del área jugable de Ozeti',
                facts: [['setting', 'Europa occidental'], ['landmark', 'Estadio de fútbol']], profileHeading: 'Ozeti: Europa occidental y el estadio',
                profile: ['La información publicada sitúa Ozeti en Europa occidental e identifica un estadio de fútbol como su referencia principal. La página no atribuye ventajas tácticas no verificadas a posiciones concretas.', 'El campo de batalla tiene 256 km², aunque el área relevante para puntuar la define una zona de control aleatoria de 2 × 2 km. Hasta 100 jugadores combaten en tres equipos.'],
                planningHeading: 'Planificación por coordenadas en Ozeti', planning: ['Introduce coordenadas conocidas o coloca visualmente la pieza y el objetivo. Puedes bloquear un punto mientras ajustas el otro y guardar una solución útil.', 'La búsqueda de coordenadas mueve la cámara sin modificar el par pieza–objetivo activo. La regla realiza una medición independiente.'],
                terrainHeading: 'Curvas de nivel de Ozeti y Terrain3D', terrain: ['En Ozeti se pueden activar las curvas de nivel y usar las elevaciones para las vistas previas compatibles del SPH-2. LOW y HIGH se comprueban por separado.']
            },
            zestafona: {
                detail: 'complejo industrial abandonado, grúas y patio de contenedores', imageAlt: 'Zona industrial y patio de contenedores de Zestafona en WARDOGS',
                lead: 'Abre Zestafona mediante una URL directa y combina colocación precisa, cálculos de tiro y herramientas de mapa colaborativas.', mapHighlight: 'Tiles multirresolución para Zestafona',
                facts: [['status', 'Tercer mapa presentado antes del acceso anticipado'], ['focus', 'Fábrica, grúas y patio de contenedores']], profileHeading: 'Zestafona: presentación del mapa industrial',
                profile: ['Zestafona se presentó como el tercer mapa de WARDOGS antes del acceso anticipado. El vídeo muestra un complejo industrial abandonado con edificios de fábrica, grúas y pilas de contenedores.', 'No se publicó una lista oficial detallada de puntos de interés, así que la página no inventa nombres de lugares, objetivos permanentes o ventajas tácticas.'],
                planningHeading: 'Preparar un plan de tiro en Zestafona', planning: ['Coloca la pieza y el objetivo en el mapa o mediante coordenadas y consulta distancia, azimut, MIL y diferencias de ejes. Los bloqueos mantienen un punto mientras se cambia el otro.', 'Los objetivos guardados se pueden restaurar, importar o exportar por separado de dibujos y marcadores.'],
                terrainHeading: 'Contexto Terrain3D para Zestafona', terrain: ['El espacio de Zestafona incluye curvas de nivel y cobertura de elevación Terrain3D. Los tiles multirresolución permiten acercarse sin alterar la referencia de coordenadas.']
            }
        }
    },

    pl: {
        ui: {
            skip: 'Przejdź do treści mapy', brandHome: 'Strona główna WARDOGS Artillery Calculator', calculator: 'Kalkulator', language: 'Język', breadcrumbAria: 'Okruszki nawigacyjne', footerAria: 'Nawigacja stopki',
            breadcrumb: 'Mapa {map}', eyebrow: 'MAPA WARDOGS', imageCaption: '{map} w WARDOGS', capabilities: 'Funkcje mapy {map}', workspace: 'Narzędzia {map}',
            factsEyebrow: 'OPUBLIKOWANE DANE', factsHeading: 'Fakty o polu bitwy {map}', factsIntro: 'Opublikowane informacje o mapie są oddzielone od opisu funkcji kalkulatora.',
            faqHeading: 'Pytania o mapę {map}', sourcesHeading: 'Źródła i weryfikacja',
            sourcesIntro: 'Opis mapy i zasad opiera się wyłącznie na opublikowanych materiałach. Funkcje kalkulatora opisano osobno; nie dodano nieoficjalnych nazw POI ani niepotwierdzonych twierdzeń taktycznych.',
            openCalculator: 'Otwórz kalkulator', openCalculatorBody: 'Kontynuuj w pełnym interfejsie komputerowym lub mobilnym z wybraną mapą {map}.', openMap: 'Otwórz mapę {map}',
            otherMaps: 'Inne mapy WARDOGS', otherMapsAria: 'Inne mapy WARDOGS', relatedMap: 'Interaktywna mapa {map}',
            footerDisclaimer: 'Nieoficjalny projekt społeczności. Nie jest powiązany ani wspierany przez BULKHEAD lub zespół WARDOGS.', sourceCode: 'Kod źródłowy'
        },
        content: {
            title: 'Interaktywna mapa WARDOGS {map} | Kalkulator artyleryjski',
            description: 'Interaktywna mapa WARDOGS {map}: {detail}. Obliczenia L81 i SPH-2, poziomice, Terrain3D, narzędzia mapy i pokoje zespołowe.',
            heading: 'WARDOGS {map} — interaktywna mapa',
            highlightWeapons: 'Rozwiązania dla moździerza L81 i SPH-2', highlightTerrain: 'Poziomice i ręcznie włączana korekta Terrain3D', highlightLobby: 'Wspólne oznaczenia i osobne obliczenia graczy w pokojach',
            factLabels: { setting: 'Opublikowany region', district: 'Znany obszar', landmark: 'Znany punkt orientacyjny', status: 'Status mapy', focus: 'Motyw wizualny', battlefield: 'Rozmiar pola bitwy', objective: 'Główny cel' },
            battlefieldValue: '256 km²', objectiveValue: 'Losowa strefa kontroli 2 × 2 km',
            weaponsHeading: 'Moździerz L81 i SPH-2 na mapie {map}',
            weapons: ['Dla moździerza L81 kalkulator pokazuje tabelaryczny MIL, dystans, azymut i status zasięgu. Rozwiązania LOW i HIGH dla SPH-2 są obliczane oddzielnie.', 'Broń, aktywne działo, cel i okrąg zasięgu należą do konkretnego gracza i nie zastępują obliczeń członków zespołu.'],
            lobbyHeading: 'Wspólne planowanie na mapie {map}',
            lobby: ['Utwórz pokój i udostępnij link lub kod zaproszenia. Rysunki, strefy, wielokąty i znaczniki użytkowników są synchronizowane między połączonymi uczestnikami.', 'Członkowie zespołu widzą podpisane pozycje innych graczy bez cudzych okręgów zasięgu. Pokój synchronizuje przeglądarki, ale nie pobiera danych z serwera gry.'],
            toolsHeading: 'Narzędzia mapy {map}',
            tools: ['Linijka mierzy dystans, Ołówek pozwala rysować, a Strefa i Wielokąt wyznaczają obszary. Dostępne są też markery taktyczne, Gumka, Cofnij i Ponów.', 'Dane narzędzi mapy można importować i eksportować niezależnie od zapisanych celów.'],
            terrainSafety: 'Terrain3D jest domyślnie wyłączone. Stosowane są tylko kandydaty SAFE; rozwiązania niepewne, nieobsługiwane lub nieosiągalne korzystają ze zwykłej tabeli. Przechył platformy i podwozia nie jest uwzględniany.',
            faq: [
                { question: 'Jak otworzyć mapę {map} bezpośrednio w kalkulatorze?', answer: 'Wybierz „Otwórz mapę {map}”. Kalkulator uruchomi się ze sprawdzonym parametrem mapy i zapisze wybór w zwykły sposób.' },
                { question: 'Jakie uzbrojenie obsługuje mapa {map}?', answer: 'Dostępna jest tabela strzelań moździerza L81 oraz rozwiązania LOW/HIGH dla SPH-2.' },
                { question: 'Czy zespół może wspólnie planować na {map}?', answer: 'Tak. Pokój synchronizuje rysunki, strefy, wielokąty i markery taktyczne, a broń, działo, cel i okrąg zasięgu pozostają osobiste.' },
                { question: 'Czy Terrain3D jest wymagane?', answer: 'Nie. To eksperymentalna opcja domyślnie wyłączona. Zwykła tabela pozostaje dostępna jako bezpieczna metoda zapasowa.' }
            ],
            sources: { team17: 'Oficjalny opis WARDOGS i zasad meczu — Team17', maps: 'Przegląd map WARDOGS — GameWatcher', reveal: 'Prezentacja mapy Zestafona — film WARDOGS' }
        },
        maps: {
            bakurani: {
                detail: 'dzielnica przemysłowa pośród wschodnioeuropejskich gór', imageAlt: 'Krajobraz Bakurani w WARDOGS z kościołem i polem słoneczników',
                lead: 'Planuj stanowiska artylerii, cele i oznaczenia zespołu na skalibrowanej mapie Bakurani w jednym obszarze roboczym.', mapHighlight: 'Skalibrowane współrzędne gry dla Bakurani',
                facts: [['setting', 'Góry Europy Wschodniej'], ['district', 'Dzielnica przemysłowa']], profileHeading: 'Bakurani: góry, przemysł i zmienny cel',
                profile: ['Opublikowane opisy przedstawiają Bakurani jako dzielnicę przemysłową otoczoną górami Europy Wschodniej. To potwierdzona cecha mapy, a nie wymyślona nazwa POI.', 'W WARDOGS do 100 graczy dzieli się na trzy zespoły. Pole bitwy ma 256 km², lecz punkty zapewnia losowa strefa kontroli 2 × 2 km; wygrywa pierwszy zespół ze 100 punktami.'],
                planningHeading: 'Planowanie artylerii na Bakurani', planning: ['Ustaw działo i cel kliknięciem mapy albo wprowadź współrzędne. Kalkulator zwraca dystans, azymut, różnice współrzędnych i rozwiązanie wybranej broni.', 'Kafelki Bakurani, wyszukiwanie współrzędnych, zapisane cele i oznaczenia taktyczne korzystają z tej samej skalibrowanej referencji.'],
                terrainHeading: 'Rzeźba Bakurani i Terrain3D', terrain: ['Bakurani zawiera poziomice i dane wysokości Terrain3D. Zwykła wartość tabelaryczna pozostaje widoczna do bezpośredniego porównania z kandydatem eksperymentalnym.']
            },
            ozeti: {
                detail: 'zachodnioeuropejskie otoczenie ze stadionem piłkarskim', imageAlt: 'Stadion Ozeti i otaczający krajobraz w WARDOGS',
                lead: 'Korzystaj z poprawionego wyrównania Ozeti, wyszukiwania współrzędnych i obliczeń artylerii w jednym spójnym układzie mapy.', mapHighlight: 'Poprawione wyrównanie grywalnego obszaru Ozeti',
                facts: [['setting', 'Europa Zachodnia'], ['landmark', 'Stadion piłkarski']], profileHeading: 'Ozeti: Europa Zachodnia i stadion',
                profile: ['Opublikowane informacje umieszczają Ozeti w Europie Zachodniej i wskazują stadion piłkarski jako główny punkt orientacyjny. Strona nie przypisuje pozycjom niepotwierdzonej wartości taktycznej.', 'Pole bitwy obejmuje 256 km², ale obszar punktowania określa losowa strefa kontroli 2 × 2 km. Do 100 graczy walczy w trzech zespołach.'],
                planningHeading: 'Planowanie współrzędnych na Ozeti', planning: ['Wprowadź znane współrzędne lub ustaw działo i cel wizualnie. Jeden punkt można zablokować podczas regulowania drugiego, a użyteczne rozwiązanie zapisać.', 'Wyszukiwanie współrzędnych przesuwa kamerę bez zmiany aktywnej pary działo–cel. Linijka wykonuje niezależny pomiar mapy.'],
                terrainHeading: 'Poziomice Ozeti i Terrain3D', terrain: ['Na Ozeti można włączyć poziomice i korzystać z danych wysokości w obsługiwanych podglądach SPH-2. LOW i HIGH są sprawdzane niezależnie.']
            },
            zestafona: {
                detail: 'opuszczony kompleks przemysłowy, dźwigi i plac kontenerowy', imageAlt: 'Strefa przemysłowa i plac kontenerowy Zestafona w WARDOGS',
                lead: 'Otwórz Zestafona przez bezpośredni URL i połącz precyzyjne ustawianie punktów, obliczenia ognia oraz wspólne narzędzia mapy.', mapHighlight: 'Wielopoziomowe kafelki mapy Zestafona',
                facts: [['status', 'Trzecia mapa ujawniona przed Early Access'], ['focus', 'Fabryka, dźwigi i plac kontenerowy']], profileHeading: 'Zestafona: prezentacja mapy przemysłowej',
                profile: ['Zestafona została pokazana jako trzecia mapa WARDOGS przed Early Access. Film przedstawia opuszczony kompleks przemysłowy z budynkami fabrycznymi, dźwigami i stosami kontenerów.', 'Nie opublikowano szczegółowej oficjalnej listy POI, dlatego strona nie wymyśla nazw miejsc, stałych celów ani przewag taktycznych.'],
                planningHeading: 'Plan ogniowy na Zestafona', planning: ['Ustaw działo i cel na mapie lub przez współrzędne, a następnie odczytaj dystans, azymut, MIL i różnice osi. Blokady utrzymują jeden punkt podczas zmiany drugiego.', 'Zapisane cele można przywracać, importować i eksportować niezależnie od rysunków i markerów.'],
                terrainHeading: 'Kontekst Terrain3D dla Zestafona', terrain: ['Obszar roboczy Zestafona zawiera poziomice i dane wysokości Terrain3D. Wielopoziomowe kafelki pozwalają przybliżać mapę bez zmiany odniesienia współrzędnych.']
            }
        }
    },

    pt: {
        ui: {
            skip: 'Ir para o conteúdo do mapa', brandHome: 'Página inicial do WARDOGS Artillery Calculator', calculator: 'Calculadora', language: 'Idioma', breadcrumbAria: 'Navegação estrutural', footerAria: 'Navegação do rodapé',
            breadcrumb: 'Mapa de {map}', eyebrow: 'MAPA WARDOGS', imageCaption: '{map} em WARDOGS', capabilities: 'Recursos do mapa {map}', workspace: 'Área de trabalho de {map}',
            factsEyebrow: 'DADOS PUBLICADOS', factsHeading: 'Factos do campo de batalha de {map}', factsIntro: 'Informação publicada sobre o mapa do jogo, apresentada separadamente dos recursos da calculadora.',
            faqHeading: 'Perguntas sobre o mapa {map}', sourcesHeading: 'Fontes e verificação',
            sourcesIntro: 'O perfil do mapa e das partidas usa apenas informação publicada. Os recursos da calculadora são descritos separadamente; não são inventados nomes de locais nem vantagens táticas não confirmadas.',
            openCalculator: 'Abrir a calculadora', openCalculatorBody: 'Continue na interface completa para computador ou telemóvel com o mapa {map} já selecionado.', openMap: 'Abrir o mapa {map}',
            otherMaps: 'Outros mapas de WARDOGS', otherMapsAria: 'Outros mapas de WARDOGS', relatedMap: 'Mapa interativo de {map}',
            footerDisclaimer: 'Projeto comunitário não oficial. Não é afiliado nem apoiado pela BULKHEAD ou pela equipa de WARDOGS.', sourceCode: 'Código-fonte'
        },
        content: {
            title: 'Mapa interativo de WARDOGS {map} | Calculadora de artilharia',
            description: 'Mapa interativo de WARDOGS {map}: {detail}. Cálculos para L81 e SPH-2, curvas de nível, Terrain3D, ferramentas de mapa e salas de equipa.',
            heading: 'Mapa interativo de WARDOGS {map}',
            highlightWeapons: 'Soluções para morteiro L81 e SPH-2', highlightTerrain: 'Curvas de nível e correção Terrain3D opcional', highlightLobby: 'Anotações partilhadas e cálculos individuais nas salas',
            factLabels: { setting: 'Região publicada', district: 'Área conhecida', landmark: 'Referência conhecida', status: 'Estado do mapa', focus: 'Tema visual', battlefield: 'Dimensão do campo de batalha', objective: 'Objetivo principal' },
            battlefieldValue: '256 km²', objectiveValue: 'Zona de Controlo aleatória de 2 × 2 km',
            weaponsHeading: 'Morteiro L81 e SPH-2 em {map}',
            weapons: ['Para o morteiro L81, a calculadora mostra o MIL da tabela de tiro, distância, azimute e estado de alcance. As soluções LOW e HIGH do SPH-2 são calculadas separadamente.', 'A arma, a posição de artilharia ativa, o alvo e o círculo de alcance pertencem a cada jogador e não substituem os cálculos dos colegas.'],
            lobbyHeading: 'Planeamento de equipa partilhado em {map}',
            lobby: ['Crie uma sala e partilhe o link ou código de convite. Desenhos, zonas, polígonos e marcadores de utilizador são sincronizados entre os participantes ligados.', 'Os colegas veem as posições identificadas dos outros jogadores sem os seus círculos de alcance. A sala sincroniza os navegadores; não recebe dados de um servidor de jogo em direto.'],
            toolsHeading: 'Ferramentas do mapa {map}',
            tools: ['A Régua mede distâncias, o Lápis permite desenhar e Zona ou Polígono delimitam áreas. Também existem marcadores táticos, Borracha, Desfazer e Refazer.', 'Os dados das ferramentas de mapa podem ser importados e exportados separadamente dos alvos guardados.'],
            terrainSafety: 'Terrain3D vem desativado. Apenas candidatos SAFE são aplicados; resultados incertos, não suportados ou inalcançáveis usam a tabela normal. A inclinação da plataforma ou do chassis não é corrigida.',
            faq: [
                { question: 'Como abro {map} diretamente na calculadora?', answer: 'Selecione «Abrir o mapa {map}». A calculadora inicia com um parâmetro de mapa validado e guarda a seleção normalmente.' },
                { question: 'Que armas são suportadas no mapa {map}?', answer: 'Estão disponíveis a tabela de tiro do morteiro L81 e as soluções LOW/HIGH do SPH-2.' },
                { question: 'Uma equipa pode planear em conjunto em {map}?', answer: 'Sim. A sala sincroniza desenhos, zonas, polígonos e marcadores táticos, enquanto arma, artilharia, alvo e círculo de alcance permanecem pessoais.' },
                { question: 'Terrain3D é obrigatório?', answer: 'Não. É uma opção experimental desativada por defeito. A tabela de tiro normal continua disponível como alternativa segura.' }
            ],
            sources: { team17: 'Descrição oficial de WARDOGS e das partidas — Team17', maps: 'Visão geral dos mapas de WARDOGS — GameWatcher', reveal: 'Apresentação do mapa Zestafona — vídeo de WARDOGS' }
        },
        maps: {
            bakurani: {
                detail: 'zona industrial entre montanhas da Europa de Leste', imageAlt: 'Paisagem de Bakurani em WARDOGS com uma igreja e um campo de girassóis',
                lead: 'Planeie posições de artilharia, alvos e anotações da equipa no mapa calibrado de Bakurani dentro da mesma área de trabalho.', mapHighlight: 'Coordenadas de jogo calibradas para Bakurani',
                facts: [['setting', 'Montanhas da Europa de Leste'], ['district', 'Zona industrial']], profileHeading: 'Bakurani: montanhas, indústria e um objetivo móvel',
                profile: ['As descrições publicadas apresentam Bakurani como uma zona industrial rodeada pelas montanhas da Europa de Leste. É uma característica confirmada do mapa, não um nome de local inventado.', 'Em WARDOGS, até 100 jogadores dividem-se por três equipas. O campo de batalha ocupa 256 km², mas uma Zona de Controlo aleatória de 2 × 2 km atribui pontos; vence a primeira equipa a chegar aos 100.'],
                planningHeading: 'Planeamento de artilharia em Bakurani', planning: ['Coloque a artilharia e o alvo com um clique ou introduza coordenadas. A calculadora devolve distância, azimute, diferenças de coordenadas e a solução da arma escolhida.', 'Os mosaicos de Bakurani, a pesquisa por coordenadas, os alvos guardados e as anotações táticas usam a mesma referência calibrada.'],
                terrainHeading: 'Relevo de Bakurani e Terrain3D', terrain: ['Bakurani inclui curvas de nível e dados de elevação Terrain3D. O valor da tabela normal permanece visível para comparação direta com o candidato experimental.']
            },
            ozeti: {
                detail: 'ambiente da Europa Ocidental com um estádio de futebol', imageAlt: 'Estádio de Ozeti e paisagem envolvente em WARDOGS',
                lead: 'Use o alinhamento corrigido de Ozeti, a pesquisa por coordenadas e os cálculos de artilharia numa referência cartográfica coerente.', mapHighlight: 'Alinhamento corrigido da área jogável de Ozeti',
                facts: [['setting', 'Europa Ocidental'], ['landmark', 'Estádio de futebol']], profileHeading: 'Ozeti: Europa Ocidental e o estádio',
                profile: ['A informação publicada situa Ozeti na Europa Ocidental e identifica um estádio de futebol como a sua principal referência. A página não atribui vantagens táticas não verificadas a posições específicas.', 'O campo de batalha tem 256 km², embora a área relevante para pontuar seja definida por uma Zona de Controlo aleatória de 2 × 2 km. Até 100 jogadores combatem em três equipas.'],
                planningHeading: 'Planeamento por coordenadas em Ozeti', planning: ['Introduza coordenadas conhecidas ou coloque visualmente a artilharia e o alvo. Pode bloquear um ponto enquanto ajusta o outro e guardar uma solução útil.', 'A pesquisa por coordenadas move a câmara sem alterar o par artilharia–alvo ativo. A Régua faz uma medição independente.'],
                terrainHeading: 'Curvas de nível de Ozeti e Terrain3D', terrain: ['Em Ozeti pode ativar curvas de nível e usar os dados de elevação nas pré-visualizações compatíveis do SPH-2. LOW e HIGH são verificados separadamente.']
            },
            zestafona: {
                detail: 'complexo industrial abandonado, gruas e parque de contentores', imageAlt: 'Zona industrial e parque de contentores de Zestafona em WARDOGS',
                lead: 'Abra Zestafona por um URL direto e combine posicionamento preciso, cálculos de tiro e ferramentas cartográficas colaborativas.', mapHighlight: 'Mosaicos multirresolução para Zestafona',
                facts: [['status', 'Terceiro mapa revelado antes do Acesso Antecipado'], ['focus', 'Fábrica, gruas e parque de contentores']], profileHeading: 'Zestafona: a revelação do mapa industrial',
                profile: ['Zestafona foi apresentado como o terceiro mapa de WARDOGS antes do Acesso Antecipado. O vídeo mostra um complexo industrial abandonado com fábricas, gruas e pilhas de contentores.', 'Não foi publicada uma lista oficial detalhada de pontos de interesse, por isso a página não inventa nomes de locais, objetivos permanentes ou vantagens táticas.'],
                planningHeading: 'Preparar um plano de tiro em Zestafona', planning: ['Coloque a artilharia e o alvo no mapa ou por coordenadas e consulte distância, azimute, MIL e diferenças entre eixos. Os bloqueios mantêm um ponto enquanto altera o outro.', 'Os alvos guardados podem ser restaurados, importados ou exportados separadamente de desenhos e marcadores.'],
                terrainHeading: 'Contexto Terrain3D para Zestafona', terrain: ['A área de trabalho de Zestafona inclui curvas de nível e cobertura de elevação Terrain3D. Os mosaicos multirresolução permitem ampliar sem alterar a referência de coordenadas.']
            }
        }
    },

    'zh-cn': {
        ui: {
            skip: '跳到地图内容', brandHome: 'WARDOGS 火炮计算器首页', calculator: '计算器', language: '语言', breadcrumbAria: '面包屑导航', footerAria: '页脚导航',
            breadcrumb: '{map} 地图', eyebrow: 'WARDOGS 地图', imageCaption: 'WARDOGS 中的 {map}', capabilities: '{map} 地图功能', workspace: '{map} 工作区',
            factsEyebrow: '已公开的地图资料', factsHeading: '{map} 战场资料', factsIntro: '这里列出已公开的游戏地图信息，并与计算器功能说明分开。',
            faqHeading: '{map} 地图常见问题', sourcesHeading: '来源与核验',
            sourcesIntro: '地图和对局介绍只采用已公开资料。计算器功能另行说明；页面不会编造地点名称或未经证实的战术优势。',
            openCalculator: '打开计算器', openCalculatorBody: '在桌面版或移动版完整界面中继续，并预先选择 {map}。', openMap: '打开 {map} 地图',
            otherMaps: '其他 WARDOGS 地图', otherMapsAria: '其他 WARDOGS 地图', relatedMap: '{map} 互动地图',
            footerDisclaimer: '非官方社区项目，与 BULKHEAD 或 WARDOGS 团队无隶属或赞助关系。', sourceCode: '源代码'
        },
        content: {
            title: 'WARDOGS {map} 互动地图 | 火炮计算器',
            description: 'WARDOGS {map} 互动地图：{detail}。支持 L81 与 SPH-2 计算、等高线、Terrain3D、地图工具和团队房间。',
            heading: 'WARDOGS {map} 互动地图',
            highlightWeapons: 'L81 迫击炮与 SPH-2 射击解算', highlightTerrain: '等高线与可选 Terrain3D 修正', highlightLobby: '房间内共享标注、玩家各自保留射击解算',
            factLabels: { setting: '公开地区', district: '已知区域', landmark: '已知地标', status: '地图状态', focus: '视觉主题', battlefield: '战场面积', objective: '核心目标' },
            battlefieldValue: '256 平方公里', objectiveValue: '随机 2 × 2 公里控制区',
            weaponsHeading: '{map} 的 L81 迫击炮与 SPH-2',
            weapons: ['L81 迫击炮会显示射表 MIL、距离、方位角和射程状态；SPH-2 的 LOW 与 HIGH 解算会分别计算。', '武器、当前火炮位置、目标和射程圈均属于各自玩家，不会覆盖队友的射击解算。'],
            lobbyHeading: '在 {map} 上协同规划',
            lobby: ['创建房间并分享邀请链接或代码。已连接参与者之间会同步绘图、区域、多边形和用户标记。', '队友可以看到带昵称的其他玩家位置，但不会看到对方的射程圈。房间只同步浏览器内的规划，不读取实时游戏服务器数据。'],
            toolsHeading: '{map} 地图工具',
            tools: ['标尺用于测距，铅笔用于自由绘制，区域和多边形用于圈定范围；另有战术标记、橡皮擦、撤销和重做。', '地图工具数据可单独导入和导出，不与已保存目标混在一起。'],
            terrainSafety: 'Terrain3D 默认关闭。只有 SAFE 候选结果会被采用；不确定、不支持或不可达时继续使用普通射表。当前不修正平台或车体倾斜。',
            faq: [
                { question: '如何在计算器中直接打开 {map}？', answer: '选择“打开 {map} 地图”。计算器会使用经过校验的地图参数启动，并按正常方式保存选择。' },
                { question: '{map} 支持哪些武器？', answer: '支持 L81 迫击炮射表，以及 SPH-2 的 LOW/HIGH 解算。' },
                { question: '队伍能在 {map} 上共同规划吗？', answer: '可以。房间同步绘图、区域、多边形和战术标记，而武器、火炮、目标和射程圈仍归个人所有。' },
                { question: '必须启用 Terrain3D 吗？', answer: '不必。它是默认关闭的实验选项，普通射表始终可作为安全后备。' }
            ],
            sources: { team17: 'WARDOGS 游戏与对局官方介绍 — Team17', maps: 'WARDOGS 地图概览 — GameWatcher', reveal: 'Zestafona 地图展示 — WARDOGS 视频' }
        },
        maps: {
            bakurani: {
                detail: '东欧群山环绕的工业区', imageAlt: 'WARDOGS 的 Bakurani 风景，画面中有教堂和向日葵田',
                lead: '在同一工作区内，使用经过校准的 Bakurani 地图规划火炮位置、目标和团队标注。', mapHighlight: 'Bakurani 游戏坐标校准',
                facts: [['setting', '东欧山地'], ['district', '工业区']], profileHeading: 'Bakurani：群山、工业区与变化的目标',
                profile: ['公开介绍将 Bakurani 描述为东欧群山环绕的工业区。这是已确认的地图特征，并非页面杜撰的兴趣点名称。', 'WARDOGS 一局最多有 100 名玩家，分为三队。完整战场面积为 256 平方公里，但随机出现的 2 × 2 公里控制区决定得分；先达到 100 分的队伍获胜。'],
                planningHeading: 'Bakurani 火炮规划', planning: ['在地图上点击或输入坐标来设置火炮和目标。计算器会返回距离、方位角、坐标差和所选武器的射击解算。', 'Bakurani 图块、坐标搜索、已保存目标和战术标注都使用同一套校准基准。'],
                terrainHeading: 'Bakurani 地形与 Terrain3D', terrain: ['Bakurani 提供等高线和 Terrain3D 高程数据。普通射表数值仍会显示，方便与实验候选结果直接比较。']
            },
            ozeti: {
                detail: '带有足球场地标的西欧环境', imageAlt: 'WARDOGS 中 Ozeti 的体育场及周边景观',
                lead: '在统一的地图基准中使用修正后的 Ozeti 对齐、坐标搜索和火炮计算。', mapHighlight: 'Ozeti 可玩区域对齐修正',
                facts: [['setting', '西欧'], ['landmark', '足球场']], profileHeading: 'Ozeti：西欧与体育场',
                profile: ['公开资料将 Ozeti 置于西欧，并把足球场列为主要地标。页面不会为具体位置添加未经证实的战术价值。', '战场总面积为 256 平方公里，实际计分范围由随机的 2 × 2 公里控制区决定。最多 100 名玩家分成三队交战。'],
                planningHeading: 'Ozeti 坐标规划', planning: ['输入已知坐标，或在地图上设置火炮与目标。调整其中一点时可锁定另一点，并保存有用的解算。', '坐标搜索只移动镜头，不改变当前火炮—目标组合；标尺则进行独立测量。'],
                terrainHeading: 'Ozeti 等高线与 Terrain3D', terrain: ['Ozeti 可开启等高线，并在受支持的 SPH-2 预览中使用高程数据。LOW 与 HIGH 会分别检查。']
            },
            zestafona: {
                detail: '废弃工业设施、起重机与集装箱堆场', imageAlt: 'WARDOGS 中 Zestafona 的工业区和集装箱堆场',
                lead: '通过独立 URL 打开 Zestafona，并结合精准放点、射击计算和协作地图工具。', mapHighlight: 'Zestafona 多分辨率地图图块',
                facts: [['status', '抢先体验前公布的第三张地图'], ['focus', '工厂、起重机与集装箱堆场']], profileHeading: 'Zestafona：工业地图展示',
                profile: ['Zestafona 在抢先体验前作为 WARDOGS 的第三张地图公开。展示视频出现了废弃工业设施、厂房、起重机和成堆的集装箱。', '官方尚未发布详细的兴趣点清单，因此页面不会编造地点名称、固定目标或战术优势。'],
                planningHeading: '制定 Zestafona 射击计划', planning: ['在地图上或通过坐标设置火炮和目标，查看距离、方位角、MIL 与坐标轴差值。锁定功能可在调整一点时保留另一点。', '已保存目标可恢复、导入或导出，并与绘图和标记数据分开。'],
                terrainHeading: 'Zestafona 的 Terrain3D 环境', terrain: ['Zestafona 工作区提供等高线和 Terrain3D 高程覆盖。多分辨率图块可用于缩放，同时保持坐标基准不变。']
            }
        }
    },

    ko: {
        ui: {
            skip: '지도 내용으로 이동', brandHome: 'WARDOGS 포병 계산기 홈', calculator: '계산기', language: '언어', breadcrumbAria: '이동 경로', footerAria: '바닥글 탐색',
            breadcrumb: '{map} 지도', eyebrow: 'WARDOGS 지도', imageCaption: 'WARDOGS의 {map}', capabilities: '{map} 지도 기능', workspace: '{map} 작업 공간',
            factsEyebrow: '공개된 지도 정보', factsHeading: '{map} 전장 정보', factsIntro: '공개된 게임 지도 정보와 계산기 기능 설명을 구분해 제공합니다.',
            faqHeading: '{map} 지도 FAQ', sourcesHeading: '출처 및 확인',
            sourcesIntro: '지도와 매치 설명에는 공개된 정보만 사용했습니다. 계산기 기능은 별도로 설명하며, 비공식 지명이나 확인되지 않은 전술적 이점을 만들지 않습니다.',
            openCalculator: '계산기 열기', openCalculatorBody: '{map}이 선택된 전체 데스크톱 또는 모바일 인터페이스에서 계속합니다.', openMap: '{map} 지도 열기',
            otherMaps: '다른 WARDOGS 지도', otherMapsAria: '다른 WARDOGS 지도', relatedMap: '{map} 인터랙티브 지도',
            footerDisclaimer: '비공식 커뮤니티 프로젝트입니다. BULKHEAD 또는 WARDOGS 팀과 제휴하거나 후원받지 않습니다.', sourceCode: '소스 코드'
        },
        content: {
            title: 'WARDOGS {map} 인터랙티브 지도 | 포병 계산기',
            description: 'WARDOGS {map} 인터랙티브 지도: {detail}. L81 및 SPH-2 계산, 등고선, Terrain3D, 지도 도구와 팀 로비를 제공합니다.',
            heading: 'WARDOGS {map} 인터랙티브 지도',
            highlightWeapons: 'L81 박격포 및 SPH-2 사격 해법', highlightTerrain: '등고선과 선택형 Terrain3D 보정', highlightLobby: '로비에서 공유 주석과 개인별 사격 해법 제공',
            factLabels: { setting: '공개 지역', district: '알려진 구역', landmark: '알려진 랜드마크', status: '지도 상태', focus: '시각적 특징', battlefield: '전장 크기', objective: '핵심 목표' },
            battlefieldValue: '256 km²', objectiveValue: '무작위 2 × 2 km 통제 구역',
            weaponsHeading: '{map}의 L81 박격포와 SPH-2',
            weapons: ['L81 박격포는 사격표 MIL, 거리, 방위각과 사거리 상태를 표시합니다. SPH-2의 LOW 및 HIGH 해법은 각각 계산됩니다.', '무기, 현재 포 위치, 목표와 사거리 원은 플레이어별로 유지되며 팀원의 사격 해법을 덮어쓰지 않습니다.'],
            lobbyHeading: '{map} 팀 공동 계획',
            lobby: ['로비를 만들고 초대 링크나 코드를 공유하세요. 연결된 참가자 사이에서 그림, 구역, 다각형과 사용자 마커가 동기화됩니다.', '팀원은 다른 플레이어의 닉네임이 표시된 위치를 볼 수 있지만 그들의 사거리 원은 보지 않습니다. 로비는 브라우저의 계획을 동기화하며 실시간 게임 서버 데이터를 가져오지 않습니다.'],
            toolsHeading: '{map} 지도 도구',
            tools: ['자는 거리를 재고, 연필은 자유롭게 그리며, 구역과 다각형은 영역을 표시합니다. 전술 마커, 지우개, 실행 취소와 다시 실행도 사용할 수 있습니다.', '지도 도구 데이터는 저장된 목표와 별도로 가져오거나 내보낼 수 있습니다.'],
            terrainSafety: 'Terrain3D는 기본적으로 꺼져 있습니다. SAFE 후보만 적용되며 불확실하거나 지원되지 않거나 도달할 수 없는 결과는 일반 사격표를 사용합니다. 플랫폼과 차체 기울기는 보정하지 않습니다.',
            faq: [
                { question: '계산기에서 {map}을 바로 여는 방법은 무엇인가요?', answer: '“{map} 지도 열기”를 선택하세요. 검증된 지도 매개변수로 계산기가 시작되고 선택은 평소와 같이 저장됩니다.' },
                { question: '{map} 지도에서 어떤 무기를 지원하나요?', answer: 'L81 박격포 사격표와 SPH-2 LOW/HIGH 해법을 사용할 수 있습니다.' },
                { question: '팀이 {map}에서 함께 계획할 수 있나요?', answer: '예. 로비는 그림, 구역, 다각형과 전술 마커를 동기화하며 무기, 포, 목표와 사거리 원은 개인별로 유지합니다.' },
                { question: 'Terrain3D가 필수인가요?', answer: '아닙니다. 기본적으로 꺼져 있는 실험 기능입니다. 일반 사격표가 안전한 대안으로 계속 제공됩니다.' }
            ],
            sources: { team17: 'WARDOGS 게임 및 매치 공식 소개 — Team17', maps: 'WARDOGS 지도 개요 — GameWatcher', reveal: 'Zestafona 지도 공개 — WARDOGS 영상' }
        },
        maps: {
            bakurani: {
                detail: '동유럽 산악 지대에 둘러싸인 산업 구역', imageAlt: '교회와 해바라기밭이 보이는 WARDOGS Bakurani 풍경',
                lead: '하나의 작업 공간에서 보정된 Bakurani 지도로 포병 위치, 목표와 팀 주석을 계획하세요.', mapHighlight: 'Bakurani 게임 좌표 보정',
                facts: [['setting', '동유럽 산악 지대'], ['district', '산업 구역']], profileHeading: 'Bakurani: 산악 지대, 산업 구역과 이동하는 목표',
                profile: ['공개된 설명은 Bakurani를 동유럽 산악 지대에 둘러싸인 산업 구역으로 소개합니다. 이는 확인된 지도 특징이며 임의로 만든 지명이 아닙니다.', 'WARDOGS에서는 최대 100명이 세 팀으로 나뉩니다. 전장은 256 km²지만, 무작위 2 × 2 km 통제 구역에서 점수를 얻으며 먼저 100점에 도달한 팀이 승리합니다.'],
                planningHeading: 'Bakurani 포병 계획', planning: ['지도를 클릭하거나 좌표를 입력해 포와 목표를 배치하세요. 계산기는 거리, 방위각, 좌표 차이와 선택한 무기의 해법을 반환합니다.', 'Bakurani 타일, 좌표 검색, 저장 목표와 전술 주석은 동일한 보정 기준을 사용합니다.'],
                terrainHeading: 'Bakurani 지형과 Terrain3D', terrain: ['Bakurani에는 등고선과 Terrain3D 고도 데이터가 있습니다. 실험 후보와 직접 비교할 수 있도록 일반 사격표 값도 계속 표시됩니다.']
            },
            ozeti: {
                detail: '축구 경기장이 있는 서유럽 환경', imageAlt: 'WARDOGS Ozeti 경기장과 주변 풍경',
                lead: '하나의 일관된 지도 기준에서 수정된 Ozeti 정렬, 좌표 검색과 포병 계산을 사용하세요.', mapHighlight: 'Ozeti 플레이 가능 구역 정렬 수정',
                facts: [['setting', '서유럽'], ['landmark', '축구 경기장']], profileHeading: 'Ozeti: 서유럽과 경기장',
                profile: ['공개 정보는 Ozeti를 서유럽에 배치하고 축구 경기장을 대표 랜드마크로 소개합니다. 이 페이지는 특정 위치에 확인되지 않은 전술적 가치를 부여하지 않습니다.', '전장은 256 km²이며 실제 점수 구역은 무작위 2 × 2 km 통제 구역으로 정해집니다. 최대 100명이 세 팀으로 전투합니다.'],
                planningHeading: 'Ozeti 좌표 기반 계획', planning: ['알려진 좌표를 입력하거나 포와 목표를 지도에 배치하세요. 한 지점을 잠근 채 다른 지점을 조정하고 유용한 해법을 저장할 수 있습니다.', '좌표 검색은 현재 포–목표 쌍을 바꾸지 않고 카메라만 이동합니다. 자는 별도의 지도를 측정합니다.'],
                terrainHeading: 'Ozeti 등고선과 Terrain3D', terrain: ['Ozeti에서는 등고선을 켜고 지원되는 SPH-2 미리보기에 고도 데이터를 사용할 수 있습니다. LOW와 HIGH는 각각 확인됩니다.']
            },
            zestafona: {
                detail: '폐산업 단지, 크레인과 컨테이너 야적장', imageAlt: 'WARDOGS Zestafona 산업 구역과 컨테이너 야적장',
                lead: '직접 URL로 Zestafona를 열고 정밀한 지점 배치, 사격 계산과 협업 지도 도구를 함께 사용하세요.', mapHighlight: 'Zestafona 다중 해상도 지도 타일',
                facts: [['status', '앞서 해보기 전에 공개된 세 번째 지도'], ['focus', '공장, 크레인과 컨테이너 야적장']], profileHeading: 'Zestafona: 산업 지도 공개',
                profile: ['Zestafona는 앞서 해보기를 앞두고 WARDOGS의 세 번째 지도로 공개되었습니다. 영상에는 공장 건물, 크레인과 컨테이너 더미가 있는 폐산업 단지가 등장합니다.', '공식적인 세부 관심 지점 목록은 공개되지 않았으므로 이 페이지는 지명, 고정 목표나 전술적 이점을 만들어내지 않습니다.'],
                planningHeading: 'Zestafona 사격 계획 만들기', planning: ['지도 또는 좌표로 포와 목표를 배치하고 거리, 방위각, MIL과 축 차이를 확인하세요. 잠금은 한 지점을 유지하면서 다른 지점을 바꿀 수 있게 합니다.', '저장된 목표는 그림이나 마커와 별도로 복원, 가져오기 또는 내보내기가 가능합니다.'],
                terrainHeading: 'Zestafona Terrain3D 정보', terrain: ['Zestafona 작업 공간에는 등고선과 Terrain3D 고도 범위가 있습니다. 다중 해상도 타일로 좌표 기준을 바꾸지 않고 확대할 수 있습니다.']
            }
        }
    },

    ja: {
        ui: {
            skip: 'マップ本文へ移動', brandHome: 'WARDOGS Artillery Calculator ホーム', calculator: '計算機', language: '言語', breadcrumbAria: 'パンくずリスト', footerAria: 'フッターナビゲーション',
            breadcrumb: '{map} マップ', eyebrow: 'WARDOGS マップ', imageCaption: 'WARDOGS の {map}', capabilities: '{map} マップの機能', workspace: '{map} ワークスペース',
            factsEyebrow: '公開済みマップ情報', factsHeading: '{map} の戦場情報', factsIntro: '公開されているゲームマップ情報を、計算機の機能説明とは分けて掲載しています。',
            faqHeading: '{map} マップ FAQ', sourcesHeading: '出典と確認',
            sourcesIntro: 'マップとマッチの説明には公開情報のみを使用しています。計算機の機能は別に説明し、非公式の地名や未確認の戦術的優位性は作りません。',
            openCalculator: '計算機を開く', openCalculatorBody: '{map} を選択した状態で、デスクトップまたはモバイルの完全な画面へ進みます。', openMap: '{map} マップを開く',
            otherMaps: 'その他の WARDOGS マップ', otherMapsAria: 'その他の WARDOGS マップ', relatedMap: '{map} インタラクティブマップ',
            footerDisclaimer: '非公式コミュニティプロジェクトです。BULKHEAD または WARDOGS チームとの提携・支援関係はありません。', sourceCode: 'ソースコード'
        },
        content: {
            title: 'WARDOGS {map} インタラクティブマップ | 砲撃計算機',
            description: 'WARDOGS {map} インタラクティブマップ：{detail}。L81 と SPH-2 の計算、等高線、Terrain3D、マップツール、チームロビーに対応。',
            heading: 'WARDOGS {map} インタラクティブマップ',
            highlightWeapons: 'L81 迫撃砲と SPH-2 の射撃解', highlightTerrain: '等高線と任意の Terrain3D 補正', highlightLobby: 'ロビーで注釈を共有し、射撃解はプレイヤー別に保持',
            factLabels: { setting: '公開地域', district: '既知の区域', landmark: '既知のランドマーク', status: 'マップ状況', focus: 'ビジュアルテーマ', battlefield: '戦場規模', objective: '主要目標' },
            battlefieldValue: '256 km²', objectiveValue: 'ランダムな 2 × 2 km のコントロールゾーン',
            weaponsHeading: '{map} の L81 迫撃砲と SPH-2',
            weapons: ['L81 迫撃砲では射表の MIL、距離、方位角、射程状態を表示します。SPH-2 の LOW と HIGH の解は個別に計算されます。', '武器、現在の砲位置、目標、射程円はプレイヤーごとに保持され、チームメイトの射撃解を上書きしません。'],
            lobbyHeading: '{map} での共同計画',
            lobby: ['ロビーを作成して招待リンクまたはコードを共有できます。接続した参加者間で描画、ゾーン、ポリゴン、ユーザーマーカーが同期されます。', 'チームメイトは他プレイヤーの名前付き位置を確認できますが、他人の射程円は表示されません。ロビーはブラウザ上の計画を同期するもので、ライブのゲームサーバーデータは取得しません。'],
            toolsHeading: '{map} のマップツール',
            tools: ['ルーラーで距離を測り、ペンシルで描画し、ゾーンやポリゴンで範囲を囲めます。戦術マーカー、消しゴム、元に戻す、やり直しも利用できます。', 'マップツールのデータは保存した目標とは別にインポート・エクスポートできます。'],
            terrainSafety: 'Terrain3D はデフォルトでオフです。SAFE の候補だけを適用し、不確実、未対応、到達不能な結果には通常の射表を使用します。プラットフォームや車体の傾斜は補正しません。',
            faq: [
                { question: '計算機で {map} を直接開くには？', answer: '「{map} マップを開く」を選択してください。検証済みのマップパラメーターで計算機が起動し、選択は通常どおり保存されます。' },
                { question: '{map} ではどの兵器に対応していますか？', answer: 'L81 迫撃砲の射表と SPH-2 の LOW/HIGH 解に対応しています。' },
                { question: 'チームで {map} を共同計画できますか？', answer: 'はい。ロビーは描画、ゾーン、ポリゴン、戦術マーカーを同期し、武器、砲、目標、射程円は個人別に保ちます。' },
                { question: 'Terrain3D は必須ですか？', answer: 'いいえ。デフォルトでオフの実験機能です。通常の射表を安全な代替として常に利用できます。' }
            ],
            sources: { team17: 'WARDOGS のゲームとマッチに関する公式紹介 — Team17', maps: 'WARDOGS マップ概要 — GameWatcher', reveal: 'Zestafona マップ公開 — WARDOGS 動画' }
        },
        maps: {
            bakurani: {
                detail: '東ヨーロッパの山々に囲まれた工業地区', imageAlt: '教会とひまわり畑が見える WARDOGS の Bakurani',
                lead: '調整済みの Bakurani マップ上で、砲位置、目標、チーム注釈を同じワークスペースから計画できます。', mapHighlight: 'Bakurani のゲーム座標を調整済み',
                facts: [['setting', '東ヨーロッパの山岳地帯'], ['district', '工業地区']], profileHeading: 'Bakurani：山岳地帯、工業地区、移動する目標',
                profile: ['公開された説明では、Bakurani は東ヨーロッパの山々に囲まれた工業地区とされています。これは確認済みの特徴であり、ページが作った非公式地名ではありません。', 'WARDOGS では最大 100 人が 3 チームに分かれます。戦場全体は 256 km²ですが、ランダムな 2 × 2 km のコントロールゾーンで得点し、先に 100 点へ到達したチームが勝利します。'],
                planningHeading: 'Bakurani の砲撃計画', planning: ['マップをクリックするか座標を入力して砲と目標を配置します。計算機は距離、方位角、座標差、選択武器の射撃解を返します。', 'Bakurani のタイル、座標検索、保存した目標、戦術注釈は同じ調整済み基準を使用します。'],
                terrainHeading: 'Bakurani の地形と Terrain3D', terrain: ['Bakurani には等高線と Terrain3D の標高データがあります。実験候補と直接比較できるよう通常の射表値も表示されます。']
            },
            ozeti: {
                detail: 'サッカースタジアムがある西ヨーロッパの環境', imageAlt: 'WARDOGS の Ozeti スタジアムと周辺の景観',
                lead: '修正済みの Ozeti 配置、座標検索、砲撃計算を一貫したマップ基準で利用できます。', mapHighlight: 'Ozeti のプレイ可能範囲の配置を修正済み',
                facts: [['setting', '西ヨーロッパ'], ['landmark', 'サッカースタジアム']], profileHeading: 'Ozeti：西ヨーロッパとスタジアム',
                profile: ['公開情報では Ozeti は西ヨーロッパに位置し、サッカースタジアムが主要ランドマークとして示されています。このページは特定地点に未確認の戦術的価値を付けません。', '戦場は 256 km²ですが、得点範囲はランダムな 2 × 2 km のコントロールゾーンで決まります。最大 100 人が 3 チームで戦います。'],
                planningHeading: 'Ozeti の座標ベース計画', planning: ['既知の座標を入力するか、砲と目標を視覚的に配置します。一方をロックしてもう一方を調整し、有用な解を保存できます。', '座標検索は現在の砲–目標ペアを変更せずカメラだけを移動します。ルーラーは独立したマップ測定を行います。'],
                terrainHeading: 'Ozeti の等高線と Terrain3D', terrain: ['Ozeti では等高線を有効にし、対応する SPH-2 プレビューで標高データを使えます。LOW と HIGH は個別に確認されます。']
            },
            zestafona: {
                detail: '放棄された工業施設、クレーン、コンテナヤード', imageAlt: 'WARDOGS の Zestafona 工業地帯とコンテナヤード',
                lead: '直接 URL から Zestafona を開き、正確な配置、射撃計算、共同マップツールを組み合わせられます。', mapHighlight: 'Zestafona のマルチ解像度マップタイル',
                facts: [['status', '早期アクセス前に公開された第3のマップ'], ['focus', '工場、クレーン、コンテナヤード']], profileHeading: 'Zestafona：工業マップの公開',
                profile: ['Zestafona は早期アクセス前に WARDOGS の第3マップとして公開されました。映像には工場建物、クレーン、積み上げられたコンテナがある放棄された工業施設が映っています。', '公式の詳細な POI 一覧は公開されていないため、このページでは地名、固定目標、戦術的優位性を創作しません。'],
                planningHeading: 'Zestafona の射撃計画', planning: ['マップまたは座標で砲と目標を置き、距離、方位角、MIL、軸差を確認します。ロックを使えば一方を維持したまま他方を変更できます。', '保存した目標は描画やマーカーとは別に復元、インポート、エクスポートできます。'],
                terrainHeading: 'Zestafona の Terrain3D 情報', terrain: ['Zestafona のワークスペースには等高線と Terrain3D 標高範囲があります。マルチ解像度タイルにより座標基準を変えずに拡大できます。']
            }
        }
    },

    cat: {
        ui: {
            skip: 'Pounce to map content', brandHome: 'WARDOGS Artillery Calculator home', calculator: 'Catculator', language: 'Language', breadcrumbAria: 'Breadcrumb trail', footerAria: 'Footer paws',
            breadcrumb: '{map} meowp', eyebrow: 'WARDOGS MEOWP', imageCaption: '{map} in WARDOGS', capabilities: '{map} meowp powers', workspace: '{map} command box',
            factsEyebrow: 'PUBLISHED INTEL', factsHeading: '{map} battlefield facts', factsIntro: 'Published game-map facts stay separate from the catculator features.',
            faqHeading: '{map} Meowp FAQ', sourcesHeading: 'Sources and paw-verification',
            sourcesIntro: 'The map and match profile uses published information only. Catculator features are described separately; no mystery POI names or imaginary tactical claims were knocked off the desk.',
            openCalculator: 'Open the catculator', openCalculatorBody: 'Continue in the full desktop or mobile interface with {map} already selected.', openMap: 'Open {map} Meowp',
            otherMaps: 'Other WARDOGS meowps', otherMapsAria: 'Other WARDOGS meowps', relatedMap: '{map} Interactive Meowp',
            footerDisclaimer: 'Unofficial community project. Not affiliated with or endorsed by BULKHEAD or the WARDOGS team.', sourceCode: 'Source code'
        },
        content: {
            title: 'WARDOGS {map} Interactive Meowp | Artillery Catculator',
            description: 'WARDOGS {map} interactive meowp: {detail}. L81 and SPH-2 catculations, contours, Terrain3D, map paws and team lobbies.',
            heading: 'WARDOGS {map} Interactive Meowp',
            highlightWeapons: 'L81 Mortar and SPH-2 firing catculations', highlightTerrain: 'Contour lines and opt-in Terrain3D meowgic', highlightLobby: 'Shared scribbles with personal firing solutions in lobbies',
            factLabels: { setting: 'Published region', district: 'Known area', landmark: 'Known landmark', status: 'Meowp status', focus: 'Visual focus', battlefield: 'Battlefield size', objective: 'Core objective' },
            battlefieldValue: '256 km²', objectiveValue: 'Randomised 2 × 2 km Control Zone',
            weaponsHeading: 'L81 Mortar and SPH-2 on {map}',
            weapons: ['The L81 Mortar shows firing-table MIL, distance, azimuth and range status. SPH-2 LOW and HIGH solutions do their cat math separately.', 'Weapon, active gun, target and range circle stay with each player and never sit on a teammate’s firing solution.'],
            lobbyHeading: 'Team planning on the same {map} meowp',
            lobby: ['Create a lobby and share its invite link or code. Drawings, zones, polygons and user markers synchronise between connected cats and humans.', 'Teammates see labelled player positions but not somebody else’s range circle. The lobby synchronises browser planning; it does not chase live game-server data.'],
            toolsHeading: '{map} map paws',
            tools: ['Ruler measures, Pencil scribbles, and Zone or Polygon fences an area. Tactical markers, Eraser, Undo and Redo are also ready under the paw.', 'Map-tool data can be imported and exported separately from saved targets.'],
            terrainSafety: 'Terrain3D sleeps by default. Only SAFE candidates wake it; uncertain, unsupported or unreachable results use the normal firing table. Platform and chassis tilt are not catculated.',
            faq: [
                { question: 'How do I open {map} in the catculator?', answer: 'Choose “Open {map} Meowp”. The catculator starts with a validated map parameter and remembers the selection normally.' },
                { question: 'Which big tubes work on {map}?', answer: 'The L81 Mortar firing table and SPH-2 LOW/HIGH solutions are supported.' },
                { question: 'Can the squad plan together on {map}?', answer: 'Yes. The lobby shares drawings, zones, polygons and tactical markers while weapon, gun, target and range circle remain personal.' },
                { question: 'Must Terrain3D be enabled?', answer: 'No. It is an experimental option that sleeps by default. The normal firing table remains the safe fallback.' }
            ],
            sources: { team17: 'Official WARDOGS game and match overview — Team17', maps: 'WARDOGS maps overview — GameWatcher', reveal: 'Zestafona map reveal — WARDOGS video' }
        },
        maps: {
            bakurani: {
                detail: 'a factory district surrounded by Eastern European mountains', imageAlt: 'Bakurani landscape in WARDOGS with a church and sunflower field',
                lead: 'Plan artillery spots, targets and squad scribbles on the calibrated Bakurani meowp in one command box.', mapHighlight: 'Calibrated Bakurani game coordinates',
                facts: [['setting', 'Eastern European mountains'], ['district', 'Factory district']], profileHeading: 'Bakurani: mountains, industry and a moving prize',
                profile: ['Published descriptions identify Bakurani as a factory district surrounded by Eastern European mountains. That is confirmed map information, not a POI name invented by a keyboard cat.', 'Up to 100 players split between three teams in WARDOGS. The battlefield covers 256 km², while a randomised 2 × 2 km Control Zone awards points; the first team to 100 wins the treat.'],
                planningHeading: 'Artillery catculations on Bakurani', planning: ['Place the gun and target with a click or enter coordinates. The catculator returns distance, azimuth, coordinate differences and the selected weapon solution.', 'Bakurani tiles, coordinate search, saved targets and tactical scribbles use the same calibrated reference.'],
                terrainHeading: 'Bakurani terrain and Terrain3D', terrain: ['Bakurani includes contours and Terrain3D elevation data. The normal table value stays visible beside the experimental candidate.']
            },
            ozeti: {
                detail: 'a Western European setting with a football stadium', imageAlt: 'Ozeti stadium and surrounding landscape in WARDOGS',
                lead: 'Use corrected Ozeti alignment, coordinate search and artillery catculations in one consistent map reference.', mapHighlight: 'Corrected Ozeti playable-area alignment',
                facts: [['setting', 'Western Europe'], ['landmark', 'Football stadium']], profileHeading: 'Ozeti: Western Europe and the stadium',
                profile: ['Published information places Ozeti in Western Europe and names a football stadium as its defining landmark. This page does not invent tactical powers for particular windows or rooftops.', 'The battlefield covers 256 km², but a randomised 2 × 2 km Control Zone chooses the scoring area. Up to 100 players fight across three teams.'],
                planningHeading: 'Coordinate planning on Ozeti', planning: ['Enter known coordinates or place gun and target on the meowp. Lock one point while adjusting the other, then save a useful firing solution.', 'Coordinate search moves the camera without changing the active gun–target pair. Ruler makes a separate measurement.'],
                terrainHeading: 'Ozeti contours and Terrain3D', terrain: ['Ozeti can show contour lines and use elevation data for supported SPH-2 previews. LOW and HIGH candidates are checked separately.']
            },
            zestafona: {
                detail: 'a derelict industrial complex with cranes and a container yard', imageAlt: 'Zestafona industrial area and container yard in WARDOGS',
                lead: 'Open Zestafona through a direct URL and combine precise placement, firing catculations and collaborative map paws.', mapHighlight: 'Multi-resolution Zestafona map tiles',
                facts: [['status', 'Third map revealed before Early Access'], ['focus', 'Factory, cranes and container yard']], profileHeading: 'Zestafona: the industrial meowp reveal',
                profile: ['Zestafona was revealed as the third WARDOGS map ahead of Early Access. The footage shows a derelict industrial complex with factory buildings, cranes and stacks of shipping containers.', 'No detailed official POI list was published, so this page does not invent place names, permanent objectives or tactical miracles.'],
                planningHeading: 'Build a Zestafona firing plan', planning: ['Place gun and target on the map or by coordinates, then read distance, azimuth, MIL and axis differences. Locks keep one point still while the other moves.', 'Saved targets can be restored, imported or exported separately from drawings and markers.'],
                terrainHeading: 'Terrain3D context for Zestafona', terrain: ['The Zestafona workspace includes contours and Terrain3D elevation coverage. Multi-resolution tiles let you zoom without moving the coordinate reference.']
            }
        }
    }
};
