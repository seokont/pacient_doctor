import { pool } from "../bd.js";

export async function fillTestData() {
  try {
    console.log("Начинаем заполнение тестовых данных...");

    await pool.query(`
      TRUNCATE TABLE notifications, messages, chat_rooms, doctors, patients, users 
      RESTART IDENTITY CASCADE
    `);

    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, user_type, is_online, avatar_url) VALUES
      ('doctor1@example.com', '$2a$10$abc123', 'Иван', 'Петров', 'doctor', true, '/avatars/doctor1.jpg'),
      ('doctor2@example.com', '$2a$10$def456', 'Мария', 'Сидорова', 'doctor', false, '/avatars/doctor2.jpg'),
      ('patient1@example.com', '$2a$10$ghi789', 'Алексей', 'Иванов', 'patient', true, '/avatars/patient1.jpg'),
      ('patient2@example.com', '$2a$10$jkl012', 'Елена', 'Кузнецова', 'patient', false, '/avatars/patient2.jpg')
    `);

    await pool.query(`
      INSERT INTO doctors (user_id, specialization, license_number, experience_years, rating, consultation_price, description, is_verified) VALUES
      (1, 'Кардиолог', 'LIC-12345', 15, 4.8, 2500.00, 'Опытный кардиолог с многолетней практикой', true),
      (2, 'Невролог', 'LIC-67890', 8, 4.6, 2000.00, 'Специалист по заболеваниям нервной системы', true)
    `);

    await pool.query(`
      INSERT INTO patients (user_id, date_of_birth, gender, phone_number, emergency_contact, medical_history, allergies) VALUES
      (3, '1985-03-15', 'male', '+7-912-345-67-89', '+7-911-999-88-77', 'Гипертония, диабет 2 типа', 'Пенициллин, орехи'),
      (4, '1990-07-22', 'female', '+7-923-456-78-90', '+7-922-888-77-66', 'Мигрени, астма', 'Пыльца, шерсть животных')
    `);

    await pool.query(`
      INSERT INTO chat_rooms (doctor_id, patient_id, status, created_at) VALUES
      (1, 3, 'active', '2024-01-10 09:00:00'),
      (1, 4, 'active', '2024-01-11 14:30:00'),
      (2, 3, 'active', '2024-01-12 11:15:00')
    `);

    await pool.query(`
      INSERT INTO messages (room_id, sender_id, message_text, message_type, is_read, created_at) VALUES
      (1, 1, 'Добрый день, Алексей! Как ваше самочувствие?', 'text', true, '2024-01-10 09:05:00'),
      (1, 3, 'Здравствуйте, доктор. Давление в норме, чувствую себя хорошо.', 'text', true, '2024-01-10 09:10:00'),
      (1, 1, 'Отлично! Продолжайте принимать лекарства по схеме.', 'text', false, '2024-01-10 09:15:00'),
      (2, 1, 'Елена, добрый день! Как проходила неделя?', 'text', true, '2024-01-11 14:35:00'),
      (2, 4, 'Здравствуйте, были небольшие головные боли во вторник.', 'text', false, '2024-01-11 14:40:00'),
      (3, 2, 'Алексей, пришлите результаты МРТ', 'text', true, '2024-01-12 11:20:00'),
      (3, 3, 'Отправил файл с результатами во вложении', 'text', true, '2024-01-12 11:25:00'),
      (3, 2, 'Спасибо, изучу и напишу заключение', 'text', false, '2024-01-12 11:30:00')
    `);

    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at) VALUES
      (3, 'appointment', 'Назначен прием', 'У вас запланирован прием на 15 января в 10:00', false, '2024-01-14 16:00:00'),
      (4, 'message', 'Новое сообщение', 'Доктор Петров отправил вам сообщение', true, '2024-01-14 17:30:00'),
      (3, 'reminder', 'Напоминание', 'Не забудьте принять лекарство в 20:00', false, '2024-01-15 19:45:00')
    `);

    console.log("Тестовые данные успешно заполнены!");

    const users = await pool.query("SELECT * FROM users");
    console.log("Пользователи:", users.rows);

    const chats = await pool.query("SELECT * FROM chat_rooms");
    console.log("Чат-комнаты:", chats.rows);

    const messages = await pool.query("SELECT * FROM messages");
    console.log("Сообщения:", messages.rows);
  } catch (error) {
    console.error("Ошибка при заполнении тестовых данных:", error);
  } finally {
    await pool.end();
  }
}
