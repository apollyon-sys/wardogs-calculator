/* =========================
   ANONYMOUS FEEDBACK
   ========================= */

const FEEDBACK_COPY = {
    en: {
        title: 'Feedback', type: 'Type', bug: 'Bug report', feature: 'Feature request',
        description: 'Description', placeholder: 'What happened, or what would you like to see?',
        contact: 'Contact (optional)', contactPlaceholder: 'Discord or email',
        diagnostics: 'Page, language, map, weapon, browser and viewport are included automatically. No saved targets or coordinates are sent.',
        anonymous: 'No account or registration required.', send: 'Send', cancel: 'Cancel', sending: 'Sending…',
        sent: 'Thanks! Report sent.', unavailable: 'Feedback is temporarily unavailable.',
        limited: 'Too many reports. Please try again in a moment.', required: 'Please describe the bug or feature request.'
    },
    ru: {
        title: 'Обратная связь', type: 'Тип', bug: 'Сообщить об ошибке', feature: 'Предложить функцию',
        description: 'Описание', placeholder: 'Что произошло или какую функцию вы хотели бы увидеть?',
        contact: 'Контакт (необязательно)', contactPlaceholder: 'Discord или email',
        diagnostics: 'Страница, язык, карта, оружие, браузер и размер окна добавляются автоматически. Сохранённые цели и координаты не отправляются.',
        anonymous: 'Аккаунт и регистрация не нужны.', send: 'Отправить', cancel: 'Отмена', sending: 'Отправка…',
        sent: 'Спасибо! Сообщение отправлено.', unavailable: 'Форма временно недоступна.',
        limited: 'Слишком много сообщений. Попробуйте ещё раз чуть позже.', required: 'Опишите ошибку или желаемую функцию.'
    },
    uk: {
        title: 'Зворотний зв’язок', type: 'Тип', bug: 'Повідомити про помилку', feature: 'Запропонувати функцію',
        description: 'Опис', placeholder: 'Що сталося або яку функцію ви хотіли б бачити?',
        contact: 'Контакт (необов’язково)', contactPlaceholder: 'Discord або email',
        diagnostics: 'Сторінка, мова, мапа, зброя, браузер і розмір вікна додаються автоматично. Збережені цілі й координати не надсилаються.',
        anonymous: 'Обліковий запис і реєстрація не потрібні.', send: 'Надіслати', cancel: 'Скасувати', sending: 'Надсилання…',
        sent: 'Дякую! Повідомлення надіслано.', unavailable: 'Форма тимчасово недоступна.',
        limited: 'Забагато повідомлень. Спробуйте трохи пізніше.', required: 'Опишіть помилку або бажану функцію.'
    },
    de: {
        title: 'Feedback', type: 'Typ', bug: 'Fehler melden', feature: 'Funktion vorschlagen',
        description: 'Beschreibung', placeholder: 'Was ist passiert oder welche Funktion wünschst du dir?',
        contact: 'Kontakt (optional)', contactPlaceholder: 'Discord oder E-Mail',
        diagnostics: 'Seite, Sprache, Karte, Waffe, Browser und Fenstergröße werden automatisch mitgesendet. Gespeicherte Ziele und Koordinaten werden nicht gesendet.',
        anonymous: 'Kein Konto und keine Registrierung erforderlich.', send: 'Senden', cancel: 'Abbrechen', sending: 'Wird gesendet…',
        sent: 'Danke! Meldung gesendet.', unavailable: 'Feedback ist vorübergehend nicht verfügbar.',
        limited: 'Zu viele Meldungen. Bitte versuche es gleich noch einmal.', required: 'Bitte beschreibe den Fehler oder Funktionswunsch.'
    },
    fr: {
        title: 'Feedback', type: 'Type', bug: 'Signaler un bug', feature: 'Suggérer une fonctionnalité',
        description: 'Description', placeholder: 'Que s’est-il passé ou quelle fonctionnalité aimeriez-vous voir ?',
        contact: 'Contact (facultatif)', contactPlaceholder: 'Discord ou e-mail',
        diagnostics: 'La page, la langue, la carte, l’arme, le navigateur et la taille de la fenêtre sont ajoutés automatiquement. Les cibles et coordonnées enregistrées ne sont pas envoyées.',
        anonymous: 'Aucun compte ni inscription requis.', send: 'Envoyer', cancel: 'Annuler', sending: 'Envoi…',
        sent: 'Merci ! Message envoyé.', unavailable: 'Le feedback est temporairement indisponible.',
        limited: 'Trop de messages. Réessayez dans un instant.', required: 'Décrivez le bug ou la fonctionnalité souhaitée.'
    },
    es: {
        title: 'Comentarios', type: 'Tipo', bug: 'Informar de un error', feature: 'Sugerir una función',
        description: 'Descripción', placeholder: '¿Qué ocurrió o qué función te gustaría ver?',
        contact: 'Contacto (opcional)', contactPlaceholder: 'Discord o correo',
        diagnostics: 'La página, idioma, mapa, arma, navegador y tamaño de ventana se incluyen automáticamente. No se envían objetivos guardados ni coordenadas.',
        anonymous: 'No hace falta cuenta ni registro.', send: 'Enviar', cancel: 'Cancelar', sending: 'Enviando…',
        sent: '¡Gracias! Mensaje enviado.', unavailable: 'Los comentarios no están disponibles temporalmente.',
        limited: 'Demasiados mensajes. Inténtalo de nuevo en un momento.', required: 'Describe el error o la función solicitada.'
    },
    pl: {
        title: 'Opinie', type: 'Typ', bug: 'Zgłoś błąd', feature: 'Zaproponuj funkcję',
        description: 'Opis', placeholder: 'Co się stało lub jaką funkcję chcesz zobaczyć?',
        contact: 'Kontakt (opcjonalnie)', contactPlaceholder: 'Discord lub e-mail',
        diagnostics: 'Strona, język, mapa, broń, przeglądarka i rozmiar okna są dołączane automatycznie. Zapisane cele i współrzędne nie są wysyłane.',
        anonymous: 'Konto ani rejestracja nie są wymagane.', send: 'Wyślij', cancel: 'Anuluj', sending: 'Wysyłanie…',
        sent: 'Dzięki! Zgłoszenie wysłane.', unavailable: 'Formularz jest chwilowo niedostępny.',
        limited: 'Za dużo zgłoszeń. Spróbuj ponownie za chwilę.', required: 'Opisz błąd lub proponowaną funkcję.'
    },
    pt: {
        title: 'Feedback', type: 'Tipo', bug: 'Reportar erro', feature: 'Sugerir funcionalidade',
        description: 'Descrição', placeholder: 'O que aconteceu ou que funcionalidade gostaria de ver?',
        contact: 'Contacto (opcional)', contactPlaceholder: 'Discord ou e-mail',
        diagnostics: 'Página, idioma, mapa, arma, navegador e tamanho da janela são incluídos automaticamente. Alvos guardados e coordenadas não são enviados.',
        anonymous: 'Não é necessária conta nem registo.', send: 'Enviar', cancel: 'Cancelar', sending: 'A enviar…',
        sent: 'Obrigado! Mensagem enviada.', unavailable: 'O feedback está temporariamente indisponível.',
        limited: 'Demasiadas mensagens. Tente novamente daqui a pouco.', required: 'Descreva o erro ou a funcionalidade pretendida.'
    },
    'zh-cn': {
        title: '反馈', type: '类型', bug: '报告问题', feature: '功能建议',
        description: '描述', placeholder: '发生了什么，或者你希望增加什么功能？',
        contact: '联系方式（可选）', contactPlaceholder: 'Discord 或邮箱',
        diagnostics: '页面、语言、地图、武器、浏览器和窗口大小会自动附加。不会发送已保存目标或坐标。',
        anonymous: '无需账号或注册。', send: '发送', cancel: '取消', sending: '发送中…',
        sent: '谢谢！反馈已发送。', unavailable: '反馈功能暂时不可用。',
        limited: '提交过于频繁，请稍后再试。', required: '请描述问题或功能建议。'
    },
    ko: {
        title: '피드백', type: '유형', bug: '버그 신고', feature: '기능 제안',
        description: '설명', placeholder: '무슨 문제가 있었거나 어떤 기능을 원하시나요?',
        contact: '연락처 (선택)', contactPlaceholder: 'Discord 또는 이메일',
        diagnostics: '페이지, 언어, 지도, 무기, 브라우저, 창 크기가 자동으로 포함됩니다. 저장된 목표와 좌표는 전송되지 않습니다.',
        anonymous: '계정이나 가입이 필요하지 않습니다.', send: '보내기', cancel: '취소', sending: '보내는 중…',
        sent: '감사합니다! 피드백을 보냈습니다.', unavailable: '피드백을 일시적으로 사용할 수 없습니다.',
        limited: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.', required: '버그 또는 원하는 기능을 설명해 주세요.'
    },
    ja: {
        title: 'フィードバック', type: '種類', bug: '不具合を報告', feature: '機能を提案',
        description: '説明', placeholder: '何が起きたか、またはどんな機能が欲しいか教えてください。',
        contact: '連絡先（任意）', contactPlaceholder: 'Discord またはメール',
        diagnostics: 'ページ、言語、マップ、武器、ブラウザ、画面サイズは自動で送信されます。保存済みターゲットや座標は送信されません。',
        anonymous: 'アカウント登録は不要です。', send: '送信', cancel: 'キャンセル', sending: '送信中…',
        sent: 'ありがとうございます。送信しました。', unavailable: 'フィードバックは一時的に利用できません。',
        limited: '送信回数が多すぎます。少し待ってから再試行してください。', required: '不具合または機能の内容を入力してください。'
    },
    cat: {
        title: 'Meowback', type: 'Type', bug: 'Report a bug 🐾', feature: 'Suggest a feature 😺',
        description: 'Meow', placeholder: 'What went wrong, hooman?', contact: 'Contact (optional)', contactPlaceholder: 'Discord or email',
        diagnostics: 'Only safe technical context is attached, including browser and viewport. No saved targets or coordinates.', anonymous: 'No account needed. Meow.',
        send: 'Send', cancel: 'Cancel', sending: 'Sending…', sent: 'Purrfect! Sent.',
        unavailable: 'Feedback is napping right now.', limited: 'Too many meows. Try again soon.', required: 'Please add a meowssage.'
    }
};

