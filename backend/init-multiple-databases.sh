#!/bin/bash
set -e
set -u

function create_user_and_database() {
    # Get database info from the argument (format: dbname:username:password)
    local db_info=$1
    local database=$(echo "$db_info" | cut -d':' -f1)
    local username=$(echo "$db_info" | cut -d':' -f2)
    local password=$(echo "$db_info" | cut -d':' -f3)

    echo "  Initializing Database: '$database' with User: '$username'..."
    
    # Run SQL commands to create user, database, and grant privileges with SUPERUSER role
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        -- 1. Create a new user with SUPERUSER privileges (for full isolation)
        CREATE USER $username WITH PASSWORD '$password';
        
        -- 2. Create a new database owned by this user
        CREATE DATABASE $database;
        
        -- 3. Grant all privileges on the database to the newly created user
        GRANT ALL PRIVILEGES ON DATABASE $database TO $username;
EOSQL

    # Revoke default PUBLIC privileges to ensure isolation (only the specific user can access)
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" <<-EOSQL
        -- Revoke privileges from the "PUBLIC" role (default everyone has connect permission)
        REVOKE ALL ON SCHEMA public FROM PUBLIC;
        REVOKE CONNECT ON DATABASE $database FROM PUBLIC;
        
        -- Grant privileges to the specific user
        GRANT CONNECT ON DATABASE $database TO $username;
        GRANT ALL ON SCHEMA public TO $username;
EOSQL
    echo "  --> Completed initialization for $database !"
}

if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
    echo "Found request to initialize multiple isolated databases..."
    for db_entry in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database "$db_entry"
    done
    echo "All databases have been initialized and isolated successfully!"
fi