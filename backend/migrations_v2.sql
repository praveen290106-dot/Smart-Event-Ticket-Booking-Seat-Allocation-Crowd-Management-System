USE smart_event_booking;

ALTER TABLE users ADD COLUMN profile_image LONGTEXT NULL;
ALTER TABLE events ADD COLUMN poster_image LONGTEXT NULL;
ALTER TABLE events ADD COLUMN venue_image LONGTEXT NULL;
ALTER TABLE bookings ADD COLUMN ticket_type ENUM('general','premium','vip') NOT NULL DEFAULT 'general';
ALTER TABLE bookings ADD COLUMN payment_method ENUM('card','upi','netbanking','wallet') NOT NULL DEFAULT 'upi';