const FEEDBACK_GENERAL_COPY = {
    en: {
        general: 'General feedback', rating: 'Overall rating',
        generalPlaceholder: 'Tell me what you think about the calculator or site.',
        generalRequired: 'Please write a short comment.',
        ratingRequired: 'Please choose a rating from 1 to 5 stars.'
    },
    ru: {
        general: 'Общий отзыв', rating: 'Общая оценка',
        generalPlaceholder: 'Расскажите, что вы думаете о калькуляторе или сайте.',
        generalRequired: 'Напишите хотя бы пару слов.',
        ratingRequired: 'Поставьте оценку от 1 до 5 звёзд.'
    },
    uk: {
        general: 'Загальний відгук', rating: 'Загальна оцінка',
        generalPlaceholder: 'Розкажіть, що ви думаєте про калькулятор або сайт.',
        generalRequired: 'Напишіть хоча б кілька слів.',
        ratingRequired: 'Поставте оцінку від 1 до 5 зірок.'
    },
    de: {
        general: 'Allgemeines Feedback', rating: 'Gesamtbewertung',
        generalPlaceholder: 'Sag mir, was du über den Rechner oder die Website denkst.',
        generalRequired: 'Bitte schreibe einen kurzen Kommentar.',
        ratingRequired: 'Bitte wähle eine Bewertung von 1 bis 5 Sternen.'
    },
    fr: {
        general: 'Avis général', rating: 'Note globale',
        generalPlaceholder: 'Dites-moi ce que vous pensez du calculateur ou du site.',
        generalRequired: 'Écrivez quelques mots.',
        ratingRequired: 'Choisissez une note de 1 à 5 étoiles.'
    },
    es: {
        general: 'Opinión general', rating: 'Valoración general',
        generalPlaceholder: 'Cuéntame qué te parece la calculadora o el sitio.',
        generalRequired: 'Escribe unas pocas palabras.',
        ratingRequired: 'Elige una valoración de 1 a 5 estrellas.'
    },
    pl: {
        general: 'Ogólna opinia', rating: 'Ogólna ocena',
        generalPlaceholder: 'Napisz, co sądzisz o kalkulatorze lub stronie.',
        generalRequired: 'Napisz kilka słów.',
        ratingRequired: 'Wybierz ocenę od 1 do 5 gwiazdek.'
    },
    pt: {
        general: 'Feedback geral', rating: 'Avaliação geral',
        generalPlaceholder: 'Diz o que achas da calculadora ou do site.',
        generalRequired: 'Escreve algumas palavras.',
        ratingRequired: 'Escolhe uma avaliação de 1 a 5 estrelas.'
    },
    'zh-cn': {
        general: '总体反馈', rating: '总体评分',
        generalPlaceholder: '告诉我你对计算器或网站的看法。',
        generalRequired: '请写几句话。',
        ratingRequired: '请选择 1 到 5 星评分。'
    },
    ko: {
        general: '일반 피드백', rating: '전체 평가',
        generalPlaceholder: '계산기나 사이트에 대한 의견을 알려주세요.',
        generalRequired: '짧게라도 의견을 적어 주세요.',
        ratingRequired: '1점에서 5점 사이의 별점을 선택해 주세요.'
    },
    ja: {
        general: '全般的なフィードバック', rating: '総合評価',
        generalPlaceholder: '計算機やサイトについての感想を教えてください。',
        generalRequired: '短いコメントを入力してください。',
        ratingRequired: '1〜5つ星で評価してください。'
    },
    cat: {
        general: 'General meowback 😸', rating: 'Paw rating',
        generalPlaceholder: 'Tell this cat what you think, hooman.',
        generalRequired: 'Please leave a tiny meowssage.',
        ratingRequired: 'Pick from 1 to 5 shiny stars.'
    }
};

