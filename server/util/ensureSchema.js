import { pool } from "../bd.js";

export async function ensureSchema() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        user_type VARCHAR(20) CHECK (user_type IN ('patient','doctor','admin')),
        avatar_url VARCHAR(500),
        is_online BOOLEAN DEFAULT false,
        last_online TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, user_type, is_online, avatar_url)
      VALUES 
        ('doctor1@example.com', '$2a$10$abc123', 'Иван', 'Петров', 'doctor', true, '/avatars/doctor1.jpg'),
        ('doctor2@example.com', '$2a$10$def456', 'Мария', 'Сидорова', 'doctor', false, '/avatars/doctor2.jpg'),
        ('patient1@example.com', '$2a$10$ghi789', 'Алексей', 'Иванов', 'patient', true, '/avatars/patient1.jpg'),
        ('patient2@example.com', '$2a$10$jkl012', 'Елена', 'Кузнецова', 'patient', false, '/avatars/patient2.jpg')
      ON CONFLICT (email) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        room_uuid UUID DEFAULT gen_random_uuid(),
        status VARCHAR(20) CHECK (status IN ('active', 'closed', 'archived')) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMPTZ,
        UNIQUE(doctor_id, patient_id)
      )
    `);

    await client.query(`
      INSERT INTO chat_rooms (doctor_id, patient_id, status, created_at)
      VALUES 
        (1, 3, 'active', '2024-01-10 09:00:00'),
        (1, 4, 'active', '2024-01-11 14:30:00'),
        (2, 3, 'active', '2024-01-12 11:15:00')
      ON CONFLICT (doctor_id, patient_id) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        date_of_birth DATE,
        gender VARCHAR(20),
        phone_number VARCHAR(50),
        emergency_contact VARCHAR(255),
        medical_history TEXT,
        allergies TEXT
      )
    `);

    await client.query(`
      INSERT INTO patients (user_id, date_of_birth, gender, phone_number, emergency_contact, medical_history, allergies)
      VALUES 
        (3, '1985-03-15', 'male', '+7-912-345-67-89', '+7-911-999-88-77', 'Гипертония, диабет 2 типа', 'Пенициллин, орехи'),
        (4, '1990-07-22', 'female', '+7-923-456-78-90', '+7-922-888-77-66', 'Мигрени, астма', 'Пыльца, шерсть животных')
      ON CONFLICT (user_id) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        specialization VARCHAR(200),
        license_number VARCHAR(100),
        experience_years INTEGER,
        rating DECIMAL(3,2) DEFAULT 0.0,
        consultation_price DECIMAL(10,2),
        description TEXT,
        is_verified BOOLEAN DEFAULT false
      )
    `);

    await client.query(`
      INSERT INTO doctors (user_id, specialization, license_number, experience_years, rating, consultation_price, description, is_verified)
      VALUES 
        (1, 'Кардиолог', 'LIC-12345', 15, 4.8, 2500.00, 'Опытный кардиолог с многолетней практикой', true),
        (2, 'Невролог', 'LIC-67890', 8, 4.6, 2000.00, 'Специалист по заболеваниям нервной системы', true)
      ON CONFLICT (user_id) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT,
        message_type VARCHAR(20) CHECK (message_type IN ('text','image','file','system')) DEFAULT 'text',
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_size INTEGER,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);

    await client.query(`
      INSERT INTO messages (room_id, sender_id, message_text, message_type, is_read, created_at)
      SELECT 
        1, 1, 'Добрый день, Алексей! Как ваше самочувствие?', 'text', true, '2024-01-10 09:05:00'
      WHERE NOT EXISTS (SELECT 1 FROM messages WHERE room_id = 1 AND sender_id = 1 AND created_at = '2024-01-10 09:05:00')
    `);

    await client.query(`
      INSERT INTO messages (room_id, sender_id, message_text, message_type, is_read, created_at)
      SELECT 
        1, 3, 'Здравствуйте, доктор. Давление в норме, чувствую себя хорошо.', 'text', true, '2024-01-10 09:10:00'
      WHERE NOT EXISTS (SELECT 1 FROM messages WHERE room_id = 1 AND sender_id = 3 AND created_at = '2024-01-10 09:10:00')
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS read_receipts (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (message_id, user_id)
      )
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    const tables = ["users", "chat_rooms", "messages"];

    for (const table of tables) {
      const triggerName = `${table}_set_updated_at`;

      await client.query(`DROP TRIGGER IF EXISTS ${triggerName} ON ${table}`);

      await client.query(`
        CREATE TRIGGER ${triggerName}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at()
      `);
    }

    await client.query("COMMIT");
    console.log("✅ Database schema created successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error creating database schema:", error);
    throw error;
  } finally {
    client.release();
  }
}
