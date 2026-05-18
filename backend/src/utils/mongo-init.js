// This runs once when the mongo container is first created.
// Creates the 'pragati' database and a read-write user.
db = db.getSiblingDB('pragati');
db.createCollection('users');
print('PRAGATI database initialized');
