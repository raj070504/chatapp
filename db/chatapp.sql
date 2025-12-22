-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 22, 2025 at 03:23 PM
-- Server version: 10.11.13-MariaDB-0ubuntu0.24.04.1
-- PHP Version: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `chatapp`
--

-- --------------------------------------------------------

--
-- Table structure for table `chats`
--

CREATE TABLE `chats` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `participant_id` int(11) NOT NULL,
  `last_message_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chats_room`
--

CREATE TABLE `chats_room` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `is_group` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chats_room`
--

INSERT INTO `chats_room` (`id`, `name`, `is_group`, `created_at`) VALUES
(1, 'raj', 1, '2025-08-09 14:11:54'),
(2, 'xyz', 0, '2025-08-10 02:11:50'),
(3, 'abc', 0, '2025-08-10 02:12:06'),
(4, 'testt', 0, '2025-08-10 04:09:10'),
(5, NULL, 0, '2025-08-10 08:30:13'),
(6, 'abc', 1, '2025-08-11 15:09:02');

-- --------------------------------------------------------

--
-- Table structure for table `chat_participants`
--

CREATE TABLE `chat_participants` (
  `id` int(11) NOT NULL,
  `chat_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_participants`
--

INSERT INTO `chat_participants` (`id`, `chat_id`, `user_id`, `joined_at`) VALUES
(1, 1, 10, '2025-08-09 14:11:54'),
(2, 1, 8, '2025-08-09 14:11:54'),
(3, 1, 9, '2025-08-09 14:11:54'),
(4, 2, 5, '2025-08-10 02:11:50'),
(5, 2, 8, '2025-08-10 02:11:50'),
(6, 3, 5, '2025-08-10 02:12:06'),
(7, 3, 8, '2025-08-10 02:12:06'),
(8, 4, 5, '2025-08-10 04:09:10'),
(9, 4, 10, '2025-08-10 04:09:10'),
(10, 5, 12, '2025-08-10 08:30:13'),
(11, 5, 11, '2025-08-10 08:30:13'),
(12, 6, 11, '2025-08-11 15:09:02'),
(13, 6, 4, '2025-08-11 15:09:02'),
(14, 6, 6, '2025-08-11 15:09:02');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `chat_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `chat_id`, `sender_id`, `content`, `timestamp`, `user_id`, `created_at`) VALUES
(7, 3, 5, 'hi', '2025-08-10 04:07:25', 0, '0000-00-00 00:00:00'),
(8, 2, 5, 'hiiii', '2025-08-10 04:07:37', 0, '0000-00-00 00:00:00'),
(9, 4, 7, 'hi', '2025-08-10 04:09:22', 0, '0000-00-00 00:00:00'),
(10, 4, 7, 'hii', '2025-08-10 04:09:31', 0, '0000-00-00 00:00:00'),
(11, 4, 7, 'hii', '2025-08-10 04:09:32', 0, '0000-00-00 00:00:00'),
(12, 4, 7, 'hhhhhhhhhhhh', '2025-08-10 04:09:33', 0, '0000-00-00 00:00:00'),
(13, 4, 7, 'hi i am', '2025-08-10 04:11:04', 0, '0000-00-00 00:00:00'),
(14, 4, 7, '7', '2025-08-10 04:11:13', 0, '0000-00-00 00:00:00'),
(15, 3, 5, 'hiii', '2025-08-10 04:11:23', 0, '0000-00-00 00:00:00'),
(16, 3, 5, 'hiiii', '2025-08-10 04:13:09', 0, '0000-00-00 00:00:00'),
(17, 3, 5, 'hiiii', '2025-08-10 04:13:54', 0, '0000-00-00 00:00:00'),
(18, 3, 5, 'i am 3', '2025-08-10 04:14:00', 0, '0000-00-00 00:00:00'),
(19, 3, 5, 'i am 4', '2025-08-10 04:14:21', 0, '0000-00-00 00:00:00'),
(20, 2, 5, 'he;llo', '2025-08-10 04:14:51', 0, '0000-00-00 00:00:00'),
(21, 2, 5, 'wlow', '2025-08-10 04:15:01', 0, '0000-00-00 00:00:00'),
(22, 3, 5, 'not wow', '2025-08-10 04:15:09', 0, '0000-00-00 00:00:00'),
(23, 3, 5, 'hhhh', '2025-08-10 04:15:49', 0, '0000-00-00 00:00:00'),
(24, 3, 5, 'ssssssssssssssssssssssssss', '2025-08-10 04:15:53', 0, '0000-00-00 00:00:00'),
(25, 4, 5, 'hiiiii', '2025-08-10 04:33:26', 0, '0000-00-00 00:00:00'),
(26, 4, 10, 'hiiii', '2025-08-10 04:33:31', 0, '0000-00-00 00:00:00'),
(27, 4, 5, 'kyaa huaa?', '2025-08-10 04:33:40', 0, '0000-00-00 00:00:00'),
(28, 4, 10, 'p', '2025-08-10 04:33:44', 0, '0000-00-00 00:00:00'),
(29, 4, 5, 'hi', '2025-08-10 04:51:19', 0, '0000-00-00 00:00:00'),
(30, 4, 10, 'hiii', '2025-08-10 04:51:23', 0, '0000-00-00 00:00:00'),
(31, 4, 10, 'ghiii', '2025-08-10 04:52:23', 0, '0000-00-00 00:00:00'),
(32, 4, 5, 'hello', '2025-08-10 04:52:28', 0, '0000-00-00 00:00:00'),
(33, 5, 12, 'hi', '2025-08-10 08:30:29', 0, '0000-00-00 00:00:00'),
(34, 5, 11, 'who re you?', '2025-08-10 08:31:43', 0, '0000-00-00 00:00:00'),
(36, 5, 11, 'hii', '2025-08-10 09:50:54', 0, '0000-00-00 00:00:00'),
(37, 5, 11, 'yess', '2025-08-10 09:51:12', 0, '0000-00-00 00:00:00'),
(38, 5, 12, 'nooo', '2025-08-10 09:51:23', 0, '0000-00-00 00:00:00'),
(39, 5, 11, 'p', '2025-08-10 09:51:29', 0, '0000-00-00 00:00:00'),
(40, 5, 12, 'hii', '2025-08-10 11:46:28', 0, '0000-00-00 00:00:00'),
(41, 5, 11, 'hii', '2025-08-10 11:46:42', 0, '0000-00-00 00:00:00'),
(42, 5, 12, 'hi', '2025-08-10 12:33:22', 0, '0000-00-00 00:00:00'),
(43, 5, 11, 'hii', '2025-08-10 12:33:28', 0, '0000-00-00 00:00:00'),
(44, 5, 11, 'hi', '2025-08-10 13:38:00', 0, '0000-00-00 00:00:00'),
(45, 5, 12, 'helloo', '2025-08-10 13:38:07', 0, '0000-00-00 00:00:00'),
(46, 5, 11, 'hii', '2025-08-11 14:18:53', 0, '0000-00-00 00:00:00'),
(47, 5, 11, 'hi', '2025-08-11 14:40:33', NULL, '2025-08-11 20:10:33'),
(48, 5, 11, 'hiii', '2025-08-11 14:41:01', NULL, '2025-08-11 20:11:01'),
(49, 5, 11, 'hi', '2025-08-11 14:44:05', NULL, '2025-08-11 20:14:05'),
(50, 5, 11, '', '2025-08-11 15:06:37', NULL, '2025-08-11 20:36:37'),
(51, 5, 11, 'hi', '2025-08-11 15:07:16', NULL, '2025-08-11 20:37:16'),
(52, 6, 11, 'hi', '2025-08-11 15:09:12', NULL, '2025-08-11 20:39:12'),
(53, 5, 11, 'hi', '2025-08-16 15:12:06', NULL, '2025-08-16 20:42:06'),
(54, 5, 11, 'hi', '2025-08-18 12:32:39', NULL, '2025-08-18 18:02:39'),
(55, 5, 11, 'hi', '2025-08-20 12:30:29', NULL, '2025-08-20 18:00:29');

