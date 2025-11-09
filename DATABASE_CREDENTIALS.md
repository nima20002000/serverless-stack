# Database Credentials

**IMPORTANT**: This file is for development only. Never commit this to version control!

## PostgreSQL Database

- **Database Name**: `kitia`
- **Username**: `kitia_user`
- **Password**: `kitia_password`
- **Host**: `localhost`
- **Port**: `5432`

## Connection String

```
postgresql://kitia_user:kitia_password@localhost:5432/kitia?schema=public
```

---

## Application Users (Seeded)

### Admin Account
- **Email**: `admin@kitia.com`
- **Password**: `Admin123!`
- **Role**: ADMIN

### Test User 1
- **Email**: `user1@test.com`
- **Password**: `password123`
- **Role**: USER
- **Promo Code**: Active (WELCOME-TEST1)

### Test User 2
- **Email**: `user2@test.com`
- **Password**: `password123`
- **Role**: USER
- **Promo Code**: Used (expired)

## Useful Commands

### Access Database
```bash
psql -U kitia_user -d kitia -h localhost
# Password: kitia_password
```

### As Postgres Super User
```bash
sudo -u postgres psql
```

### Connect to Kitia Database
```bash
sudo -u postgres psql -d kitia
```

### Prisma Studio (GUI)
```bash
npx prisma studio
```

## Database Management

### View All Tables
```bash
sudo -u postgres psql -d kitia -c "\dt"
```

### Backup Database
```bash
pg_dump -U kitia_user -h localhost kitia > backup.sql
```

### Restore Database
```bash
psql -U kitia_user -h localhost kitia < backup.sql
```

### Reset Database (Development Only)
```bash
npx prisma migrate reset
```

## Notes

- Database user has `CREATEDB` privilege for Prisma migrations
- The connection string is stored in `.env` file
- Prisma generates a shadow database for migrations automatically
