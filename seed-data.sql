-- Clear existing data
TRUNCATE TABLE messages, users RESTART IDENTITY CASCADE;

-- Insert users with hashed passwords (using bcrypt hashes)
INSERT INTO users (username, email, password, role, "createdAt", "updatedAt") VALUES
('alice', 'alice@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW()),
('bob', 'bob@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW()),
('charlie', 'charlie@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW()),
('admin', 'admin@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'ADMIN', NOW(), NOW()),
('david', 'david@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW()),
('emma', 'emma@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW()),
('frank', 'frank@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW()),
('grace', 'grace@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW()),
('henry', 'henry@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW()),
('isabel', 'isabel@example.com', '$2a$10$LKxGl8wPPO9xqz6ArMBxheVpHjeFBUVsXf4ObkMmJ8m8ZGmJrpOCa', 'USER', NOW(), NOW());

-- Insert messages
INSERT INTO messages (text, "userId", "createdAt", "updatedAt") VALUES
('Hey everyone! Welcome to Code Talk!', 1, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('Hi Alice! Thanks for setting this up.', 2, NOW() - INTERVAL '7 days' + INTERVAL '5 minutes', NOW() - INTERVAL '7 days' + INTERVAL '5 minutes'),
('This is a great platform for developers to collaborate.', 3, NOW() - INTERVAL '7 days' + INTERVAL '10 minutes', NOW() - INTERVAL '7 days' + INTERVAL '10 minutes'),
('I agree! The real-time features are amazing.', 1, NOW() - INTERVAL '7 days' + INTERVAL '15 minutes', NOW() - INTERVAL '7 days' + INTERVAL '15 minutes'),
('Has anyone tried the collaborative editor yet?', 4, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('Yes! It works great for pair programming.', 5, NOW() - INTERVAL '6 days' + INTERVAL '30 minutes', NOW() - INTERVAL '6 days' + INTERVAL '30 minutes'),
('We should organize a coding session this weekend.', 6, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('Count me in! Saturday afternoon works for me.', 2, NOW() - INTERVAL '5 days' + INTERVAL '2 hours', NOW() - INTERVAL '5 days' + INTERVAL '2 hours'),
('I can help with the GraphQL implementation.', 7, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('That would be awesome, Grace!', 1, NOW() - INTERVAL '4 days' + INTERVAL '1 hour', NOW() - INTERVAL '4 days' + INTERVAL '1 hour'),
('Let me share some useful GraphQL resources.', 7, NOW() - INTERVAL '4 days' + INTERVAL '2 hours', NOW() - INTERVAL '4 days' + INTERVAL '2 hours'),
('Thanks! Looking forward to learning more.', 8, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('Who wants to work on adding emoji support?', 9, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('I can help with that! I have experience with emoji parsing.', 10, NOW() - INTERVAL '2 days' + INTERVAL '3 hours', NOW() - INTERVAL '2 days' + INTERVAL '3 hours'),
('Perfect! Let''s create a feature branch.', 9, NOW() - INTERVAL '2 days' + INTERVAL '4 hours', NOW() - INTERVAL '2 days' + INTERVAL '4 hours'),
('Just pushed some updates to the message resolver.', 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('Great work Charlie! The pagination is much smoother now.', 1, NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
('Anyone experiencing issues with subscriptions?', 5, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
('They seem to be working fine for me.', 6, NOW() - INTERVAL '11 hours', NOW() - INTERVAL '11 hours'),
('Make sure your Redis connection is stable.', 4, NOW() - INTERVAL '10 hours', NOW() - INTERVAL '10 hours'),
('Good tip! That fixed it for me.', 5, NOW() - INTERVAL '9 hours', NOW() - INTERVAL '9 hours'),
('The DataLoader optimization is really paying off!', 2, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
('Definitely! Query performance improved by 60%.', 3, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),
('Should we add rate limiting to the API?', 8, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
('Yes, that''s on our roadmap. Good thinking!', 4, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
('I can work on implementing that next week.', 8, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('Awesome! Let''s discuss the implementation details tomorrow.', 1, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
('Who''s up for a code review session?', 10, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
('I''m available! Let''s do it.', 7, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
('Great! Starting the video call now.', 10, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes');