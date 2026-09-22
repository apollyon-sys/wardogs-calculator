export const SEO_PAGE_CONTENT = {
    'zh-cn': {
        "title": "WARDOGS 炮兵计算器 | L81 迫击炮、SPH-2 与战术地图",
        "description": "免费的 WARDOGS 炮兵计算器，支持 L81 迫击炮、SPH-2、实时小队房间、Bakurani、Ozeti、Zestafona 地图、等高线及 Terrain3D MIL 修正。",
        "imageAlt": "WARDOGS 炮兵计算器战术地图与射击解算界面",
        "alternateNames": ["WARDOGS 炮兵计算器", "WARDOGS L81 迫击炮计算器", "WARDOGS Arty Calc"],
        "cluster": {
            "heading": "WARDOGS 炮兵计算器",
            "navLabel": "计算器与地图指南",
            "intro": "WARDOGS 炮兵计算器是一款免费、开源的社区工具，可根据手动设置的炮位与目标位置计算距离、方位角和 MIL。L81 迫击炮与 SPH-2 共用同一套战术地图工作区，还可创建实时小队房间，在不合并各玩家射击解算的情况下共享战术规划。",
            "sections": [
                {
                    "id": "wardogs-mortar-calculator",
                    "heading": "WARDOGS L81 迫击炮计算器",
                    "body": "选择 L81 迫击炮，在地图上设置炮位与目标位置，计算器会给出距离、方位角以及射表 MIL。射程状态会提示目标是否位于 L81 迫击炮支持的射程范围内。"
                },
                {
                    "id": "wardogs-sph-2-calculator",
                    "heading": "WARDOGS SPH-2 计算器",
                    "body": "选择 SPH-2 后，可计算距离、方位角以及可用的 LOW / HIGH 射击解算。在支持 Terrain3D 的地形上，可以手动启用实验性 MIL 修正，并同时比较标准射表值与 Terrain3D 候选值。该功能默认关闭，仅会应用被判定为 SAFE 的候选；不确定、不支持或不可达的情况会自动回退到标准射表。平台与车体倾斜目前不会被修正。"
                },
                {
                    "id": "wardogs-live-team-map-lobbies",
                    "heading": "WARDOGS 实时小队地图房间",
                    "body": "创建房间并分享邀请链接或代码，即可在同一张 WARDOGS 战术地图上协作。绘图、区域、多边形和玩家标记会实时同步。每位玩家的武器、炮位、目标和射程圈保持独立；队友只能看到带名称的位置，不会出现重复的射程圈。"
                },
                {
                    "id": "bakurani-interactive-map",
                    "heading": "Bakurani 互动地图",
                    "body": "Bakurani 互动地图已校准到 WARDOGS 游戏坐标。炮位、目标、保存的目标、测距尺、绘图和战术标记都使用同一坐标空间，并提供地形等高线和 Terrain3D 高程数据，用于战术规划和受支持的 SPH-2 地形修正预览。"
                },
                {
                    "id": "ozeti-interactive-map",
                    "heading": "Ozeti 互动地图",
                    "body": "Ozeti 互动地图使用校准后的 WARDOGS 坐标和修正后的可玩区域对齐，可用于炮兵解算与战术规划。炮位、目标、保存目标、绘图、标记和地形等高线都使用同一坐标空间，并在数据覆盖范围内提供 Terrain3D 高程信息。"
                },
                {
                    "id": "zestafona-interactive-map",
                    "heading": "Zestafona 互动地图",
                    "body": "Zestafona 互动地图使用校准后的 WARDOGS 坐标，可用于设置炮位、目标和进行战术规划。多级地图瓦片、保存目标、测距尺、绘图、标记、地形等高线和 Terrain3D 高程信息均集成在同一工作区中。"
                },
                {
                    "id": "how-to-use",
                    "heading": "使用方法",
                    "body": "选择 Bakurani、Ozeti 或 Zestafona，再选择 L81 迫击炮或 SPH-2，设置炮位和目标，即可读取距离、方位角与 MIL。使用 SPH-2 时，还需输入驾驶员罗盘显示的车体方向并选择 LOW 或 HIGH 弹道。若要与小队协作，可创建或加入房间并分享邀请，同时让每位玩家保留独立的当前射击解算。"
                }
            ]
        },
        "faqLabel": "常见问题",
        "faqHeading": "WARDOGS 炮兵计算器常见问题",
        "faq": [
            {
                "question": "它支持 WARDOGS L81 迫击炮吗？",
                "answer": "支持。选择 L81 迫击炮并设置炮位与目标位置后，计算器会提供距离、方位角、射程状态和射表 MIL。"
            },
            {
                "question": "WARDOGS 炮兵计算器支持 SPH-2 吗？",
                "answer": "支持。SPH-2 解算包括距离、方位角、LOW / HIGH 射击方案，以及在受支持地形上的可选实验性 Terrain3D MIL 修正。"
            },
            {
                "question": "支持哪些 WARDOGS 地图？",
                "answer": "目前包含 Bakurani、Ozeti 和 Zestafona 互动地图。三张地图均使用校准后的游戏坐标，支持战术地图工具和地形等高线，并在 Terrain3D 数据覆盖范围内提供高程信息。"
            },
            {
                "question": "WARDOGS 小队可以一起使用战术地图吗？",
                "answer": "可以。创建实时小队房间并分享邀请链接或代码后，绘图、区域、多边形和战术标记会在房间内同步。每位玩家仍保留独立的武器、炮位、目标和射程圈，队友只会看到带名称的位置，不会看到重复的射程圈。"
            },
            {
                "question": "Terrain3D 会修正 SPH-2 的高差 MIL 吗？",
                "answer": "可以选择启用实验性 Terrain3D MIL 修正。该功能默认关闭，会同时显示标准射表值和 Terrain3D 候选值，并且只应用被判定为 SAFE 的候选。其他情况会自动回退到标准射表。平台或车体倾斜目前不会被修正。"
            },
            {
                "question": "WARDOGS 地图可以显示地形等高线吗？",
                "answer": "可以。受支持的 WARDOGS 地图提供可切换的地形等高线图层，可在 Layers 菜单中与其他战术图层一起开启或关闭。"
            }
        ],
        "features": [
            "WARDOGS L81 迫击炮射击解算",
            "SPH-2 LOW / HIGH 射击解算",
            "使用共享战术地图的实时小队房间",
            "SPH-2 实验性 Terrain3D MIL 修正",
            "Bakurani 互动战术地图与等高线",
            "Ozeti 互动战术地图与等高线",
            "Zestafona 互动战术地图与等高线",
            "保存目标的完整射击信息",
            "测距尺与绘图工具",
            "战术地图标记"
        ]
    },
    en: {
        title: 'WARDOGS Artillery Calculator | L81 Mortar, SPH-2 & Live Map',
        description: 'Free WARDOGS L81 Mortar and SPH-2 artillery calculator with live team lobbies, Bakurani, Ozeti and Zestafona maps, Terrain3D MIL correction and tactical tools.',
        heading: 'About this calculator',
        intro: 'WARDOGS Artillery Calculator is a free, open-source community tool for L81 Mortar and SPH-2 firing solutions. It includes interactive tactical maps for Bakurani, Ozeti and Zestafona, live team map lobbies, coordinate-based targeting, distance, azimuth and MIL calculations, terrain contours, and experimental Terrain3D MIL correction for SPH-2 where supported.',
        usage: 'Select a map and weapon, place the artillery and target positions, then open Firing solution to read distance, azimuth and MIL. For SPH-2, enter the hull direction shown by the driver compass and choose LOW or HIGH arc. Create or join a lobby to synchronise drawings, zones, polygons and tactical markers while every player keeps a separate firing solution. Experimental Terrain3D correction is opt-in; uncertain or unsupported cases use the normal firing table.',
        features: [
            'WARDOGS L81 Mortar calculator and firing solutions',
            'SPH-2 LOW and HIGH firing solutions',
            'Live team map lobbies with shared tactical planning',
            'Experimental Terrain3D MIL correction for SPH-2',
            'Bakurani interactive tactical map with terrain contours',
            'Ozeti tactical map with terrain contours',
            'Zestafona interactive tactical map with terrain contours',
            'Saved target firing summaries',
            'Ruler and drawing tools',
            'Tactical map markers'
        ],
        cluster: {
            heading: 'WARDOGS Artillery Calculator',
            navLabel: 'Calculator and map guide',
            intro: 'WARDOGS Artillery Calculator is a free, open-source community tool for calculating distance, azimuth and MIL from manually placed artillery and target positions. Players looking for a quick WARDOGS arty calc can use the same interface for L81 Mortar and SPH-2, then open a live team lobby to share tactical map planning without merging each player’s firing solution.',
            sections: [
                {
                    id: 'wardogs-mortar-calculator',
                    heading: 'WARDOGS L81 Mortar Calculator',
                    body: 'Choose L81 Mortar, place the L81 Mortar and target on the map, and the calculator returns distance, azimuth and the firing-table MIL value. Range status shows whether the selected target is inside the supported L81 Mortar range.'
                },
                {
                    id: 'wardogs-sph-2-calculator',
                    heading: 'WARDOGS SPH-2 Calculator',
                    body: 'Choose SPH-2 to calculate distance, azimuth and the available LOW/HIGH firing solutions. Enter the hull direction from the driver compass so the heading-dependent platform model can adjust MIL, then select the required arc. This is not a vehicle tilt sensor, so park on level ground. On supported Terrain3D maps, the opt-in correction only applies SAFE candidates and otherwise falls back to the normal firing table.'
                },
                {
                    id: 'wardogs-live-team-map-lobbies',
                    heading: 'WARDOGS Live Team Map Lobbies',
                    body: 'Create a lobby and share its invite link or code to plan on the same WARDOGS tactical map. Drawings, zones, polygons and user markers synchronise live. Each participant keeps a separate weapon, artillery point, target and range circle, while teammates see labelled player positions without duplicate range circles.'
                },
                {
                    id: 'bakurani-interactive-map',
                    href: 'maps/bakurani/',
                    heading: 'Bakurani Interactive Map',
                    body: 'The Bakurani interactive map is calibrated to WARDOGS coordinates so artillery positions, targets, saved targets, the ruler, drawings and tactical markers share the same map space. Terrain contour layers and Terrain3D elevation data are available for tactical planning and supported SPH-2 terrain-correction previews.'
                },
                {
                    id: 'ozeti-interactive-map',
                    href: 'maps/ozeti/',
                    heading: 'Ozeti Interactive Map',
                    body: 'The Ozeti interactive map uses calibrated WARDOGS coordinates and corrected playable-area alignment for artillery and tactical planning. Artillery positions, targets, saved targets, drawings, markers and terrain contours share the same coordinate space, with Terrain3D elevation data available where supported.'
                },
                {
                    id: 'zestafona-interactive-map',
                    href: 'maps/zestafona/',
                    heading: 'Zestafona Interactive Map',
                    body: 'The Zestafona interactive map uses calibrated WARDOGS coordinates for artillery placement, targets and tactical planning. Multi-resolution map tiles, saved targets, the ruler, drawings, markers, terrain contours and Terrain3D elevation context are available in the same workspace.'
                },
                {
                    id: 'how-to-use',
                    heading: 'How to use',
                    body: 'Select Bakurani, Ozeti or Zestafona, choose L81 Mortar or SPH-2, and place or type the artillery and target coordinates. For SPH-2, enter hull direction from the driver compass and choose LOW or HIGH arc. Open Firing solution to read distance, azimuth and MIL. Create or join a lobby to share tactical planning while each player keeps an independent firing solution.'
                }
            ]
        },
        faq: [
            {
                question: 'Does the calculator support the WARDOGS L81 Mortar?',
                answer: 'Yes. Select L81 Mortar, place the L81 Mortar and target positions, and the calculator provides distance, azimuth, range status and the firing-table MIL value.'
            },
            {
                question: 'Does WARDOGS Artillery Calculator support SPH-2?',
                answer: 'Yes. SPH-2 support includes distance, azimuth, LOW/HIGH firing solutions and optional experimental Terrain3D MIL correction on supported terrain.'
            },
            {
                question: 'Which WARDOGS maps are available?',
                answer: 'The calculator includes calibrated interactive maps for Bakurani, Ozeti and Zestafona. All three maps support tactical map tools and terrain contour layers, and provide Terrain3D elevation data where coverage is available.'
            },
            {
                question: 'Can a WARDOGS squad use the tactical map together?',
                answer: 'Yes. Create a live team lobby and share its invite link or code. Drawings, zones, polygons and tactical markers synchronise for the room, while every player keeps a separate weapon, artillery point, target and range circle. Teammates see labelled player positions without duplicate range circles.'
            },
            {
                question: 'Does Terrain3D correct SPH-2 MIL for elevation?',
                answer: 'Experimental Terrain3D MIL correction is available as an opt-in feature for SPH-2 on supported terrain. It only applies candidates classified as SAFE; other cases fall back to the normal firing table. Hull direction correction models a heading-dependent platform offset, but it does not measure actual vehicle tilt, so park on level ground.'
            },
            {
                question: 'Does the WARDOGS map show terrain contours?',
                answer: 'Yes. Terrain contour layers are available on supported WARDOGS maps and can be toggled from the Layers menu together with other tactical overlays.'
            }
        ]
    },

    ru: {
        title: 'Калькулятор WARDOGS | Миномёт L81, SPH-2 и командная карта',
        description: 'Бесплатный калькулятор WARDOGS для миномёта L81 и SPH-2 с командными онлайн-лобби, картами Bakurani, Ozeti и Zestafona и Terrain3D-коррекцией MIL.',
        heading: 'О калькуляторе',
        intro: 'WARDOGS Artillery Calculator — бесплатный open-source инструмент сообщества для расчёта миномёта L81 и SPH-2. Он включает интерактивные карты Bakurani, Ozeti и Zestafona, командные онлайн-лобби с общей тактической картой, расчёт дистанции, азимута и MIL, контуры рельефа и экспериментальную Terrain3D-коррекцию MIL.',
        usage: 'Выберите карту и оружие, укажите позицию артиллерии и цель, затем используйте полученный расчёт. В лобби рисунки, зоны, полигоны и тактические метки синхронизируются, а оружие, орудие, цель и круг дальности остаются отдельными для каждого игрока. Союзники видят подписанные позиции друг друга без лишних кругов дальности. Экспериментальная Terrain3D-коррекция включается вручную и применяет только SAFE-кандидаты SPH-2; в остальных случаях используется обычная таблица. Коррекция наклона платформы и корпуса не включена.',
        features: [
            'Калькулятор миномёта L81 для WARDOGS',
            'LOW и HIGH расчёты SPH-2',
            'Командные онлайн-лобби с общей тактической картой',
            'Экспериментальная Terrain3D-коррекция MIL для SPH-2',
            'Интерактивная карта Bakurani с контурами рельефа',
            'Тактическая карта Ozeti с контурами рельефа',
            'Интерактивная карта Zestafona с контурами рельефа',
            'Полные данные сохранённых целей',
            'Линейка и инструменты рисования',
            'Тактические маркеры'
        ]
    },

    uk: {
        title: 'Калькулятор WARDOGS | Міномет L81, SPH-2 та командна мапа',
        description: 'Безкоштовний калькулятор WARDOGS для міномета L81 і SPH-2 з командними онлайн-лобі, мапами Bakurani, Ozeti й Zestafona та Terrain3D-корекцією MIL.',
        heading: 'Про калькулятор',
        intro: 'WARDOGS Artillery Calculator — безкоштовний open-source інструмент спільноти для розрахунків міномета L81 та SPH-2. Він містить інтерактивні мапи Bakurani, Ozeti та Zestafona, командні онлайн-лобі зі спільною тактичною мапою, розрахунок дистанції, азимута й MIL, контури рельєфу та експериментальну Terrain3D-корекцію MIL.',
        usage: 'Виберіть мапу й зброю, встановіть позиції артилерії та цілі й використовуйте отримане рішення. У лобі малюнки, зони, полігони й тактичні позначки синхронізуються, а зброя, гармата, ціль і коло дальності залишаються окремими для кожного гравця. Союзники бачать підписані позиції одне одного без зайвих кіл дальності. Експериментальна Terrain3D-корекція вмикається вручну й застосовує лише SAFE-кандидати SPH-2; в інших випадках використовується звичайна таблиця. Нахил платформи й корпусу не коригується.',
        features: [
            'Калькулятор міномета L81 для WARDOGS',
            'LOW і HIGH розрахунки SPH-2',
            'Командні онлайн-лобі зі спільною тактичною мапою',
            'Експериментальна Terrain3D-корекція MIL для SPH-2',
            'Інтерактивна мапа Bakurani з контурами рельєфу',
            'Тактична мапа Ozeti з контурами рельєфу',
            'Інтерактивна мапа Zestafona з контурами рельєфу',
            'Повні дані збережених цілей',
            'Лінійка та інструменти малювання',
            'Тактичні маркери'
        ]
    },

    de: {
        title: 'WARDOGS Artillerierechner | L81-Mörser, SPH-2 & Teamkarte',
        description: 'Kostenloser WARDOGS Artillerierechner für L81-Mörser und SPH-2 mit Live-Team-Lobbys, Bakurani-, Ozeti- und Zestafona-Karten und Terrain3D-MIL-Korrektur.',
        heading: 'Über diesen Rechner',
        intro: 'Der WARDOGS Artillery Calculator ist ein kostenloses Open-Source-Community-Tool für L81-Mörser- und SPH-2-Feuerlösungen. Er bietet interaktive Karten für Bakurani, Ozeti und Zestafona, Live-Team-Lobbys mit gemeinsamer taktischer Karte, Distanz-, Azimut- und MIL-Berechnung, Höhenlinien und experimentelle Terrain3D-MIL-Korrektur.',
        usage: 'Karte und Waffe auswählen, Artillerie- und Zielposition setzen und die Feuerlösung ablesen. In einer Lobby werden Zeichnungen, Zonen, Polygone und taktische Marker synchronisiert; Waffe, Geschütz, Ziel und Reichweitenkreis bleiben für jeden Spieler getrennt. Teammitglieder sehen beschriftete Spielerpositionen ohne zusätzliche Reichweitenkreise. Die experimentelle Terrain3D-Korrektur wird manuell aktiviert und verwendet nur SAFE-SPH-2-Kandidaten; sonst gilt die normale Feuertabelle. Plattform- und Fahrzeugneigung wird nicht korrigiert.',
        features: [
            'WARDOGS L81-Mörserrechner und Feuerlösungen',
            'SPH-2 LOW- und HIGH-Feuerlösungen',
            'Live-Team-Lobbys mit gemeinsamer taktischer Karte',
            'Experimentelle Terrain3D-MIL-Korrektur für SPH-2',
            'Interaktive Bakurani-Karte mit Höhenlinien',
            'Taktische Ozeti-Karte mit Höhenlinien',
            'Interaktive Zestafona-Karte mit Höhenlinien',
            'Feuerdaten für gespeicherte Ziele',
            'Lineal und Zeichenwerkzeuge',
            'Taktische Kartenmarker'
        ]
    },

    fr: {
        title: 'Calculateur WARDOGS | Mortier L81, SPH-2 et carte d’équipe',
        description: 'Calculateur WARDOGS gratuit pour le mortier L81 et le SPH-2 avec salons d’équipe en direct, cartes Bakurani, Ozeti et Zestafona et correction MIL Terrain3D.',
        heading: 'À propos du calculateur',
        intro: 'WARDOGS Artillery Calculator est un outil communautaire gratuit et open source pour les solutions de tir du mortier L81 et du SPH-2. Il comprend les cartes Bakurani, Ozeti et Zestafona, des salons d’équipe en direct avec carte tactique partagée, les calculs de distance, d’azimut et de MIL, les courbes de niveau et une correction Terrain3D expérimentale.',
        usage: 'Sélectionnez une carte et une arme, placez l’artillerie et la cible, puis consultez la solution de tir. Dans un salon, les dessins, zones, polygones et marqueurs tactiques sont synchronisés, tandis que l’arme, l’artillerie, la cible et le cercle de portée restent propres à chaque joueur. Les coéquipiers voient les positions identifiées sans cercles de portée supplémentaires. La correction Terrain3D expérimentale s’active manuellement et n’applique que les candidats SPH-2 SAFE ; les autres cas utilisent la table de tir normale. L’inclinaison de la plateforme et du châssis n’est pas corrigée.',
        features: [
            'Calculateur du mortier L81 pour WARDOGS',
            'Solutions SPH-2 LOW et HIGH',
            'Salons d’équipe en direct avec carte tactique partagée',
            'Correction MIL Terrain3D expérimentale pour SPH-2',
            'Carte interactive Bakurani avec courbes de niveau',
            'Carte tactique Ozeti avec courbes de niveau',
            'Carte interactive Zestafona avec courbes de niveau',
            'Données de tir des cibles enregistrées',
            'Règle et outils de dessin',
            'Marqueurs tactiques'
        ]
    },

    es: {
        title: 'Calculadora WARDOGS | Mortero L81, SPH-2 y mapa de equipo',
        description: 'Calculadora WARDOGS gratuita para el mortero L81 y SPH-2 con salas de equipo en vivo, mapas Bakurani, Ozeti y Zestafona y corrección MIL Terrain3D.',
        heading: 'Acerca de la calculadora',
        intro: 'WARDOGS Artillery Calculator es una herramienta comunitaria gratuita y de código abierto para soluciones de tiro del mortero L81 y SPH-2. Incluye los mapas Bakurani, Ozeti y Zestafona, salas de equipo en vivo con mapa táctico compartido, cálculos de distancia, azimut y MIL, curvas de nivel y corrección Terrain3D experimental.',
        usage: 'Selecciona un mapa y un arma, coloca la artillería y el objetivo y consulta la solución de tiro. En una sala se sincronizan dibujos, zonas, polígonos y marcadores tácticos, mientras que el arma, la artillería, el objetivo y el círculo de alcance permanecen separados para cada jugador. Los compañeros ven posiciones identificadas sin círculos de alcance adicionales. La corrección Terrain3D experimental se activa manualmente y solo aplica candidatos SPH-2 SAFE; los demás casos usan la tabla de tiro normal. No se corrige la inclinación de la plataforma o el chasis.',
        features: [
            'Calculadora del mortero L81 para WARDOGS',
            'Soluciones SPH-2 LOW y HIGH',
            'Salas de equipo en vivo con mapa táctico compartido',
            'Corrección MIL Terrain3D experimental para SPH-2',
            'Mapa interactivo de Bakurani con curvas de nivel',
            'Mapa táctico de Ozeti con curvas de nivel',
            'Mapa interactivo de Zestafona con curvas de nivel',
            'Datos de tiro de objetivos guardados',
            'Regla y herramientas de dibujo',
            'Marcadores tácticos'
        ]
    },

    pl: {
        title: 'Kalkulator WARDOGS | Moździerz L81, SPH-2 i mapa zespołu',
        description: 'Darmowy kalkulator WARDOGS dla moździerza L81 i SPH-2 z pokojami zespołowymi, mapami Bakurani, Ozeti i Zestafona oraz korektą MIL Terrain3D.',
        heading: 'O kalkulatorze',
        intro: 'WARDOGS Artillery Calculator to darmowe narzędzie open source społeczności do rozwiązań ogniowych moździerza L81 i SPH-2. Zawiera mapy Bakurani, Ozeti i Zestafona, zespołowe pokoje online ze wspólną mapą taktyczną, obliczenia dystansu, azymutu i MIL, poziomice oraz eksperymentalną korektę Terrain3D.',
        usage: 'Wybierz mapę i broń, ustaw pozycję artylerii oraz celu, a następnie odczytaj rozwiązanie ogniowe. W pokoju synchronizowane są rysunki, strefy, wielokąty i znaczniki taktyczne, natomiast broń, działo, cel i okrąg zasięgu pozostają oddzielne dla każdego gracza. Członkowie zespołu widzą podpisane pozycje bez dodatkowych okręgów zasięgu. Eksperymentalną korektę Terrain3D włącza się ręcznie i stosuje ona tylko kandydatów SPH-2 SAFE; w pozostałych przypadkach używana jest zwykła tabela. Przechył platformy i podwozia nie jest korygowany.',
        features: [
            'Kalkulator moździerza L81 dla WARDOGS',
            'Rozwiązania SPH-2 LOW i HIGH',
            'Zespołowe pokoje online ze wspólną mapą taktyczną',
            'Eksperymentalna korekta MIL Terrain3D dla SPH-2',
            'Interaktywna mapa Bakurani z poziomicami',
            'Mapa taktyczna Ozeti z poziomicami',
            'Interaktywna mapa Zestafona z poziomicami',
            'Dane ogniowe zapisanych celów',
            'Linijka i narzędzia rysowania',
            'Markery taktyczne'
        ]
    },

    ko: {
        title: 'WARDOGS 포병 계산기 | L81 박격포, SPH-2, 팀 지도',
        description: 'L81 박격포와 SPH-2용 무료 WARDOGS 포병 계산기. 실시간 팀 로비, Bakurani·Ozeti·Zestafona 지도, 등고선, Terrain3D MIL 보정과 전술 도구를 제공합니다.',
        heading: '계산기 소개',
        intro: 'WARDOGS Artillery Calculator는 L81 박격포와 SPH-2 사격 제원을 계산하기 위한 무료 오픈 소스 커뮤니티 도구입니다. Bakurani, Ozeti, Zestafona 지도, 공유 전술 지도를 사용하는 실시간 팀 로비, 거리·방위각·MIL 계산, 지형 등고선과 실험적 Terrain3D MIL 보정을 제공합니다.',
        usage: '지도와 무기를 선택하고 포병 위치와 목표 위치를 지정한 다음 사격 제원을 확인하세요. 로비에서는 그림, 구역, 다각형과 전술 마커가 동기화되지만 무기, 포병 위치, 목표와 사거리 원은 플레이어별로 유지됩니다. 팀원은 추가 사거리 원 없이 이름이 표시된 서로의 위치를 볼 수 있습니다. 실험적 Terrain3D 보정은 수동으로 켜며 SAFE SPH-2 후보만 적용하고, 나머지는 표준 사격표를 사용합니다. 플랫폼 및 차체 기울기는 보정하지 않습니다.',
        features: [
            'WARDOGS L81 박격포 계산 및 사격 제원',
            'SPH-2 LOW 및 HIGH 사격 제원',
            '공유 전술 지도를 사용하는 실시간 팀 로비',
            'SPH-2용 실험적 Terrain3D MIL 보정',
            '등고선이 포함된 Bakurani 인터랙티브 지도',
            '등고선이 포함된 Ozeti 전술 지도',
            '등고선이 포함된 Zestafona 인터랙티브 지도',
            '저장된 목표 사격 정보',
            '거리 측정 및 그리기 도구',
            '전술 지도 마커'
        ]
    },

    pt: {
        title: 'Calculadora WARDOGS | Morteiro L81, SPH-2 e mapa de equipa',
        description: 'Calculadora WARDOGS gratuita para morteiro L81 e SPH-2, com salas de equipa em direto, mapas Bakurani, Ozeti e Zestafona e correção MIL Terrain3D.',
        heading: 'Sobre a calculadora',
        intro: 'WARDOGS Artillery Calculator é uma ferramenta comunitária gratuita e open source para soluções de tiro do morteiro L81 e do SPH-2. Inclui mapas Bakurani, Ozeti e Zestafona, salas de equipa em direto com mapa tático partilhado, cálculos de distância, azimute e MIL, curvas de nível e correção Terrain3D experimental.',
        usage: 'Seleciona um mapa e uma arma, coloca as posições da artilharia e do alvo e consulta a solução de tiro. Numa sala, desenhos, zonas, polígonos e marcadores táticos são sincronizados, enquanto a arma, a artilharia, o alvo e o círculo de alcance ficam separados por jogador. A equipa vê posições identificadas sem círculos de alcance adicionais. A correção Terrain3D experimental é ativada manualmente e só aplica candidatos SPH-2 SAFE; os restantes casos usam a tabela de tiro normal. A inclinação da plataforma e do chassis não é corrigida.',
        features: [
            'Calculadora do morteiro L81 para WARDOGS',
            'Soluções SPH-2 LOW e HIGH',
            'Salas de equipa em direto com mapa tático partilhado',
            'Correção MIL Terrain3D experimental para SPH-2',
            'Mapa interativo Bakurani com curvas de nível',
            'Mapa tático Ozeti com curvas de nível',
            'Mapa interativo Zestafona com curvas de nível',
            'Dados de tiro dos alvos guardados',
            'Régua e ferramentas de desenho',
            'Marcadores táticos'
        ]
    },
    
    ja: {
        title: 'WARDOGS砲兵計算機 | L81迫撃砲、SPH-2、チームマップ',
        description: 'L81迫撃砲とSPH-2に対応した無料のWARDOGS砲兵計算機。リアルタイムのチームロビー、Bakurani・Ozeti・Zestafonaマップ、等高線、Terrain3D MIL補正、戦術ツールを備えています。',
        heading: 'この計算機について',
        intro: 'WARDOGS Artillery Calculatorは、L81迫撃砲とSPH-2の射撃諸元を算出するための無料・オープンソースのコミュニティツールです。Bakurani、Ozeti、Zestafonaマップ、共有戦術マップを使うリアルタイムのチームロビー、距離・方位角・MIL計算、等高線、実験的なTerrain3D MIL補正を提供します。',
        usage: 'マップと火器を選び、砲と目標の位置を置くと射撃諸元が表示されます。ロビーでは描画、ゾーン、ポリゴン、戦術マーカーが同期されますが、火器、砲位置、目標、射程円はプレイヤーごとに分かれています。チームメンバーの位置は名前付きで表示され、他人の射程円は表示されません。実験的なTerrain3D補正は手動で有効にし、SAFEのSPH-2候補だけを適用します。それ以外は通常の射表を使用し、車体の傾斜は補正しません。',
        features: [
            'WARDOGSのL81迫撃砲計算と射撃諸元',
            'SPH-2のLOW / HIGH射撃諸元',
            '共有戦術マップを使うリアルタイムのチームロビー',
            'SPH-2向けの実験的Terrain3D MIL補正',
            '等高線付きBakuraniインタラクティブマップ',
            '等高線付きOzeti戦術マップ',
            '等高線付きZestafonaインタラクティブマップ',
            '保存した目標の射撃情報',
            '計測ツールと描画ツール',
            '戦術マップマーカー'
        ]
    },

    cs: {
        title: 'Artilerijní kalkulátor WARDOGS | Minomet L81, SPH-2 a týmová mapa',
        description: 'Bezplatný artilerijní kalkulátor WARDOGS pro minomet L81 a SPH-2 s živými týmovými lobby, mapami Bakurani, Ozeti a Zestafona a korekcí MIL přes Terrain3D.',
        heading: 'O tomto kalkulátoru',
        intro: 'WARDOGS Artillery Calculator je bezplatný open-source komunitní nástroj pro výpočet palebných dat minometu L81 a SPH-2. Nabízí interaktivní mapy Bakurani, Ozeti a Zestafona, živá týmová lobby se společnou taktickou mapou, výpočet vzdálenosti, azimutu a MIL, izolinie a experimentální korekci MIL přes Terrain3D.',
        usage: 'Vyberte mapu a zbraň, umístěte pozici artilerie a cíle a přečtěte si palebné řešení. V lobby se synchronizují kresby, zóny, polygony a taktické značky, zatímco zbraň, postavení, cíl a kružnice dostřelu zůstávají u každého hráče oddělené. Spoluhráči vidí popsané pozice bez cizích kružnic dostřelu. Experimentální korekce Terrain3D se zapíná ručně a používá pouze kandidáty SPH-2 označené jako SAFE; v ostatních případech platí běžná palebná tabulka. Náklon plošiny a podvozku se nekoriguje.',
        features: [
            'Kalkulátor minometu L81 pro WARDOGS',
            'Palebná řešení SPH-2 pro plochou i horní dráhu',
            'Živá týmová lobby se společnou taktickou mapou',
            'Experimentální korekce MIL přes Terrain3D pro SPH-2',
            'Interaktivní mapa Bakurani s izoliniemi',
            'Taktická mapa Ozeti s izoliniemi',
            'Interaktivní mapa Zestafona s izoliniemi',
            'Palebná data uložených cílů',
            'Pravítko a nástroje pro kreslení',
            'Taktické značky na mapě'
        ]
    },
    
    cat: {
        title: 'WARDOGS Meowculator | L81 Mortar, SPH-2 & Team Meowp',
        description: 'Free WARDOGS arty meowculator for L81 Mortar and SPH-2 with live squad meowbbies, Bakurani, Ozeti and Zestafona meowps, contours and Terrain3D MIL meowgic.',
        heading: 'About the meowculator',
        intro: 'WARDOGS Artillery Calculator is a free open-source community meowculator for L81 Mortar and SPH-2 firing solutions. It includes Bakurani, Ozeti and Zestafona tactical meowps, live squad meowbbies, distance, azimuth and MIL math, contour paws and experimental Terrain3D MIL meowgic.',
        usage: 'Pick a meowp and weapon, place the meowtillery and meowget, then read the firing solution. In a meowbby, drawings, zones, polygons and tactical markers sync while every cat keeps separate weapon, artillery, target and range paws. Teammates see named cat positions without extra range circles. Experimental Terrain3D meowgic is enabled manually and applies only SAFE SPH-2 candidates; suspicious cat math falls back to the trusty firing table. Tilted cat tanks are not corrected yet.',
        features: [
            'WARDOGS L81 Mortar meowculator',
            'SPH-2 LOW and HIGH firing solutions',
            'Live squad meowbbies with a shared tactical meowp',
            'Experimental Terrain3D MIL meowgic',
            'Bakurani tactical meowp with contours',
            'Ozeti tactical meowp with contours',
            'Zestafona tactical meowp with contours',
            'Saved meowget firing summaries',
            'Ruler and drawing paws',
            'Tactical map markers'
        ]
    }
};

export const SEO_ALTERNATE_NAMES = [
    'WARDOGS Artillery Calculator & Tactical Map',
    'WARDOGS Arty Calc',
    'WARDOGS L81 Mortar Calculator'
];

const SEO_GUIDES = {
    en: {
        heading: 'How to use the WARDOGS artillery calculator',
        navLabel: 'Step-by-step guide',
        intro: 'Use these steps for an L81 Mortar or SPH-2 firing solution. Coordinates may be entered manually, pasted from the clipboard, or placed directly on the tactical map.',
        featuresHeading: 'Calculator and tactical map features',
        tipsHeading: 'Accuracy and workflow tips',
        faqHeading: 'WARDOGS calculator questions',
        categories: {
            start: 'Getting started',
            weapons: 'Weapons and firing',
            maps: 'Tactical maps',
            tools: 'Team and map tools',
            faq: 'Frequently asked questions'
        },
        steps: [
            { heading: '1. Select the map and weapon', body: 'Choose Bakurani, Ozeti or Zestafona, select a map style, then choose L81 Mortar or SPH-2. The supported range and firing table update with the weapon.' },
            { heading: '2. Set artillery and target coordinates', body: 'Click Artillery or Target and place the point on the map, or type X and Y. Copy exports a point, Paste imports a coordinate pair, and Lock prevents accidental movement.' },
            { heading: '3. Configure SPH-2 hull and arc', body: 'For SPH-2, enter the hull direction shown on the driver-seat compass and select LOW or HIGH arc in the third coordinate card. Park on level ground: hull direction correction does not measure vehicle tilt.' },
            { heading: '4. Read the firing solution', body: 'Open Firing solution in the left menu. Check range status, distance, MIL and azimuth before firing. Out of range means the selected weapon table has no valid solution for that distance.' },
            { heading: '5. Save and share tactical work', body: 'Save frequently used targets, use the ruler and drawing tools for planning, or create a lobby to synchronise drawings, zones, polygons and markers with the squad.' }
        ],
        tips: [
            'Confirm that the selected map matches the current server map before placing points.',
            'Use Lock after setting artillery so target placement cannot move it accidentally.',
            'Treat experimental Terrain3D values as an aid; unsupported or uncertain cases fall back to the normal firing table.'
        ],
        faq: [
            { question: 'What should I enter as SPH-2 hull direction?', answer: 'Use the heading shown by the driver-seat compass for the front of the hull, from 0 to 359 degrees. It is separate from the firing azimuth.' },
            { question: 'Should I choose LOW or HIGH arc for SPH-2?', answer: 'Choose the arc available for the intended shot and terrain. LOW is the flatter trajectory; HIGH is the steeper trajectory. The calculator displays the corresponding MIL solution.' },
            { question: 'Why are Paste and Lock shown for each point?', answer: 'Each coordinate row is independent. Paste updates only that artillery or target point, while Lock protects that point from map clicks and dragging.' }
        ]
    },
    ru: {
        heading: 'Как пользоваться артиллерийским калькулятором WARDOGS',
        navLabel: 'Пошаговая инструкция',
        intro: 'Инструкция подходит для расчётов L81 Mortar и SPH-2. Координаты можно ввести вручную, вставить из буфера или поставить непосредственно на тактической карте.',
        featuresHeading: 'Возможности калькулятора и карты',
        tipsHeading: 'Советы по точности',
        faqHeading: 'Вопросы о калькуляторе WARDOGS',
        categories: {
            start: 'Начало работы',
            weapons: 'Оружие и стрельба',
            maps: 'Тактические карты',
            tools: 'Командные инструменты',
            faq: 'Частые вопросы'
        },
        steps: [
            { heading: '1. Выберите карту и оружие', body: 'Выберите Bakurani, Ozeti или Zestafona, стиль карты и затем L81 Mortar или SPH-2. Диапазон дальности и таблица стрельбы обновятся автоматически.' },
            { heading: '2. Укажите артиллерию и цель', body: 'Выберите Артиллерия или Цель и поставьте точку на карте либо введите X и Y. Copy копирует точку, Paste вставляет пару координат, а Lock защищает её от случайного перемещения.' },
            { heading: '3. Настройте корпус и дугу SPH-2', body: 'В третьей карточке введите направление корпуса по компасу с места водителя и выберите LOW или HIGH. Ставьте машину ровно: направление корпуса не измеряет реальный наклон техники.' },
            { heading: '4. Прочитайте решение', body: 'Откройте Firing solution в левом меню и проверьте статус дальности, дистанцию, MIL и азимут. Out of range означает, что для этой дистанции нет решения в таблице выбранного оружия.' },
            { heading: '5. Сохраните или передайте план', body: 'Сохраняйте нужные цели, используйте линейку и рисунки или создайте лобби для синхронизации зон, полигонов и меток с отрядом.' }
        ],
        tips: [
            'Перед установкой точек проверьте, что выбрана карта текущего сервера.',
            'После установки артиллерии включите Lock, чтобы не сдвинуть её при выборе цели.',
            'Terrain3D — экспериментальная подсказка; при недостаточных данных используется обычная таблица.'
        ],
        faq: [
            { question: 'Что вводить в поле направления корпуса SPH-2?', answer: 'Введите направление передней части корпуса по компасу с места водителя: от 0 до 359 градусов. Это значение не равно азимуту выстрела.' },
            { question: 'Как выбрать LOW или HIGH для SPH-2?', answer: 'LOW соответствует более настильной, а HIGH — более крутой траектории. Выберите доступную для нужного выстрела дугу, и калькулятор покажет соответствующий MIL.' },
            { question: 'Чем отличаются Paste и Lock рядом с координатами?', answer: 'Paste вставляет координаты только в выбранную строку артиллерии или цели. Lock блокирует изменение этой точки кликами и перетаскиванием на карте.' }
        ]
    },
    'zh-cn': {
        heading: 'WARDOGS 炮兵计算器使用指南',
        navLabel: '分步指南',
        intro: '以下步骤适用于 L81 迫击炮和 SPH-2。坐标可以手动输入、从剪贴板粘贴，或直接在战术地图上放置。',
        featuresHeading: '计算器与战术地图功能',
        tipsHeading: '精度与操作建议',
        faqHeading: 'WARDOGS 计算器常见问题',
        categories: {
            start: '快速开始',
            weapons: '武器与射击',
            maps: '战术地图',
            tools: '团队与地图工具',
            faq: '常见问题'
        },
        steps: [
            { heading: '1. 选择地图和武器', body: '选择 Bakurani、Ozeti 或 Zestafona，再选择地图样式以及 L81 迫击炮或 SPH-2。射程和射表会随武器更新。' },
            { heading: '2. 设置炮位和目标', body: '选择炮位或目标后在地图放置，或输入 X、Y。Copy 用于复制，Paste 仅粘贴该点坐标，Lock 可防止误移动。' },
            { heading: '3. 设置 SPH-2 车体与弹道', body: '在第三张坐标卡中输入驾驶员罗盘显示的车头方向，并选择 LOW 或 HIGH。请将车辆停在平地；车体方向修正不会测量实际倾斜。' },
            { heading: '4. 查看射击解算', body: '在左侧菜单打开 Firing solution，确认射程状态、距离、MIL 和方位角。Out of range 表示当前距离没有有效射表解算。' },
            { heading: '5. 保存并共享战术规划', body: '保存常用目标，使用测距尺和绘图工具，或创建房间与小队同步区域、多边形和标记。' }
        ],
        tips: ['放置坐标前确认所选地图与服务器地图一致。', '设置炮位后使用 Lock，避免放置目标时误移动炮位。', 'Terrain3D 属于实验性辅助；数据不确定时会使用标准射表。'],
        faq: [
            { question: 'SPH-2 车体方向应输入什么？', answer: '输入驾驶员座位罗盘显示的车头方向，范围为 0–359 度。该值与射击方位角不同。' },
            { question: 'SPH-2 应选择 LOW 还是 HIGH？', answer: 'LOW 是较平的弹道，HIGH 是较陡的弹道。根据射击和地形选择可用弹道，计算器会显示对应 MIL。' },
            { question: '坐标旁的 Paste 和 Lock 有什么区别？', answer: 'Paste 只更新对应的炮位或目标坐标；Lock 会阻止地图点击和拖动改变该点。' }
        ]
    }
};

const LOCALIZED_GUIDE_LABELS = {
    uk: ['Як користуватися артилерійським калькулятором WARDOGS', 'Покрокова інструкція', 'Можливості калькулятора й мапи', 'Поради щодо точності', 'Питання про калькулятор WARDOGS', 'Початок роботи', 'Зброя і стрільба', 'Тактичні мапи', 'Командні інструменти', 'Часті питання'],
    de: ['WARDOGS-Artillerierechner verwenden', 'Schritt-für-Schritt-Anleitung', 'Funktionen von Rechner und Karte', 'Tipps für Genauigkeit', 'Fragen zum WARDOGS-Rechner', 'Erste Schritte', 'Waffen und Feuerlösung', 'Taktische Karten', 'Teamwerkzeuge', 'Häufige Fragen'],
    fr: ['Utiliser le calculateur d’artillerie WARDOGS', 'Guide étape par étape', 'Fonctions du calculateur et de la carte', 'Conseils de précision', 'Questions sur le calculateur WARDOGS', 'Bien démarrer', 'Armes et tir', 'Cartes tactiques', 'Outils d’équipe', 'Questions fréquentes'],
    es: ['Cómo usar la calculadora de artillería WARDOGS', 'Guía paso a paso', 'Funciones de la calculadora y el mapa', 'Consejos de precisión', 'Preguntas sobre la calculadora WARDOGS', 'Primeros pasos', 'Armas y tiro', 'Mapas tácticos', 'Herramientas de equipo', 'Preguntas frecuentes'],
    pl: ['Jak używać kalkulatora artyleryjskiego WARDOGS', 'Instrukcja krok po kroku', 'Funkcje kalkulatora i mapy', 'Wskazówki dotyczące celności', 'Pytania o kalkulator WARDOGS', 'Pierwsze kroki', 'Broń i ostrzał', 'Mapy taktyczne', 'Narzędzia zespołu', 'Częste pytania'],
    ko: ['WARDOGS 포병 계산기 사용법', '단계별 가이드', '계산기 및 전술 지도 기능', '정확도 팁', 'WARDOGS 계산기 질문', '시작하기', '무기 및 사격', '전술 지도', '팀 도구', '자주 묻는 질문'],
    pt: ['Como usar a calculadora de artilharia WARDOGS', 'Guia passo a passo', 'Funções da calculadora e do mapa', 'Dicas de precisão', 'Perguntas sobre a calculadora WARDOGS', 'Primeiros passos', 'Armas e tiro', 'Mapas táticos', 'Ferramentas de equipa', 'Perguntas frequentes'],
    ja: ['WARDOGS砲兵計算機の使い方', 'ステップガイド', '計算機と戦術マップの機能', '精度のヒント', 'WARDOGS計算機の質問', 'はじめに', '火器と射撃', '戦術マップ', 'チームツール', 'よくある質問'],
    cs: ['Jak používat artilerijní kalkulátor WARDOGS', 'Podrobný návod', 'Funkce kalkulátoru a mapy', 'Tipy pro přesnost', 'Otázky ke kalkulátoru WARDOGS', 'Začínáme', 'Zbraně a palba', 'Taktické mapy', 'Týmové nástroje', 'Časté otázky'],
    cat: ['How to use the WARDOGS meowculator', 'Step-by-step meow guide', 'Calculator and meowp features', 'Accuracy tips', 'WARDOGS meowculator questions', 'Primers passos', 'Armes i tir', 'Mapes tàctics', 'Eines d’equip', 'Preguntes freqüents']
};

