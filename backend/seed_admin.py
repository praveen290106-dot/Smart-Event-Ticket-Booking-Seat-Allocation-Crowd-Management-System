"""
Run once after creating the schema to seed an initial admin account.

Usage:
    python seed_admin.py
"""
from werkzeug.security import generate_password_hash
from db import get_connection

ADMIN_NAME = "System Admin"
ADMIN_EMAIL = "admin@smartevent.local"
ADMIN_PASSWORD = "Admin@123"  # change this after first login

if __name__ == "__main__":
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (ADMIN_EMAIL,))
        if cur.fetchone():
            print("Admin account already exists.")
        else:
            password_hash = generate_password_hash(ADMIN_PASSWORD)
            cur.execute(
                "INSERT INTO users (name, email, password_hash, role) "
                "VALUES (%s, %s, %s, 'admin')",
                (ADMIN_NAME, ADMIN_EMAIL, password_hash),
            )
            print(f"Admin created: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    conn.close()
