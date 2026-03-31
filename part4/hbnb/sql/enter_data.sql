-- Insert admin user

INSERT INTO users (
    id,
    first_name,
    last_name,
    email,
    password,
    is_admin,
    created_at,
    updated_at
)
VALUES (
    '36c9050e-ddd3-4c3b-9731-9f487208bbc1',
    'Admin',
    'HBnB',
    'admin@hbnb.io',
    '$2b$12$V6sQvXnU4oHnYzTnYfH0ruu8c4E3Z6sKjKJqP8j9uW4v5gD4NfE3K',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert amenities

INSERT INTO amenities (
    id,
    name,
    created_at,
    updated_at
)
VALUES
(
    'a1b2c3d4-1111-4aaa-bbbb-123456789001',
    'Wi-Fi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'a1b2c3d4-2222-4aaa-bbbb-123456789002',
    'Pool',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'a1b2c3d4-3333-4aaa-bbbb-123456789003',
    'Air Conditioning',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
