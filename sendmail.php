<?php
/**
 * Обработчик заявок с сайта «Повелитель огня».
 * Обслуживает все формы лендинга:
 *   — квиз «Собери свой праздник» (имя, телефон, e-mail + ответы);
 *   — «Закрытый прайс-лист» (имя, телефон, город, тип клиента);
 *   — «Перезвоните мне» в футере (имя, телефон).
 * Обязательны только имя и телефон, e-mail — по желанию.
 * Отправляет письмо на почту заказчика и возвращает ответ в JSON.
 *
 * Требования хостинга: PHP с рабочей функцией mail()
 * (либо PHPMailer + SMTP — см. комментарий внизу).
 */

header('Content-Type: application/json; charset=utf-8');

// --- Куда отправляем заявки ---
$to   = 'zakaz@firelords.ru';
// Адрес отправителя должен быть на домене сайта, иначе письмо уйдёт в спам
$from = 'noreply@firelords.ru';

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Метод не поддерживается', 405);
}

function field($key) {
    return isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
}

// --- Данные из формы ---
$name  = field('name');
$phone = field('phone');
$email = field('email');

// --- Обязательные поля: имя и телефон ---
$phoneDigits = preg_replace('/\D/', '', $phone);
if (mb_strlen($name) < 2) {
    fail('Укажите, пожалуйста, имя');
}
if (mb_strlen($phoneDigits) < 11) {
    fail('Укажите корректный номер телефона');
}
// E-mail не обязателен, но если указан — проверяем формат
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Укажите корректный e-mail');
}

// --- Дополнительные (необязательные) поля разных форм ---
$budgetRaw = field('budget');
$budget = ($budgetRaw !== '' && ctype_digit($budgetRaw))
    ? number_format((int) $budgetRaw, 0, '.', ' ') . ' руб.'
    : $budgetRaw;

$optional = [
    'Тип клиента'            => field('client_type'),
    'Город'                  => field('city'),
    'Событие'                => field('event'),
    'Бюджет'                 => $budget,
    'Нужна помощь в подборе' => field('help'),
    'Сообщение'              => field('message'),
];

// --- Тело письма ---
$lines = [
    'Новая заявка с сайта «Повелитель огня»',
    '',
    'Имя: ' . $name,
    'Телефон: ' . $phone,
];
if ($email !== '') {
    $lines[] = 'E-mail: ' . $email;
}
foreach ($optional as $label => $value) {
    if ($value !== '') {
        $lines[] = $label . ': ' . $value;
    }
}
$body = implode("\r\n", $lines);

$subject = 'Заявка с сайта «Повелитель огня»';

// --- Заголовки письма (UTF-8) ---
$headers   = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';
$headers[] = 'From: =?UTF-8?B?' . base64_encode('Повелитель огня') . '?= <' . $from . '>';
if ($email !== '') {
    $headers[] = 'Reply-To: ' . $email;
}

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = mail($to, $encodedSubject, $body, implode("\r\n", $headers));

/*
 * Если mail() на хостинге не работает или письма попадают в спам,
 * замените вызов mail() на отправку через PHPMailer + SMTP:
 *
 *   require 'PHPMailer/src/PHPMailer.php'; ...
 *   $mail = new PHPMailer(true);
 *   $mail->isSMTP(); $mail->Host = 'smtp.yandex.ru'; ...
 *   $mail->setFrom($from); $mail->addAddress($to);
 *   if ($email !== '') $mail->addReplyTo($email);
 *   $mail->Subject = $subject; $mail->Body = $body;
 *   $sent = $mail->send();
 */

if (!$sent) {
    fail('Не удалось отправить письмо. Попробуйте позже.', 500);
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
