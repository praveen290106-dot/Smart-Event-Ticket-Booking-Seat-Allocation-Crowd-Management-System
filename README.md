# Smart Event Ticket Booking, Seat Allocation & Crowd Management System

A full-stack DSA project: **React** frontend, **Python (Flask)** backend, **MySQL** database.

Every module in the project proposal maps to real, working code:

| Module | Data Structure / Algorithm | Where it lives |
|---|---|---|
| 1 — Input / Data Management | Linked List | `backend/dsa/linked_list.py`, used in `routes/bookings.py` (`/my-bookings`) |
| 2 — Data Processing | Stack / Queue | `backend/dsa/stack_ds.py`, `dsa/queue_ds.py`, used for undo and the waiting list |
| 3 — Hierarchical Data | Binary Tree / BST | `backend/dsa/binary_tree.py`, `dsa/bst.py`, used for categories and seat indexing |
| 4 — Graph Processing | BFS / DFS | `backend/dsa/graph.py`, used for nearest-exit and zone-reachability checks |
| 5 — Searching & Sorting | Binary Search + Quick Sort | `backend/dsa/searching.py`, `dsa/sorting.py`, used for event ranking and lookup |
| 6 — Algorithmic Problem Solving | Backtracking | `backend/dsa/backtracking.py`, used for group contiguous-seat search |

---

## Project structure

```
smart-event-booking/
├── backend/                 Python Flask API
│   ├── app.py                Main entry point
│   ├── config.py             Environment-based config
│   ├── db.py                 MySQL connection helper
│   ├── schema.sql             Database schema
│   ├── seed_admin.py         One-time script to create the first admin account
│   ├── requirements.txt
│   ├── .env.example
│   ├── dsa/                  All required data structures & algorithms
│   └── routes/                REST API endpoints, grouped by feature
└── frontend/                 React app
    ├── package.json
    ├── public/
    └── src/
        ├── pages/             One file per screen
        ├── components/        Navbar, ProtectedRoute
        ├── styles/index.css   Global stylesheet
        ├── api.js             Axios client
        └── AuthContext.js     Login/session state
```

---

## 1. Set up MySQL

1. Install MySQL 8 if you don't already have it.
2. Create the database and tables:
   ```bash
   mysql -u root -p < backend/schema.sql
   ```
   This creates a `smart_event_booking` database with `users`, `events`, `seats`, `bookings`, and `waiting_list` tables.

## 2. Run the backend (Python + Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then edit .env with your MySQL password
# on macOS/Linux you can export the vars instead of using a .env loader:
export MYSQL_HOST=localhost
export MYSQL_USER=root
export MYSQL_PASSWORD=your_mysql_password
export MYSQL_DB=smart_event_booking
export JWT_SECRET_KEY=some-random-string

python seed_admin.py            # creates admin@smartevent.local / Admin@123
python app.py                   # starts on http://localhost:5000
```

Confirm it's running: `curl http://localhost:5000/api/health` should return `{"status": "ok", ...}`.

> The `.env.example` values are read by `config.py` via `os.environ`. If you'd rather not export variables manually, install `python-dotenv` (already in requirements.txt) and add `from dotenv import load_dotenv; load_dotenv()` to the top of `app.py`.

## 3. Run the frontend (React)

```bash
cd frontend
npm install
cp .env.example .env             # points the app at http://localhost:5000/api
npm start                        # starts on http://localhost:3000
```

## 4. Try it out

1. Open `http://localhost:3000`, click **Sign up**, and create an **Organizer** account.
2. Log in as the organizer and create an event (this generates the seat map).
3. Log out, sign up again as a regular **Attendee**, and book seats:
   - Enter `1` seat to see the nearest-seat placement.
   - Enter `4+` seats to trigger **Backtracking** — watch it find a contiguous block.
4. Go to **My Bookings** to see the Linked-List-backed history, cancel a booking, and try **Undo last action** (Stack).
5. Visit **Venue & Crowd** to run BFS (nearest exit) and DFS (zone reachability) on the venue graph, and see live crowd-density bars.
6. Visit **Complexity** for the time/space comparison table.
7. Log in with `admin@smartevent.local` / `Admin@123` to approve/reject events from the **Admin** dashboard.

---

## Notes for evaluation

- The **undo Stack** is held in server memory per user (it resets if the Flask process restarts) — this keeps the demo simple while still exercising real push/pop operations on live booking data. Swap in a database-backed stack table if you need it to persist across restarts.
- The **venue graph** is a fixed demo layout in `dsa/graph.py` (`build_demo_venue()`); edit the edge list there to model a different venue.
- All core data (users, events, seats, bookings, waiting list) is persisted in **MySQL** — only the undo stack is in-memory.
- CORS is open for local development. Restrict `CORS(app)` in `app.py` before deploying anywhere public, and set a strong `JWT_SECRET_KEY`.