function feedbackCopy() {
    const language = typeof LANG === 'string' ? LANG : 'en';
    return {
        ...(FEEDBACK_COPY[language] || FEEDBACK_COPY.en),
        ...(FEEDBACK_GENERAL_COPY[language] || FEEDBACK_GENERAL_COPY.en)
    };
}

function feedbackServerUrl() {
    return String(
        APP_CONFIG?.feedback?.serverUrl ||
        APP_CONFIG?.collab?.serverUrl ||
        ''
    ).replace(/\/+$/, '');
}


function feedbackBrowser() {
    const ua = String(navigator.userAgent || '');
    if (/YaBrowser\//i.test(ua)) return 'Yandex Browser';
    if (/EdgA?\//i.test(ua)) return 'Edge';
    if (/OPR\//i.test(ua)) return 'Opera';
    if (/Firefox\//i.test(ua) || /FxiOS\//i.test(ua)) return 'Firefox';
    if (/CriOS\//i.test(ua) || /Chrome\//i.test(ua)) return 'Chrome';
    if (/Safari\//i.test(ua)) return 'Safari';
    return '';
}

function feedbackOs() {
    const ua = String(navigator.userAgent || '');
    if (/Android/i.test(ua)) return 'Android';
    if (/(iPhone|iPad|iPod)/i.test(ua)) return 'iOS';
    if (/CrOS/i.test(ua)) return 'Chrome OS';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return '';
}

function feedbackTechnicalContext() {
    const state = typeof S === 'object' && S ? S : {};
    const footerConfig = APP_CONFIG?.site?.footer || {};
    return {
        page: location.pathname.slice(0, 160),
        language: String(typeof LANG === 'string' ? LANG : document.documentElement.lang || '').slice(0, 16),
        device: document.body.classList.contains('mobile-app') ? 'mobile-ui' : 'desktop-ui',
        viewport: `${Math.round(innerWidth / 100) * 100}x${Math.round(innerHeight / 100) * 100}`.slice(0, 32),
        browser: feedbackBrowser().slice(0, 32),
        os: feedbackOs().slice(0, 32),
        map: String(state.map || '').slice(0, 32),
        weapon: String(state.weapon || '').slice(0, 64),
        version: String(footerConfig.version || '').slice(0, 32)
    };
}

function makeFeedbackDialog() {
    const copy = feedbackCopy();
    const dialog = document.createElement('dialog');
    dialog.className = 'feedback-dialog';
    dialog.dataset.language = typeof LANG === 'string' ? LANG : 'en';
    dialog.setAttribute('aria-labelledby', 'feedbackTitle');

    const form = document.createElement('form');
    form.className = 'feedback-form';
    form.noValidate = true;

    form.innerHTML = `
        <div class="feedback-heading">
            <h2 id="feedbackTitle" data-feedback-copy="title"></h2>
            <button class="feedback-close" type="button" aria-label="Close">×</button>
        </div>
        <label class="feedback-field">
            <span data-feedback-copy="type"></span>
            <select name="type">
                <option value="bug" data-feedback-copy="bug"></option>
                <option value="feature" data-feedback-copy="feature"></option>
                <option value="general" data-feedback-copy="general"></option>
            </select>
        </label>
        <div class="feedback-field feedback-rating" hidden>
            <span data-feedback-copy="rating"></span>
            <div class="feedback-stars" role="group"></div>
            <input name="rating" type="hidden" value="" />
        </div>
        <label class="feedback-field">
            <span data-feedback-copy="description"></span>
            <textarea name="message" maxlength="3800" rows="7" required></textarea>
        </label>
        <label class="feedback-field">
            <span data-feedback-copy="contact"></span>
            <input name="contact" maxlength="160" autocomplete="off" />
        </label>
        <label class="feedback-honeypot" aria-hidden="true">
            Website
            <input name="website" tabindex="-1" autocomplete="off" />
        </label>
        <p class="feedback-diagnostics"></p>
        <p class="feedback-anonymous"></p>
        <p class="feedback-status" role="status" aria-live="polite"></p>
        <div class="feedback-actions">
            <button type="button" data-feedback-action="cancel"></button>
            <button class="primary" type="submit" data-feedback-action="send"></button>
        </div>
    `;

    dialog.appendChild(form);
    document.body.appendChild(dialog);

    const text = (selector, value) => {
        const node = form.querySelector(selector);
        if (node) node.textContent = value;
    };
    form.querySelectorAll('[data-feedback-copy]').forEach(node => {
        node.textContent = copy[node.dataset.feedbackCopy] || '';
    });
    form.querySelector('textarea').placeholder = copy.placeholder;
    form.querySelector('input[name="contact"]').placeholder = copy.contactPlaceholder;
    text('.feedback-diagnostics', copy.diagnostics);
    text('.feedback-anonymous', copy.anonymous);
    text('[data-feedback-action="cancel"]', copy.cancel);
    text('[data-feedback-action="send"]', copy.send);

    const typeSelect = form.elements.type;
    const messageInput = form.elements.message;
    const ratingInput = form.elements.rating;
    const ratingField = form.querySelector('.feedback-rating');
    const stars = form.querySelector('.feedback-stars');
    stars.setAttribute('aria-label', copy.rating);

    const setRating = value => {
        const rating = Number(value) || 0;
        ratingInput.value = rating >= 1 && rating <= 5 ? String(rating) : '';
        stars.querySelectorAll('[data-feedback-rating]').forEach(button => {
            const buttonRating = Number(button.dataset.feedbackRating);
            button.classList.toggle('is-active', buttonRating <= rating);
            button.setAttribute('aria-pressed', buttonRating === rating ? 'true' : 'false');
        });
    };

    for (let value = 1; value <= 5; value += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'feedback-star';
        button.dataset.feedbackRating = String(value);
        button.textContent = '★';
        button.setAttribute('aria-label', `${value} / 5`);
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => setRating(value));
        stars.appendChild(button);
    }

    const syncTypeUi = () => {
        const isGeneral = typeSelect.value === 'general';
        ratingField.hidden = !isGeneral;
        messageInput.placeholder = isGeneral ? copy.generalPlaceholder : copy.placeholder;
        if (!isGeneral) setRating(0);
    };
    typeSelect.addEventListener('change', syncTypeUi);
    syncTypeUi();

    const close = () => {
        if (dialog.open) dialog.close();
    };
    form.querySelector('.feedback-close').addEventListener('click', close);
    form.querySelector('[data-feedback-action="cancel"]').addEventListener('click', close);
    dialog.addEventListener('click', event => {
        if (event.target === dialog) close();
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const copyNow = feedbackCopy();
        const type = String(form.elements.type.value || '');
        const message = String(form.elements.message.value || '').trim();
        const rating = type === 'general' ? Number(form.elements.rating.value) : null;
        const submit = form.querySelector('[data-feedback-action="send"]');
        const status = form.querySelector('.feedback-status');

        if (message.length < 5) {
            status.dataset.state = 'error';
            status.textContent = type === 'general' ? copyNow.generalRequired : copyNow.required;
            form.elements.message.focus();
            return;
        }

        if (type === 'general' && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
            status.dataset.state = 'error';
            status.textContent = copyNow.ratingRequired;
            stars.querySelector('[data-feedback-rating="1"]')?.focus();
            return;
        }

        const server = feedbackServerUrl();
        if (!server) {
            status.dataset.state = 'error';
            status.textContent = copyNow.unavailable;
            return;
        }

        submit.disabled = true;
        submit.textContent = copyNow.sending;
        status.textContent = '';
        status.dataset.state = '';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${server}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                referrerPolicy: 'no-referrer',
                signal: controller.signal,
                body: JSON.stringify({
                    type,
                    rating,
                    message,
                    contact: String(form.elements.contact.value || '').trim(),
                    website: String(form.elements.website.value || ''),
                    ...feedbackTechnicalContext()
                })
            });

            if (!response.ok) {
                let error = '';
                try { error = String((await response.json())?.error || ''); } catch { /* ignore */ }
                if (response.status === 429) throw new Error('rate-limited');
                throw new Error(error || 'unavailable');
            }

            if (typeof trackAnalytics === 'function') {
                trackAnalytics('feedback-sent', { type });
            }
            status.dataset.state = 'success';
            status.textContent = copyNow.sent;
            form.elements.message.value = '';
            setRating(0);
            window.setTimeout(close, 1100);
        } catch (error) {
            if (typeof trackAnalytics === 'function') {
                trackAnalytics('feedback-failed', {
                    type,
                    reason: error?.message === 'rate-limited' ? 'rate-limited' : 'unavailable'
                });
            }
            status.dataset.state = 'error';
            status.textContent = error?.message === 'rate-limited' ? copyNow.limited : copyNow.unavailable;
        } finally {
            clearTimeout(timeout);
            submit.disabled = false;
            submit.textContent = copyNow.send;
        }
    });

    return dialog;
}

function openFeedbackDialog() {
    let dialog = document.querySelector('.feedback-dialog');
    const language = typeof LANG === 'string' ? LANG : 'en';
    if (dialog && dialog.dataset.language !== language) {
        dialog.remove();
        dialog = null;
    }
    if (!dialog) dialog = makeFeedbackDialog();
    if (!dialog.open) dialog.showModal();
    const message = dialog.querySelector('textarea[name="message"]');
    window.setTimeout(() => message?.focus(), 0);
}
