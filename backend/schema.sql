CREATE DATABASE IF NOT EXISTS smart_event_booking;
USE smart_event_booking;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','organizer','admin') NOT NULL DEFAULT 'user',
  status ENUM('active','pending','suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizer_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'concert',
  description TEXT,
  venue VARCHAR(200) NOT NULL,
  event_date DATETIME NOT NULL,
  rows_count INT NOT NULL DEFAULT 6,
  seats_per_row INT NOT NULL DEFAULT 8,
  price_general DECIMAL(10,2) NOT NULL DEFAULT 500,
  price_premium DECIMAL(10,2) NOT NULL DEFAULT 1000,
  price_vip DECIMAL(10,2) NOT NULL DEFAULT 2000,
  popularity INT NOT NULL DEFAULT 0,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  row_num INT NOT NULL,
  col_num INT NOT NULL,
  seat_label VARCHAR(10) NOT NULL,
  seat_type ENUM('general','premium','vip') NOT NULL DEFAULT 'general',
  price DECIMAL(10,2) NOT NULL,
  status ENUM('available','booked') NOT NULL DEFAULT 'available',
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY unique_seat (event_id, row_num, col_num)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  seat_ids VARCHAR(500) NOT NULL,
  booking_type ENUM('single','group') NOT NULL DEFAULT 'single',
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  qr_code VARCHAR(255) NOT NULL,
  qr_status ENUM('valid','used') NOT NULL DEFAULT 'valid',
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS waiting_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  seats_needed INT NOT NULL DEFAULT 1,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);