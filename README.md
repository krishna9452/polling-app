# Real-Time Polling Application

A full-stack real-time polling application built with Node.js, Express, PostgreSQL, Prisma ORM, and WebSockets.

## 🚀 Features

- **User Authentication**: JWT-based registration and login
- **Poll Management**: Create, read, update, and delete polls
- **Real-time Voting**: Live vote updates via WebSockets
- **Modern UI**: Responsive design with glassmorphism effects
- **PostgreSQL Database**: Robust data storage with Prisma ORM

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSockets (ws library)
- **Authentication**: JWT tokens
- **Frontend**: Vanilla JavaScript with modern CSS
- **Password Hashing**: bcryptjs

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/polling-app.git
   cd polling-app
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Set up PostgreSQL
  a.) Install PostgreSQL
  b.) Create database and user:
```sql
CREATE DATABASE pollingapp;
CREATE USER pollinguser WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE pollingapp TO pollinguser;
```
4. Environment Configuration
   ```bash
   cp .env.example .env
   ```
   Edit .env with your database credentials:
   ```text
   DATABASE_URL="postgresql://pollinguser:password123@localhost:5432/pollingapp"
   JWT_SECRET="your-super-secret-jwt-key"
   PORT=3000
   ```
5. Database Setup
   ```bash
   npx prisma generate
   npx prisma db push
   ```
6. Start the application
   ```bash
   npm run dev
   ```
7. Using Prisma Studio (access database )
   ```bash
   npx prisma studio
   ```
   run this in other terminal
   
🚀 Usage
1.Access the application: http://localhost:3000/app

2.Register a new user

3.Create polls with multiple options

4.Vote on polls and watch real-time updates

5.View results with live progress bars
