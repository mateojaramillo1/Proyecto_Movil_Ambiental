# Sync API for XAMPP

This folder contains the PHP endpoint and MySQL schema used by the mobile app to synchronize local SQLite data with a MySQL database on the server at `192.168.10.245`.

## Files

- `config.php`: PDO connection and CORS headers.
- `sync.php`: receives JSON payload from the app and upserts records/history.
- `schema.sql`: creates the MySQL database and tables.

## Setup in XAMPP

1. Copy this folder to `htdocs/vinus-api/`.
2. Import `schema.sql` into MySQL.
3. Make sure Apache and MySQL are running in XAMPP.
4. Verify the endpoint from the phone at:
   `http://192.168.10.245/vinus-api/sync.php`

## Notes

- The app keeps working offline because data stays in SQLite first.
- Sync uses `local_id` as the unique key on the server, so repeated uploads update the same row instead of duplicating it.
- If you want the API to accept photos as files later, the endpoint can be extended to receive multipart uploads.
