<?php
/**
 * Обработчик заявок квиза «Собери свой праздник».
 * Принимает POST от формы, валидирует данные и отправляет письмо
 * на почту заказчика. Возвращает ответ в формате JSON.
 *
 * Требования хостинга: PHP с рабочей функцией mail()
 * (либо подключите PHPMailer и SMTP — см. комментарий ниже).
 */

header('Content-Type: application/json; charset=utf-8');

// --- Куда отправляем заявки ---
$to = 'zakaz@firelords.ru';
// Адрес отправителя (должен быть на домене сайта, иначе письмо уйдёт в спам)
$from = 'noreply@firelords.ru';

// Отвечаем JSON-ошибкой и завершаемся
function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// Принимаем только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Метод не поддерживается', 405);
}

// --- Собираем и очищаем поля ---
function field($key) {
    return isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
}

$name   = field('name');
$phone  = field('phone');
$email  = field('email');
$event  = field('event');
$budget = field('budget');
$help   = field('help');

// --- Серверная валидация обязательных полей ---
$phoneDigits = preg_replace('/\D/', '', $phone);

if (mb_strlen($name) < 2) {
    fail('Укажите, пожалуйста, имя');
}
if (mb_strlen($phoneDigits) < 11) {
    fail('Укажите корректный номер телефона');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Укажите корректный e-mail');
}

// Форматируем бюджет с разделителями разрядов
$budgetText = $budget !== '' && ctype_digit($budget)
    ? number_format((int) $budget, 0, '.', ' ') . ' руб.'
    : $budget;

// --- Тело письма ---
$lines = [
    'Новая заявка с сайта «Повелитель огня»',
    '',
    'Имя: ' . $name,
    'Телефон: ' . $phone,
    'E-mail: ' . $email,
    '',
    'Событие: ' . ($event !== '' ? $event : '—'),
    'Бюджет: ' . ($budgetText !== '' ? $budgetText : '—'),
    'Нужна помощь в подборе: ' . ($help !== '' ? $help : '—'),
];
$body = implode("\r\n", $lines);

$subject = 'Заявка с сайта «Повелитель огня»';

// --- Заголовки письма (UTF-8) ---
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers   = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';
$headers[] = 'From: =?UTF-8?B?' . base64_encode('Повелитель огня') . '?= <' . $from . '>';
$headers[] = 'Reply-To: ' . $email;

$sent = mail($to, $encodedSubject, $body, implode("\r\n", $headers));

/*
 * Если mail() на хостинге не работает или письма попадают в спам,
 * замените блок выше на отправку через PHPMailer + SMTP:
 *
 *   require 'PHPMailer/src/PHPMailer.php'; ...
 *   $mail = new PHPMailer(true);
 *   $mail->isSMTP(); $mail->Host = 'smtp.yandex.ru'; ...
 *   $mail->setFrom($from); $mail->addAddress($to);
 *   $mail->addReplyTo($email); $mail->Subject = $subject; $mail->Body = $body;
 *   $sent = $mail->send();
 */

if (!$sent) {
    fail('Не удалось отправить письмо. Попробуйте позже.', 500);
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
