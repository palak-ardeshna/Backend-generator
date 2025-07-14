# Basic API with MySQL and Automatic User Creation

This is a basic Express.js API that uses MySQL database and automatically creates a default admin user when the server starts.

## Setup

1. Create a `.env` file in the root of the backend directory with the following content:

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=testdb
```

2. Make sure MySQL is installed and running on your system.

3. Create a database named `testdb` (or whatever you specified in your .env file).

4. Install dependencies:
```
npm install
```

5. Start the server:
```
npm run dev
```

## Features

- Express.js API with MySQL database using Sequelize ORM
- Automatic database connection and table creation
- Default admin user created on server start
- CRUD operations for users
- API endpoints for user management

## API Endpoints

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Default Admin User

When the server starts, it automatically creates a default admin user with the following credentials:

- Username: admin
- Email: admin@example.com
- Password: admin123
- isAdmin: true

This user is only created if it doesn't already exist in the database. 