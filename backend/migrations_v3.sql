USE smart_event_booking;

CREATE TABLE IF NOT EXISTS venue_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  name VARCHAR(60) NOT NULL,
  node_type ENUM('entrance','zone','exit','amenity') NOT NULL DEFAULT 'amenity',
  seat_type ENUM('general','premium','vip','none') NOT NULL DEFAULT 'none',
  pos_x INT NOT NULL,
  pos_y INT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY unique_node (event_id, name)
);

CREATE TABLE IF NOT EXISTS venue_edges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  from_node VARCHAR(60) NOT NULL,
  to_node VARCHAR(60) NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);