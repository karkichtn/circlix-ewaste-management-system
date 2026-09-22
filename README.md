# E-Waste Collection & Recycling Pickup System

## Problem Statement

Build a web application that allows households and offices to schedule e-waste pickups and allows collection agents and administrators/recyclers to manage the collection and recycling process.

## Mandatory Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- EJS

## User Roles

### Citizen
- Register/login
- Create pickup request
- Enter item category, quantity, approximate weight, address and preferred date
- Track pickup status
- View reward wallet

### Collection Agent
- Login
- View assigned pickups
- Update status:
  `Scheduled -> Collected -> Recycled`

### Admin/Recycler
- Login
- Approve pickup requests
- Assign collection agents
- Maintain collection centres
- Maintain e-waste category catalogue and reward points
- View dashboard with total requests, recycled weight, category-wise and area-wise breakdown

## Reward Wallet

When an assigned pickup reaches `Recycled`, reward points are automatically calculated:

`approximate weight × category reward points per kg`

A reward transaction is stored for the citizen.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy `.env.example` to `.env` and set:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_secret
```

### 3. Seed initial data

```bash
npm run seed
```

Seeded accounts:

**Admin**
- Email: `admin@ewaste.com`
- Password: `Admin@123`

**Agent**
- Email: `agent@ewaste.com`
- Password: `Agent@123`

Change/remove these credentials before real production use.

### 4. Start

```bash
npm start
```

Open:

`http://localhost:3000`

## Main Flow

1. Citizen registers.
2. Citizen creates an e-waste pickup request.
3. Admin approves it, changing status to `Scheduled`.
4. Admin assigns a collection agent.
5. Agent marks it `Collected`.
6. Agent marks it `Recycled`.
7. Reward points are credited to the citizen.
8. Admin dashboard updates recycled-weight and breakdown statistics.


