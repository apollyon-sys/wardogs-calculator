export const SEO_PAGE_CONTENT = {
    en: {
        title: 'WARDOGS Artillery Calculator | Mortar, SPH-2 & Maps',
        description: 'Free WARDOGS artillery and mortar calculator for SPH-2 and Mortar with Bakurani/Ozeti maps, Terrain3D MIL correction, contours and tactical tools.',
        heading: 'About this calculator',
        intro: 'WARDOGS Artillery Calculator is a free, open-source community tool for mortar and SPH-2 firing solutions. It includes interactive tactical maps for Bakurani and Ozeti, coordinate-based targeting, distance, azimuth and MIL calculations, terrain contours, and experimental Terrain3D MIL correction for SPH-2 where supported.',
        usage: 'Select a map and weapon, place the artillery and target positions, then read the firing solution. Saved targets show firing information directly in the list, while the ruler, drawing tools, contour layers and tactical markers help with planning. Experimental Terrain3D correction is opt-in and off by default; only SAFE SPH-2 candidates are applied, while uncertain or unsupported cases automatically use the normal firing table. Platform and chassis tilt correction is not enabled.',
        features: [
            'WARDOGS mortar calculator and firing solutions',
            'SPH-2 LOW and HIGH firing solutions',
            'Experimental Terrain3D MIL correction for SPH-2',
            'Bakurani interactive tactical map with terrain contours',
            'Ozeti tactical map with terrain contours',
            'Saved target firing summaries',
            'Ruler and drawing tools',
            'Tactical map markers'
        ],
        cluster: {
            heading: 'WARDOGS Artillery Calculator',
            navLabel: 'Calculator and map guide',
            intro: 'WARDOGS Artillery Calculator is a free, open-source community tool for calculating distance, azimuth and MIL from manually placed artillery and target positions. Players looking for a quick WARDOGS arty calc can use the same interface for Mortar and SPH-2 while keeping firing solutions, saved targets and tactical planning tools on the map.',
            sections: [
                {
                    id: 'wardogs-mortar-calculator',
                    heading: 'WARDOGS Mortar Calculator',
                    body: 'Choose Mortar, place the mortar and target on the map, and the calculator returns distance, azimuth and the firing-table MIL value. Range status helps show whether the selected target is inside the supported mortar range.'
                },
                {
                    id: 'wardogs-sph-2-calculator',
                    heading: 'WARDOGS SPH-2 Calculator',
                    body: 'Choose SPH-2 to calculate distance, azimuth and the available LOW/HIGH firing solutions. On supported Terrain3D maps, an experimental opt-in correction can compare the normal table value with a terrain-adjusted MIL candidate. It is off by default and only SAFE candidates are applied; uncertain, unsupported or unreachable cases automatically fall back to the normal firing table. Platform and chassis tilt correction is not included.'
                },
                {
                    id: 'bakurani-interactive-map',
                    heading: 'Bakurani Interactive Map',
                    body: 'The Bakurani interactive map is calibrated to WARDOGS coordinates so artillery positions, targets, saved targets, the ruler, drawings and tactical markers share the same map space. Terrain contour layers and Terrain3D elevation data are available for tactical planning and supported SPH-2 terrain-correction previews.'
                },
                {
                    id: 'ozeti-interactive-map',
                    heading: 'Ozeti Interactive Map',
                    body: 'The Ozeti interactive map uses calibrated WARDOGS coordinates and corrected playable-area alignment for artillery and tactical planning. Artillery positions, targets, saved targets, drawings, markers and terrain contours share the same coordinate space, with Terrain3D elevation data available where supported.'
                },
                {
                    id: 'how-to-use',
                    heading: 'How to use',
                    body: 'Select Bakurani, Ozeti or a custom map, choose Mortar or SPH-2, place the artillery position and target, then read distance, azimuth and MIL. For SPH-2 on supported maps, experimental Terrain3D correction can be enabled manually to compare a SAFE terrain-adjusted candidate with the normal firing-table value.'
                }
            ]
        },
        faq: [
            {
                question: 'Is this also a WARDOGS mortar calculator?',
                answer: 'Yes. Select Mortar, place the mortar and target positions, and the calculator provides distance, azimuth, range status and the firing-table MIL value.'
            },
            {
                question: 'Does WARDOGS Artillery Calculator support SPH-2?',
                answer: 'Yes. SPH-2 support includes distance, azimuth, LOW/HIGH firing solutions and optional experimental Terrain3D MIL correction on supported terrain.'
            },
            {
                question: 'Which WARDOGS maps are available?',
                answer: 'The calculator includes interactive maps for Bakurani and Ozeti, plus a custom-map mode. Both preset maps use calibrated game-coordinate mapping, support tactical map tools and terrain contour layers, and provide Terrain3D elevation data where coverage is available.'
            },
            {
                question: 'Does Terrain3D correct SPH-2 MIL for elevation?',
                answer: 'Experimental Terrain3D MIL correction is available as an opt-in feature for SPH-2 on supported terrain. It is off by default, shows the normal table value alongside the Terrain3D candidate, and only applies candidates classified as SAFE. Other cases automatically fall back to the normal firing table. Vehicle or chassis tilt is not corrected.'
            },
            {
                question: 'Does the WARDOGS map show terrain contours?',
                answer: 'Yes. Terrain contour layers are available on supported WARDOGS maps and can be toggled from the Layers menu together with other tactical overlays.'
            }
        ]
    },

    ru: {
        description: 'Бесплатный артиллерийский и миномётный калькулятор WARDOGS для SPH-2 и Mortar с картами Bakurani и Ozeti, контурами рельефа и экспериментальной Terrain3D-коррекцией MIL.',
        heading: 'О калькуляторе',
        intro: 'WARDOGS Artillery Calculator — бесплатный open-source инструмент сообщества для расчёта миномёта и SPH-2. Он включает интерактивные тактические карты Bakurani и Ozeti, расчёт дистанции, азимута и MIL, контуры рельефа и экспериментальную Terrain3D-коррекцию MIL для SPH-2 там, где она поддерживается.',
        usage: 'Выберите карту и оружие, укажите позицию артиллерии и цель, затем используйте полученный расчёт. Сохранённые цели показывают основные данные расчёта прямо в списке, а линейка, рисование, контуры и маркеры помогают с тактическим планированием. Экспериментальная Terrain3D-коррекция включается только вручную и по умолчанию выключена: применяются только SAFE-кандидаты SPH-2, а во всех неопределённых или неподдерживаемых случаях калькулятор автоматически использует обычную таблицу. Коррекция наклона платформы и корпуса не включена.',
        features: [
            'Миномётный калькулятор WARDOGS',
            'LOW и HIGH расчёты SPH-2',
            'Экспериментальная Terrain3D-коррекция MIL для SPH-2',
            'Интерактивная карта Bakurani с контурами рельефа',
            'Тактическая карта Ozeti с контурами рельефа',
            'Полные данные сохранённых целей',
            'Линейка и инструменты рисования',
            'Тактические маркеры'
        ]
    },

    uk: {
        description: 'Безкоштовний артилерійський і мінометний калькулятор WARDOGS для SPH-2 та Mortar з мапами Bakurani й Ozeti, контурами рельєфу та експериментальною Terrain3D-корекцією MIL.',
        heading: 'Про калькулятор',
        intro: 'WARDOGS Artillery Calculator — безкоштовний open-source інструмент спільноти для розрахунків міномета та SPH-2. Він містить інтерактивні тактичні мапи Bakurani й Ozeti, розрахунок дистанції, азимута та MIL, контури рельєфу й експериментальну Terrain3D-корекцію MIL для SPH-2 там, де вона підтримується.',
        usage: 'Виберіть мапу й зброю, встановіть позиції артилерії та цілі й використовуйте отримане рішення. Збережені цілі показують основні дані розрахунку безпосередньо у списку, а лінійка, малювання, контури та маркери допомагають із тактичним плануванням. Експериментальна Terrain3D-корекція вмикається лише вручну й за замовчуванням вимкнена: застосовуються тільки SAFE-кандидати SPH-2, а в невизначених або непідтримуваних випадках автоматично використовується звичайна таблиця. Корекцію нахилу платформи та корпусу не ввімкнено.',
        features: [
            'Мінометний калькулятор WARDOGS',
            'LOW і HIGH розрахунки SPH-2',
            'Експериментальна Terrain3D-корекція MIL для SPH-2',
            'Інтерактивна мапа Bakurani з контурами рельєфу',
            'Тактична мапа Ozeti з контурами рельєфу',
            'Повні дані збережених цілей',
            'Лінійка та інструменти малювання',
            'Тактичні маркери'
        ]
    },

    de: {
        description: 'Kostenloser WARDOGS Artillerie- und Mörserrechner für SPH-2 und Mortar mit Bakurani-/Ozeti-Karten, Höhenlinien und experimenteller Terrain3D-MIL-Korrektur.',
        heading: 'Über diesen Rechner',
        intro: 'Der WARDOGS Artillery Calculator ist ein kostenloses Open-Source-Community-Tool für Mörser- und SPH-2-Feuerlösungen. Er bietet interaktive taktische Karten für Bakurani und Ozeti, Distanz-, Azimut- und MIL-Berechnung, Höhenlinien und eine experimentelle Terrain3D-MIL-Korrektur für SPH-2 auf unterstütztem Gelände.',
        usage: 'Karte und Waffe auswählen, Artillerie- und Zielposition setzen und anschließend die Feuerlösung ablesen. Gespeicherte Ziele zeigen die wichtigsten Feuerdaten direkt in der Liste; Lineal, Zeichenwerkzeuge, Höhenlinien und Marker unterstützen die taktische Planung. Die experimentelle Terrain3D-Korrektur ist standardmäßig AUS und muss manuell aktiviert werden. Nur SAFE-SPH-2-Kandidaten werden angewendet; unsichere oder nicht unterstützte Fälle verwenden automatisch die normale Feuertabelle. Plattform- und Fahrzeugneigung wird nicht korrigiert.',
        features: [
            'WARDOGS Mörserrechner und Feuerlösungen',
            'SPH-2 LOW- und HIGH-Feuerlösungen',
            'Experimentelle Terrain3D-MIL-Korrektur für SPH-2',
            'Interaktive Bakurani-Karte mit Höhenlinien',
            'Taktische Ozeti-Karte mit Höhenlinien',
            'Feuerdaten für gespeicherte Ziele',
            'Lineal und Zeichenwerkzeuge',
            'Taktische Kartenmarker'
        ]
    },

    fr: {
        description: 'Calculateur gratuit d’artillerie et de mortier WARDOGS pour SPH-2 et Mortar, avec cartes Bakurani/Ozeti, courbes de niveau et correction MIL Terrain3D expérimentale.',
        heading: 'À propos du calculateur',
        intro: 'WARDOGS Artillery Calculator est un outil communautaire gratuit et open source pour les solutions de tir au mortier et au SPH-2. Il comprend les cartes tactiques interactives Bakurani et Ozeti, les calculs de distance, d’azimut et de MIL, les courbes de niveau et une correction MIL Terrain3D expérimentale pour le SPH-2 sur les terrains pris en charge.',
        usage: 'Sélectionnez une carte et une arme, placez l’artillerie et la cible, puis consultez la solution de tir. Les cibles enregistrées affichent directement les principales données de tir, tandis que la règle, le dessin, les courbes de niveau et les marqueurs facilitent la planification. La correction Terrain3D expérimentale est DÉSACTIVÉE par défaut et doit être activée manuellement. Seuls les candidats SPH-2 SAFE sont appliqués ; les cas incertains ou non pris en charge reviennent automatiquement à la table de tir normale. L’inclinaison de la plateforme et du châssis n’est pas corrigée.',
        features: [
            'Calculateur de mortier WARDOGS',
            'Solutions SPH-2 LOW et HIGH',
            'Correction MIL Terrain3D expérimentale pour SPH-2',
            'Carte interactive Bakurani avec courbes de niveau',
            'Carte tactique Ozeti avec courbes de niveau',
            'Données de tir des cibles enregistrées',
            'Règle et outils de dessin',
            'Marqueurs tactiques'
        ]
    },

    es: {
        description: 'Calculadora gratuita de artillería y mortero WARDOGS para SPH-2 y Mortar, con mapas Bakurani/Ozeti, curvas de nivel y corrección MIL Terrain3D experimental.',
        heading: 'Acerca de la calculadora',
        intro: 'WARDOGS Artillery Calculator es una herramienta comunitaria gratuita y de código abierto para soluciones de tiro de mortero y SPH-2. Incluye mapas tácticos interactivos de Bakurani y Ozeti, cálculos de distancia, azimut y MIL, curvas de nivel y una corrección MIL Terrain3D experimental para SPH-2 en terreno compatible.',
        usage: 'Selecciona un mapa y un arma, coloca la artillería y el objetivo y consulta la solución de tiro. Los objetivos guardados muestran los principales datos de tiro directamente en la lista, mientras que la regla, el dibujo, las curvas de nivel y los marcadores ayudan con la planificación táctica. La corrección Terrain3D experimental está DESACTIVADA por defecto y debe activarse manualmente. Solo se aplican candidatos SPH-2 SAFE; los casos inciertos o no compatibles vuelven automáticamente a la tabla de tiro normal. No se corrige la inclinación de la plataforma o el chasis.',
        features: [
            'Calculadora de mortero WARDOGS',
            'Soluciones SPH-2 LOW y HIGH',
            'Corrección MIL Terrain3D experimental para SPH-2',
            'Mapa interactivo de Bakurani con curvas de nivel',
            'Mapa táctico de Ozeti con curvas de nivel',
            'Datos de tiro de objetivos guardados',
            'Regla y herramientas de dibujo',
            'Marcadores tácticos'
        ]
    },

    pl: {
        description: 'Darmowy kalkulator artylerii i moździerza WARDOGS dla SPH-2 i Mortar z mapami Bakurani/Ozeti, poziomicami i eksperymentalną korektą MIL Terrain3D.',
        heading: 'O kalkulatorze',
        intro: 'WARDOGS Artillery Calculator to darmowe narzędzie open source społeczności do rozwiązań ogniowych moździerza i SPH-2. Zawiera interaktywne mapy taktyczne Bakurani i Ozeti, obliczenia dystansu, azymutu i MIL, poziomice oraz eksperymentalną korektę MIL Terrain3D dla SPH-2 na obsługiwanym terenie.',
        usage: 'Wybierz mapę i broń, ustaw pozycję artylerii oraz celu, a następnie odczytaj rozwiązanie ogniowe. Zapisane cele pokazują najważniejsze dane ogniowe bezpośrednio na liście, a linijka, rysowanie, poziomice i markery pomagają w planowaniu. Eksperymentalna korekta Terrain3D jest domyślnie WYŁĄCZONA i wymaga ręcznego włączenia. Stosowane są wyłącznie kandydaty SPH-2 SAFE; przypadki niepewne lub nieobsługiwane automatycznie korzystają ze standardowej tabeli. Przechył platformy i podwozia nie jest korygowany.',
        features: [
            'Kalkulator moździerza WARDOGS',
            'Rozwiązania SPH-2 LOW i HIGH',
            'Eksperymentalna korekta MIL Terrain3D dla SPH-2',
            'Interaktywna mapa Bakurani z poziomicami',
            'Mapa taktyczna Ozeti z poziomicami',
            'Dane ogniowe zapisanych celów',
            'Linijka i narzędzia rysowania',
            'Markery taktyczne'
        ]
    },

    ko: {
        description: 'SPH-2와 Mortar용 무료 WARDOGS 포병·박격포 계산기. Bakurani/Ozeti 지도, 등고선, 실험적 Terrain3D MIL 보정 및 전술 도구를 제공합니다.',
        heading: '계산기 소개',
        intro: 'WARDOGS Artillery Calculator는 박격포와 SPH-2 사격 제원을 계산하기 위한 무료 오픈 소스 커뮤니티 도구입니다. Bakurani와 Ozeti 인터랙티브 전술 지도, 거리·방위각·MIL 계산, 지형 등고선과 지원되는 지형에서의 실험적 SPH-2 Terrain3D MIL 보정을 제공합니다.',
        usage: '지도와 무기를 선택하고 포병 위치와 목표 위치를 지정한 다음 사격 제원을 확인하세요. 저장된 목표는 주요 사격 정보를 목록에 바로 표시하며, 거리 측정, 그리기, 등고선과 마커는 전술 계획에 사용할 수 있습니다. 실험적 Terrain3D 보정은 기본적으로 꺼져 있으며 사용자가 직접 켜야 합니다. SAFE로 판정된 SPH-2 후보만 적용되고 불확실하거나 지원되지 않는 경우에는 자동으로 표준 사격표를 사용합니다. 플랫폼 및 차체 기울기는 보정하지 않습니다.',
        features: [
            'WARDOGS 박격포 계산 및 사격 제원',
            'SPH-2 LOW 및 HIGH 사격 제원',
            'SPH-2용 실험적 Terrain3D MIL 보정',
            '등고선이 포함된 Bakurani 인터랙티브 지도',
            '등고선이 포함된 Ozeti 전술 지도',
            '저장된 목표 사격 정보',
            '거리 측정 및 그리기 도구',
            '전술 지도 마커'
        ]
    },

    pt: {
        description: 'Calculadora gratuita de artilharia e morteiro WARDOGS para SPH-2 e Mortar, com mapas Bakurani/Ozeti, curvas de nível e correção MIL Terrain3D experimental.',
        heading: 'Sobre a calculadora',
        intro: 'WARDOGS Artillery Calculator é uma ferramenta comunitária gratuita e open source para soluções de tiro de morteiro e SPH-2. Inclui mapas táticos interativos de Bakurani e Ozeti, cálculos de distância, azimute e MIL, curvas de nível e correção MIL Terrain3D experimental para SPH-2 em terreno suportado.',
        usage: 'Seleciona um mapa e uma arma, coloca as posições da artilharia e do alvo e consulta a solução de tiro. Os alvos guardados mostram os principais dados de tiro diretamente na lista, enquanto a régua, o desenho, as curvas de nível e os marcadores ajudam no planeamento. A correção Terrain3D experimental está DESLIGADA por defeito e deve ser ativada manualmente. Apenas candidatos SPH-2 SAFE são aplicados; casos incertos ou não suportados regressam automaticamente à tabela de tiro normal. A inclinação da plataforma e do chassis não é corrigida.',
        features: [
            'Calculadora de morteiro WARDOGS',
            'Soluções SPH-2 LOW e HIGH',
            'Correção MIL Terrain3D experimental para SPH-2',
            'Mapa interativo Bakurani com curvas de nível',
            'Mapa tático Ozeti com curvas de nível',
            'Dados de tiro dos alvos guardados',
            'Régua e ferramentas de desenho',
            'Marcadores táticos'
        ]
    },
    
    ja: {
        description: 'SPH-2と迫撃砲に対応した無料のWARDOGS砲兵用弾道計算機。Bakurani/Ozetiのマップ、等高線、実験的なTerrain3D MIL補正、戦術ツールを備えています。',
        heading: 'この計算機について',
        intro: 'WARDOGS Artillery Calculatorは、迫撃砲とSPH-2の射撃諸元を算出するための無料・オープンソースのコミュニティツールです。BakuraniとOzetiのインタラクティブ戦術マップ、座標による目標指定、距離・方位角・MILの計算、地形の等高線、対応する地形での実験的なSPH-2向けTerrain3D MIL補正を提供します。',
        usage: 'マップと火器を選び、砲と目標の位置を置くと射撃諸元が表示されます。保存した目標は主要な射撃情報を一覧にそのまま表示し、計測・描画・等高線レイヤー・戦術マーカーは作戦の計画に使えます。実験的なTerrain3D補正は既定でオフになっており、利用者が自分で有効にします。SAFEと判定されたSPH-2の候補にのみ適用され、不確実な場合や非対応の場合は自動的に通常の射表を使用します。車体の傾斜補正には対応していません。',
        features: [
            'WARDOGSの迫撃砲計算と射撃諸元',
            'SPH-2のLOW / HIGH射撃諸元',
            'SPH-2向けの実験的Terrain3D MIL補正',
            '等高線付きBakuraniインタラクティブマップ',
            '等高線付きOzeti戦術マップ',
            '保存した目標の射撃情報',
            '計測ツールと描画ツール',
            '戦術マップマーカー'
        ]
    },
    
    cat: {
        description: 'Free WARDOGS arty and mortar meowculator with SPH-2, Bakurani/Ozeti meowps, contour paws and experimental Terrain3D MIL meowgic.',
        heading: 'About the meowculator',
        intro: 'WARDOGS Artillery Calculator is a free open-source community meowculator for mortar and SPH-2 firing solutions. It includes interactive Bakurani and Ozeti tactical meowps, distance, azimuth and MIL math, contour paws and experimental Terrain3D MIL meowgic for supported SPH-2 shots.',
        usage: 'Pick a meowp and weapon, place the meowtillery and meowget, then read the firing solution. Saved meowgets show firing info right in the list, while ruler paws, drawings, contours and markers help with tactical cat planning. Experimental Terrain3D meowgic is OFF by default and only SAFE SPH-2 candidates are applied; suspicious cat math falls back to the trusty firing table. Tilted cat tanks are not corrected yet.',
        features: [
            'WARDOGS mortar meowculator',
            'SPH-2 LOW and HIGH firing solutions',
            'Experimental Terrain3D MIL meowgic',
            'Bakurani tactical meowp with contours',
            'Ozeti tactical meowp with contours',
            'Saved meowget firing summaries',
            'Ruler and drawing paws',
            'Tactical map markers'
        ]
    }
};

export const SEO_ALTERNATE_NAMES = [
    'WARDOGS Artillery Calculator & Tactical Map',
    'WARDOGS Arty Calc'
];