-- --------------------------------------------------------

--
-- Table structure for table `message_attachments`
--

CREATE TABLE `message_attachments` (
  `id` int(11) NOT NULL,
  `message_id` int(11) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `message_attachments`
--

INSERT INTO `message_attachments` (`id`, `message_id`, `file_name`, `original_name`, `file_size`, `file_type`, `created_at`) VALUES
(1, 49, 'file-1754923445050-69664119.pdf', 'UPVNS00531930000000025_2024.pdf', 155674, 'application/pdf', '2025-08-11 14:44:05'),
(2, 50, 'file-1754924797945-282183078.png', 'image (46).png', 909924, 'image/png', '2025-08-11 15:06:37');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `photo` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `name`, `phone`, `photo`, `created_at`) VALUES
(4, 'raaj@gmail.com', 'rss', NULL, '/image.png', '2025-08-09 11:32:54'),
(5, 'raj@gmail.com', 'rajj', 'rah', '/image.png', '2025-08-09 11:32:54'),
(6, 'raj@g.c', 'raaj\n', NULL, '/image.png', '2025-08-09 11:33:14'),
(7, 'rah@g.c', 'raaaj', '1232', '/image.png', '2025-08-09 11:41:24'),
(8, 'rajj@g.c', 'raj', '1234', '/image.png', '2025-08-09 12:03:45'),
(9, 'raaj@h.c', 'raj', '124', '/image.png', '2025-08-09 18:28:43'),
(10, 'raj@gmaiil.com', 'raj singh', '12345', '/image.png', '2025-08-09 19:36:46'),
(11, 'rajsingh752000@gmail.com', 'raj singh', '12345', '1754828836051.png', '2025-08-10 13:51:38'),
(12, 'rajsingh752004@gmail.com', 'Sonali singh', '1234567890', '1754828856885.jpg', '2025-08-10 13:51:58'),
(13, 'sirtarunrupani@gmail.com', 'raj', 's', NULL, '2025-08-20 18:00:45');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `participant_id` (`participant_id`);

--
-- Indexes for table `chats_room`
--
ALTER TABLE `chats_room`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chat_participants`
--
ALTER TABLE `chat_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_chat_user` (`chat_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `chat_id` (`chat_id`),
  ADD KEY `sender_id` (`sender_id`);

--
-- Indexes for table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `message_id` (`message_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chats`
--
ALTER TABLE `chats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chats_room`
--
ALTER TABLE `chats_room`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `chat_participants`
--
ALTER TABLE `chat_participants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `message_attachments`
--
ALTER TABLE `message_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chats`
--
ALTER TABLE `chats`
  ADD CONSTRAINT `chats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `chats_ibfk_2` FOREIGN KEY (`participant_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `chat_participants`
--
ALTER TABLE `chat_participants`
  ADD CONSTRAINT `chat_participants_ibfk_1` FOREIGN KEY (`chat_id`) REFERENCES `chats_room` (`id`),
  ADD CONSTRAINT `chat_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD CONSTRAINT `message_attachments_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