const LOCALIZED_GUIDE_CONTENT = {
    uk: {
        intro: 'Координати для L81 Mortar або SPH-2 можна ввести вручну, вставити з буфера чи встановити безпосередньо на тактичній мапі.',
        steps: [
            { heading: '1. Виберіть мапу та зброю', body: 'Виберіть Bakurani, Ozeti або Zestafona, стиль мапи, а потім L81 Mortar чи SPH-2. Дальність і таблиця стрільби оновляться автоматично.' },
            { heading: '2. Установіть артилерію та ціль', body: 'Поставте точки на мапі або введіть X і Y. Copy копіює точку, Paste вставляє пару координат, а Lock захищає її від випадкового переміщення.' },
            { heading: '3. Налаштуйте SPH-2', body: 'У третій картці введіть напрямок корпусу за компасом водія та виберіть LOW або HIGH. Паркуйтеся рівно: цей параметр не вимірює фактичний нахил машини.' },
            { heading: '4. Перевірте рішення', body: 'Відкрийте Firing solution у лівому меню та перевірте статус дальності, дистанцію, MIL і азимут. Збережіть ціль або створіть лобі для спільного планування.' }
        ],
        tips: ['Перевірте мапу сервера перед установленням точок.', 'Заблокуйте артилерію перед розміщенням цілі.', 'Terrain3D є експериментальною підказкою; за невизначеності використовується звичайна таблиця.'],
        faq: [
            { question: 'Що вводити як напрямок корпусу SPH-2?', answer: 'Напрямок передньої частини корпусу за компасом з місця водія від 0 до 359 градусів. Це не азимут пострілу.' },
            { question: 'Чим відрізняються LOW і HIGH?', answer: 'LOW — настильніша траєкторія, HIGH — крутіша. Калькулятор показує MIL для вибраної дуги.' },
            { question: 'Що роблять Paste і Lock?', answer: 'Paste змінює лише відповідну точку, а Lock забороняє змінювати її кліками та перетягуванням.' }
        ]
    },
    de: {
        intro: 'Koordinaten für L81 Mortar oder SPH-2 können eingegeben, aus der Zwischenablage eingefügt oder direkt auf der taktischen Karte gesetzt werden.',
        steps: [
            { heading: '1. Karte und Waffe wählen', body: 'Bakurani, Ozeti oder Zestafona, den Kartenstil und anschließend L81 Mortar oder SPH-2 wählen. Reichweite und Feuertabelle werden automatisch angepasst.' },
            { heading: '2. Geschütz und Ziel setzen', body: 'Punkte auf der Karte setzen oder X und Y eingeben. Copy kopiert einen Punkt, Paste fügt ein Koordinatenpaar ein und Lock schützt vor versehentlichem Verschieben.' },
            { heading: '3. SPH-2 konfigurieren', body: 'In der dritten Karte die Rumpfrichtung vom Fahrerkompass eingeben und LOW oder HIGH wählen. Das Fahrzeug eben abstellen, da die tatsächliche Neigung nicht gemessen wird.' },
            { heading: '4. Feuerlösung prüfen', body: 'Firing solution im linken Menü öffnen und Reichweitenstatus, Distanz, MIL und Azimut prüfen. Ziele können gespeichert oder in einer Lobby gemeinsam geplant werden.' }
        ],
        tips: ['Vor dem Setzen der Punkte die Serverkarte prüfen.', 'Das Geschütz sperren, bevor das Ziel gesetzt wird.', 'Terrain3D ist experimentell; bei unsicheren Daten gilt die normale Feuertabelle.'],
        faq: [
            { question: 'Was ist die SPH-2-Rumpfrichtung?', answer: 'Die Richtung der Fahrzeugfront laut Fahrerkompass von 0 bis 359 Grad. Sie ist nicht mit dem Schussazimut identisch.' },
            { question: 'Wann LOW oder HIGH wählen?', answer: 'LOW ist die flachere, HIGH die steilere Flugbahn. Der Rechner zeigt den MIL-Wert für die gewählte Bahn.' },
            { question: 'Was ist der Unterschied zwischen Paste und Lock?', answer: 'Paste aktualisiert nur den jeweiligen Punkt. Lock verhindert Änderungen durch Kartenklicks oder Ziehen.' }
        ]
    },
    fr: {
        intro: 'Les coordonnées du mortier L81 ou du SPH-2 peuvent être saisies, collées depuis le presse-papiers ou placées directement sur la carte tactique.',
        steps: [
            { heading: '1. Choisir la carte et l’arme', body: 'Choisissez Bakurani, Ozeti ou Zestafona, le style de carte, puis le mortier L81 ou le SPH-2. La portée et la table de tir sont mises à jour automatiquement.' },
            { heading: '2. Placer l’artillerie et la cible', body: 'Placez les points sur la carte ou saisissez X et Y. Copy copie un point, Paste colle une paire de coordonnées et Lock empêche un déplacement accidentel.' },
            { heading: '3. Configurer le SPH-2', body: 'Dans la troisième carte, saisissez la direction du châssis indiquée par la boussole du conducteur et choisissez LOW ou HIGH. Stationnez à plat, car l’inclinaison réelle n’est pas mesurée.' },
            { heading: '4. Vérifier la solution', body: 'Ouvrez Firing solution dans le menu gauche et contrôlez la portée, la distance, le MIL et l’azimut. Enregistrez la cible ou créez un salon pour planifier en équipe.' }
        ],
        tips: ['Vérifiez la carte du serveur avant de placer les points.', 'Verrouillez l’artillerie avant de placer la cible.', 'Terrain3D est expérimental ; la table normale est utilisée en cas d’incertitude.'],
        faq: [
            { question: 'Quelle direction de châssis SPH-2 saisir ?', answer: 'La direction de l’avant du véhicule donnée par la boussole du conducteur, de 0 à 359 degrés. Ce n’est pas l’azimut de tir.' },
            { question: 'Faut-il choisir LOW ou HIGH ?', answer: 'LOW est la trajectoire la plus tendue et HIGH la plus courbe. Le calculateur affiche le MIL correspondant.' },
            { question: 'Quelle différence entre Paste et Lock ?', answer: 'Paste remplace uniquement le point concerné ; Lock bloque ses déplacements par clic ou glissement.' }
        ]
    },
    es: {
        intro: 'Las coordenadas del mortero L81 o SPH-2 se pueden escribir, pegar desde el portapapeles o colocar directamente en el mapa táctico.',
        steps: [
            { heading: '1. Selecciona mapa y arma', body: 'Elige Bakurani, Ozeti o Zestafona, el estilo de mapa y después L81 Mortar o SPH-2. El alcance y la tabla de tiro se actualizan automáticamente.' },
            { heading: '2. Coloca artillería y objetivo', body: 'Coloca los puntos en el mapa o escribe X e Y. Copy copia un punto, Paste pega un par de coordenadas y Lock evita moverlo por accidente.' },
            { heading: '3. Configura el SPH-2', body: 'En la tercera tarjeta introduce la dirección del casco que muestra la brújula del conductor y elige LOW o HIGH. Aparca en terreno llano: no se mide la inclinación real del vehículo.' },
            { heading: '4. Comprueba la solución', body: 'Abre Firing solution en el menú izquierdo y revisa alcance, distancia, MIL y azimut. Guarda el objetivo o crea una sala para planificar con el equipo.' }
        ],
        tips: ['Comprueba el mapa del servidor antes de colocar puntos.', 'Bloquea la artillería antes de colocar el objetivo.', 'Terrain3D es experimental; ante datos inciertos se usa la tabla normal.'],
        faq: [
            { question: '¿Qué dirección de casco SPH-2 debo introducir?', answer: 'La dirección del frente del vehículo que indica la brújula del conductor, de 0 a 359 grados. No es el azimut de tiro.' },
            { question: '¿Cuándo elijo LOW o HIGH?', answer: 'LOW es la trayectoria más plana y HIGH la más pronunciada. La calculadora muestra el MIL de la opción elegida.' },
            { question: '¿En qué se diferencian Paste y Lock?', answer: 'Paste actualiza solo ese punto; Lock impide cambiarlo con clics o arrastrándolo en el mapa.' }
        ]
    },
    pl: {
        intro: 'Współrzędne dla L81 Mortar lub SPH-2 można wpisać, wkleić ze schowka albo wskazać bezpośrednio na mapie taktycznej.',
        steps: [
            { heading: '1. Wybierz mapę i broń', body: 'Wybierz Bakurani, Ozeti lub Zestafona, styl mapy, a następnie L81 Mortar albo SPH-2. Zasięg i tabela ogniowa zostaną zaktualizowane.' },
            { heading: '2. Ustaw artylerię i cel', body: 'Umieść punkty na mapie lub wpisz X i Y. Copy kopiuje punkt, Paste wkleja parę współrzędnych, a Lock chroni przed przypadkowym przesunięciem.' },
            { heading: '3. Skonfiguruj SPH-2', body: 'W trzeciej karcie wpisz kierunek kadłuba z kompasu kierowcy i wybierz LOW lub HIGH. Ustaw pojazd poziomo, ponieważ rzeczywiste przechylenie nie jest mierzone.' },
            { heading: '4. Sprawdź rozwiązanie', body: 'Otwórz Firing solution w lewym menu i sprawdź zasięg, odległość, MIL oraz azymut. Zapisz cel lub utwórz lobby do wspólnego planowania.' }
        ],
        tips: ['Sprawdź mapę serwera przed ustawieniem punktów.', 'Zablokuj artylerię przed umieszczeniem celu.', 'Terrain3D jest eksperymentalny; przy niepewnych danych używana jest zwykła tabela.'],
        faq: [
            { question: 'Jaki kierunek kadłuba SPH-2 wpisać?', answer: 'Kierunek przodu pojazdu z kompasu kierowcy, od 0 do 359 stopni. Nie jest to azymut strzału.' },
            { question: 'Kiedy wybrać LOW lub HIGH?', answer: 'LOW oznacza bardziej płaski, a HIGH bardziej stromy tor. Kalkulator pokaże MIL dla wybranej opcji.' },
            { question: 'Czym różnią się Paste i Lock?', answer: 'Paste aktualizuje tylko dany punkt, a Lock blokuje jego zmianę kliknięciem lub przeciągnięciem.' }
        ]
    },
    pt: {
        intro: 'As coordenadas do morteiro L81 ou SPH-2 podem ser introduzidas, coladas da área de transferência ou marcadas diretamente no mapa tático.',
        steps: [
            { heading: '1. Escolha o mapa e a arma', body: 'Escolha Bakurani, Ozeti ou Zestafona, o estilo do mapa e depois L81 Mortar ou SPH-2. O alcance e a tabela de tiro são atualizados automaticamente.' },
            { heading: '2. Defina a artilharia e o alvo', body: 'Marque os pontos no mapa ou introduza X e Y. Copy copia um ponto, Paste cola um par de coordenadas e Lock evita deslocações acidentais.' },
            { heading: '3. Configure o SPH-2', body: 'No terceiro cartão, introduza a direção do casco indicada pela bússola do condutor e escolha LOW ou HIGH. Estacione nivelado, pois a inclinação real não é medida.' },
            { heading: '4. Verifique a solução', body: 'Abra Firing solution no menu esquerdo e confirme alcance, distância, MIL e azimute. Guarde o alvo ou crie uma sala para planear em equipa.' }
        ],
        tips: ['Confirme o mapa do servidor antes de marcar os pontos.', 'Bloqueie a artilharia antes de colocar o alvo.', 'Terrain3D é experimental; em caso de incerteza é usada a tabela normal.'],
        faq: [
            { question: 'Que direção do casco SPH-2 devo introduzir?', answer: 'A direção da frente do veículo indicada pela bússola do condutor, de 0 a 359 graus. Não é o azimute de tiro.' },
            { question: 'Quando escolher LOW ou HIGH?', answer: 'LOW é a trajetória mais plana e HIGH a mais elevada. A calculadora mostra o MIL da opção escolhida.' },
            { question: 'Qual é a diferença entre Paste e Lock?', answer: 'Paste atualiza apenas esse ponto; Lock impede alterações por clique ou arrastamento.' }
        ]
    },
    cs: {
        intro: 'Souřadnice pro L81 Mortar nebo SPH-2 lze zadat ručně, vložit ze schránky nebo umístit přímo na taktické mapě.',
        steps: [
            { heading: '1. Vyberte mapu a zbraň', body: 'Vyberte Bakurani, Ozeti nebo Zestafona, styl mapy a poté L81 Mortar či SPH-2. Dostřel a palebná tabulka se automaticky změní.' },
            { heading: '2. Umístěte dělo a cíl', body: 'Umístěte body na mapě nebo zadejte X a Y. Copy bod zkopíruje, Paste vloží dvojici souřadnic a Lock zabrání náhodnému posunutí.' },
            { heading: '3. Nastavte SPH-2', body: 'Ve třetí kartě zadejte směr korby z kompasu řidiče a zvolte LOW nebo HIGH. Vozidlo postavte na rovinu, protože skutečný náklon se neměří.' },
            { heading: '4. Zkontrolujte řešení', body: 'Otevřete Firing solution v levém menu a ověřte dostřel, vzdálenost, MIL a azimut. Cíl uložte nebo vytvořte lobby pro týmové plánování.' }
        ],
        tips: ['Před umístěním bodů ověřte mapu serveru.', 'Před nastavením cíle uzamkněte pozici děla.', 'Terrain3D je experimentální; při nejistých datech se použije běžná tabulka.'],
        faq: [
            { question: 'Jaký směr korby SPH-2 zadat?', answer: 'Směr přední části vozidla podle kompasu řidiče od 0 do 359 stupňů. Nejde o azimut střelby.' },
            { question: 'Kdy zvolit LOW nebo HIGH?', answer: 'LOW je plošší a HIGH strmější dráha. Kalkulátor zobrazí MIL pro vybranou variantu.' },
            { question: 'Jaký je rozdíl mezi Paste a Lock?', answer: 'Paste změní pouze příslušný bod, zatímco Lock zabrání jeho změně kliknutím či tažením.' }
        ]
    },
    ko: {
        intro: 'L81 Mortar 또는 SPH-2 좌표는 직접 입력하거나 클립보드에서 붙여넣거나 전술 지도에 바로 배치할 수 있습니다.',
        steps: [
            { heading: '1. 지도와 무기 선택', body: 'Bakurani, Ozeti 또는 Zestafona와 지도 스타일을 선택한 뒤 L81 Mortar 또는 SPH-2를 고릅니다. 사거리와 사격표가 자동으로 갱신됩니다.' },
            { heading: '2. 포와 표적 배치', body: '지도에 점을 놓거나 X와 Y를 입력합니다. Copy는 점을 복사하고 Paste는 좌표 한 쌍을 붙여넣으며 Lock은 실수로 이동하는 것을 막습니다.' },
            { heading: '3. SPH-2 설정', body: '세 번째 카드에 운전석 나침반의 차체 방향을 입력하고 LOW 또는 HIGH를 선택합니다. 실제 차량 기울기는 측정하지 않으므로 평지에 주차하세요.' },
            { heading: '4. 사격 제원 확인', body: '왼쪽 메뉴에서 Firing solution을 열어 사거리 상태, 거리, MIL, 방위각을 확인합니다. 표적을 저장하거나 로비를 만들어 분대와 계획을 공유할 수 있습니다.' }
        ],
        tips: ['점을 배치하기 전에 서버 지도가 맞는지 확인하세요.', '표적을 놓기 전에 포 위치를 Lock으로 잠그세요.', 'Terrain3D는 실험 기능이며 불확실하면 기본 사격표를 사용합니다.'],
        faq: [
            { question: 'SPH-2 차체 방향에는 무엇을 입력하나요?', answer: '운전석 나침반에 표시되는 차량 전방 방향을 0~359도로 입력합니다. 사격 방위각과는 다른 값입니다.' },
            { question: 'LOW와 HIGH 중 무엇을 선택하나요?', answer: 'LOW는 더 낮고 평평한 탄도, HIGH는 더 높은 탄도입니다. 계산기가 선택한 탄도의 MIL을 표시합니다.' },
            { question: 'Paste와 Lock의 차이는 무엇인가요?', answer: 'Paste는 해당 포 또는 표적 좌표만 바꾸며 Lock은 지도 클릭이나 드래그로 점이 바뀌는 것을 막습니다.' }
        ]
    },
    ja: {
        intro: 'L81 MortarまたはSPH-2の座標は、直接入力、クリップボードから貼り付け、または戦術マップ上への配置ができます。',
        steps: [
            { heading: '1. マップと火器を選ぶ', body: 'Bakurani、Ozeti、Zestafonaのいずれかとマップ表示を選び、L81 MortarまたはSPH-2を選択します。射程と射表が自動更新されます。' },
            { heading: '2. 砲位置と目標を設定する', body: 'マップに点を置くかXとYを入力します。Copyは点をコピーし、Pasteは座標を貼り付け、Lockは誤操作による移動を防ぎます。' },
            { heading: '3. SPH-2を設定する', body: '3枚目のカードに運転席コンパスの車体方向を入力し、LOWまたはHIGHを選びます。実際の車体傾斜は測定しないため、平坦な場所に停車してください。' },
            { heading: '4. 射撃諸元を確認する', body: '左メニューのFiring solutionを開き、射程状態、距離、MIL、方位角を確認します。目標を保存したり、ロビーで分隊と計画を共有できます。' }
        ],
        tips: ['点を置く前にサーバーのマップと一致しているか確認してください。', '目標を置く前に砲位置をLockしてください。', 'Terrain3Dは実験機能で、不確実な場合は通常の射表を使用します。'],
        faq: [
            { question: 'SPH-2の車体方向には何を入力しますか？', answer: '運転席コンパスに表示される車体前方の方向を0〜359度で入力します。射撃方位角とは別の値です。' },
            { question: 'LOWとHIGHはどう選びますか？', answer: 'LOWは低く平坦な弾道、HIGHは高い弾道です。計算機は選択した弾道のMILを表示します。' },
            { question: 'PasteとLockの違いは何ですか？', answer: 'Pasteはその砲位置または目標だけを更新し、Lockはマップのクリックやドラッグによる変更を防ぎます。' }
        ]
    }
};

for (const [language, labels] of Object.entries(LOCALIZED_GUIDE_LABELS)) {
    const base = SEO_GUIDES.en;
    SEO_GUIDES[language] = {
        ...base,
        heading: labels[0],
        navLabel: labels[1],
        featuresHeading: labels[2],
        tipsHeading: labels[3],
        faqHeading: labels[4],
        categories: {
            start: labels[5],
            weapons: labels[6],
            maps: labels[7],
            tools: labels[8],
            faq: labels[9]
        }
    };

    Object.assign(
        SEO_GUIDES[language],
        LOCALIZED_GUIDE_CONTENT[language] || {}
    );
}

for (const [language, guide] of Object.entries(SEO_GUIDES)) {
    const copy = SEO_PAGE_CONTENT[language];
    if (!copy) continue;

    guide.tips = guide.tips
        .filter(tip => !/Terrain3D/i.test(tip));

    copy.guide = guide;
    copy.faqHeading ||= guide.faqHeading;
    copy.faq = [
        ...(copy.faq || []),
        ...guide.faq
    ].filter(item => !/Terrain3D/i.test(item.question));

    copy.features = copy.features
        .filter(feature => !/Terrain3D/i.test(feature));

    if (copy.cluster) {
        const sphSection = copy.cluster.sections
            .find(section => section.id === 'wardogs-sph-2-calculator');

        if (sphSection) {
            sphSection.body = guide.steps[2].body;
        }
    } else {
        copy.intro = guide.intro;
        copy.usage = guide.steps
            .map(step => step.body)
            .join(' ');
    }
}
