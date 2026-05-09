-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 02, 2025 at 04:02 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `webphim_lau`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` varchar(255) NOT NULL,
  `status` int(11) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `position` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `title`, `description`, `status`, `slug`, `position`) VALUES
(4, 'Phim người lớn', 'Phim người lớn', 1, 'phim-nguoi-lon', 1),
(5, 'Phim Chiếu rạp', 'Phim Chieu rap cap nhap moi nhat', 1, 'phim-chieu-rap', 2),
(7, 'Phim Kinh dị', 'Phim Kinh dị', 1, 'phim-kinh-di', NULL),
(8, 'Phim Bộ', 'Phim Bộ', 1, 'phim-bo', NULL),
(9, 'Phim lẻ', 'Phim lẻ', 1, 'phim-le', NULL),
(10, 'Phim vũ trang', 'Phim vũ trang', 1, 'phim-vu-trang', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `countries`
--

CREATE TABLE `countries` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` varchar(255) NOT NULL,
  `status` int(11) NOT NULL,
  `slug` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `countries`
--

INSERT INTO `countries` (`id`, `title`, `description`, `status`, `slug`) VALUES
(1, 'Việt Nam', 'Viet nam', 1, 'viet-nam'),
(2, 'Mỹ', 'My tho', 1, 'my'),
(3, 'Hàn Quốc', 'duy non', 1, 'han-quoc'),
(4, 'Nhật Bản', 'Phim japan', 1, 'nhat-ban');

-- --------------------------------------------------------

--
-- Table structure for table `episodes`
--

CREATE TABLE `episodes` (
  `id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `linkphim` longtext NOT NULL,
  `episode` varchar(255) NOT NULL,
  `updated_at` varchar(50) NOT NULL,
  `created_at` varchar(50) NOT NULL,
  `server` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `episodes`
--

INSERT INTO `episodes` (`id`, `movie_id`, `linkphim`, `episode`, `updated_at`, `created_at`, `server`) VALUES
(12, 20, '<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/zEWSSod0zTY?si=GKkmDUgT-B_hEhHl\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>', 'Cam', '2025-03-30 06:48:01', '2025-03-30 06:48:01', 0),
(15, 15, '<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/h52PcEuzUUA?si=SWIb0Q7-HMPH5-Ur\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>', '1', '2025-03-30 14:32:21', '2025-03-30 14:32:21', 0),
(18, 21, '<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/h52PcEuzUUA?si=ylCvK1a_V2hVgkVw\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>', '1', '2025-03-30 21:25:58', '2025-03-30 21:25:58', 0),
(19, 21, '<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/h52PcEuzUUA?si=ylCvK1a_V2hVgkVw\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>', '2', '2025-03-30 21:26:03', '2025-03-30 21:26:03', 0),
(20, 21, '<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/h52PcEuzUUA?si=ylCvK1a_V2hVgkVw\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>', '3', '2025-03-30 21:26:08', '2025-03-30 21:26:08', 0),
(21, 21, '<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/h52PcEuzUUA?si=ylCvK1a_V2hVgkVw\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>', '4', '2025-03-30 21:26:16', '2025-03-30 21:26:16', 0),
(22, 22, '<p><iframe allowfullscreen frameborder=\"0\" height=\"360\" scrolling=\"0\" src=\"https://vip.opstream11.com/share/c2383e4dca61bf3b6f174ba5df1172b0\" width=\"100%\"></iframe> </p>', '1', '2025-04-02 18:23:06', '2025-04-02 18:23:06', 1),
(24, 23, '<p><iframe allowfullscreen frameborder=\"0\" height=\"360\" scrolling=\"0\" src=\"https://vip.opstream12.com/share/75397798de3928330feff52e286c9812\" width=\"100%\"></iframe></p>', '1', '2025-04-02 20:48:18', '2025-04-02 20:48:18', 1),
(25, 23, '<p><iframe allowfullscreen frameborder=\"0\" height=\"360\" scrolling=\"0\" src=\"https://vip.opstream12.com/share/cf1974d028f1a6ad6378cdc9539853b3\" width=\"100%\"></iframe></p>', '2', '2025-04-02 20:48:57', '2025-04-02 20:48:57', 1),
(26, 24, '<p><iframe allowfullscreen frameborder=\"0\" height=\"360\" scrolling=\"0\" src=\"https://vip.opstream16.com/share/7baa3894c1163d4ecd5acc9b4cda2c4a\" width=\"100%\"></iframe></p>', '1', '2025-04-02 20:58:48', '2025-04-02 20:58:48', 1);

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `genres`
--

CREATE TABLE `genres` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` longtext NOT NULL,
  `status` int(11) NOT NULL,
  `slug` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `genres`
--

INSERT INTO `genres` (`id`, `title`, `description`, `status`, `slug`) VALUES
(1, 'Hanh dong', 'Hanh dong cap nhap xxx', 1, 'hanh-dong'),
(2, 'Kinh di', 'Kinh di', 1, 'kinh-di'),
(3, 'bien thai', 'bien thai', 1, 'bien-thai'),
(5, 'Trinh tham', 'Trinh tham', 1, 'trinh-tham'),
(6, 'Võ Thuật', 'Võ Thuật', 1, 'vo-thuat'),
(7, 'Hài Hước', 'Hài Hước', 1, 'hai-huoc');

-- --------------------------------------------------------

--
-- Table structure for table `info`
--

CREATE TABLE `info` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `logo` varchar(100) NOT NULL,
  `copyright` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `info`
--

INSERT INTO `info` (`id`, `title`, `description`, `logo`, `copyright`) VALUES
(1, 'Phim hay 2025', 'Phim hay 2025 , cập nhập 24/24', 'logo9704.png', 'Copyright © 2025 By Team 22');

-- --------------------------------------------------------

--
-- Table structure for table `linkmovies`
--

CREATE TABLE `linkmovies` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` varchar(255) NOT NULL,
  `status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `linkmovies`
--

INSERT INTO `linkmovies` (`id`, `title`, `description`, `status`) VALUES
(1, 'LINK VIP NHÓM 22', 'LINK VIP NHÓM 22', 1),
(2, 'LINK CHO THẦY HÙNG MÃI ĐỈNH', 'LINK CHO THẦY HÙNG MÃI ĐỈNH', 1);

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2014_10_12_000000_create_users_table', 1),
(2, '2014_10_12_100000_create_password_resets_table', 1),
(3, '2019_08_19_000000_create_failed_jobs_table', 1),
(4, '2019_12_14_000001_create_personal_access_tokens_table', 1);

-- --------------------------------------------------------

--
-- Table structure for table `movies`
--

CREATE TABLE `movies` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `thoiluong` varchar(50) DEFAULT NULL,
  `slug` varchar(255) NOT NULL,
  `description` longtext NOT NULL,
  `status` int(11) NOT NULL,
  `image` varchar(255) NOT NULL,
  `category_id` int(11) NOT NULL,
  `thuocphim` varchar(10) NOT NULL,
  `genre_id` int(11) NOT NULL,
  `country_id` int(11) NOT NULL,
  `phim_hot` int(11) NOT NULL,
  `resolution` int(11) NOT NULL DEFAULT 0,
  `name_eng` varchar(255) NOT NULL,
  `phude` int(11) NOT NULL DEFAULT 0,
  `season` varchar(50) DEFAULT '0',
  `ngaytao` varchar(50) DEFAULT NULL,
  `ngaycapnhap` varchar(50) DEFAULT NULL,
  `year` varchar(20) DEFAULT NULL,
  `tags` text DEFAULT NULL,
  `topview` int(11) DEFAULT NULL,
  `trailer` varchar(100) DEFAULT NULL,
  `sotap` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `movies`
--

INSERT INTO `movies` (`id`, `title`, `thoiluong`, `slug`, `description`, `status`, `image`, `category_id`, `thuocphim`, `genre_id`, `country_id`, `phim_hot`, `resolution`, `name_eng`, `phude`, `season`, `ngaytao`, `ngaycapnhap`, `year`, `tags`, `topview`, `trailer`, `sotap`) VALUES
(5, 'Luyện Ngải: Cô Hồn Dã Quỷ', '', 'luyen-ngai-co-hon-da-quy', 'Xem phim Luyện Ngải: Cô Hồn Dã Quỷ có phụ đề tiếng việt trên chillphim.top. Bạn cũng có thể tải xuống Luyện Ngải: Cô Hồn Dã Quỷ vietsub miễn phí, đừng quên xem phát trực tuyến với nhiều chất lượng khác nhau 720P 360P 240P 480P (nếu có) tùy theo đường truyền của bạn để tiết kiệm dung lượng internet. Hãy chia sẻ Luyện Ngải: Cô Hồn Dã Quỷ trên chillphim.top tới mọi người để cùng thưởng thức nhé.', 0, 'testphim5312.jpg', 5, '', 2, 4, 1, 0, 'lamb', 1, '0', '', '', NULL, NULL, NULL, NULL, 1),
(6, 'Luyện Ngải: Cô Hồn Dã Quỷ', '', 'luyen-ngai-co-hon-da-quy', 'Luyện Ngải: Cô Hồn Dã Quỷ', 1, 'testphim7040.jpg', 5, '', 2, 4, 1, 0, 'lamp', 0, '0', '', '', NULL, NULL, NULL, NULL, 1),
(7, 'Điệp Vụ Thanh Xuân', '', 'diep-vu-thanh-xuan', 'Luyện Ngải: Cô Hồn Dã Quỷ', 1, 'testphim6736.jpg', 4, '', 1, 1, 1, 0, 'lamp', 0, '0', '', '', NULL, NULL, 0, NULL, 1),
(8, 'Điệp Vụ Thanh Xuân', '', 'diep-vu-thanh-xuan', 'Điệp Vụ Thanh Xuân', 1, 'testphim1502.jpg', 3, '', 1, 1, 1, 0, 'lamp', 0, '0', '', '', NULL, NULL, NULL, NULL, 1),
(9, 'Điệp Vụ Thanh Xuân', '', 'diep-vu-thanh-xuan', 'Điệp Vụ Thanh Xuân', 1, 'testphim551.jpg', 3, '', 1, 1, 0, 0, '', 0, '0', '', '', NULL, NULL, NULL, NULL, 1),
(12, 'Điệp Vụ Thanh Xuân', '', 'diep-vu-thanh-xuan', 'Điệp Vụ Thanh Xuân', 1, 'testphim798.jpg', 3, '', 3, 1, 1, 0, 'lamb', 0, NULL, '', '', NULL, NULL, 0, NULL, 1),
(14, 'Bậc thầy kẹo bạc và hắc tinh linh', '', 'bac-thay-keo-bac-va-hac-tinh-linh', 'Sau khi mẹ cô qua đời, Ann quyết định trở thành Silver Sugar Master giống như mẹ cô. Ann rời đến thị trấn Lewiston, và để trở thành Silver Sugar Master, cô ấy phải giành được vị trí cao nhất và nhận được huy chương hoàng gia. Ở thế giới này, con người coi các nàng tiên như nô lệ và lấy một bên cánh của họ để điều khiển họ. Ann miễn cưỡng mua một nàng tiên tên là Shall để làm vệ sĩ trên đường đến Lewiston. Ann bị giằng xé giữa việc giải thoát cho Shall và cần vệ sĩ trên những con đường nguy hiểm đến lễ hội.', 0, 'bacthaybukeo2232.jpg', 4, '', 3, 4, 1, 4, 'Sugar Apple Fairy Tale', 0, '0', '', '2025-03-25 21:37:06', '2025', NULL, 2, NULL, 1),
(15, 'Cắt qua thời gian', '150 phút', 'cat-qua-thoi-gian', 'Một thiếu nữ năm 2024 vô tình du hành thời gian về năm 2003, vài ngày trước khi tên sát nhân đeo mặt nạ sát hại chị cô. Liệu cô có thể thay đổi quá khứ mà không phá hủy tương lai?', 1, 'hinhanhzz7323.png', 4, 'phimbo', 7, 4, 1, 0, 'Time Cut', 1, '5', '', '2025-03-29 18:13:27', '2025', 'phim Kẻ Săn Người phim Hitman', 0, NULL, 1),
(16, 'Kẻ Săn Người', '105 phút', 'ke-san-nguoi', 'Hitman mô tả về các hoạt động ám sát của sát thủ mang biệt danh 47 - kẻ “được huấn luyện trở thành một sát thủ chuyên nghiệp đánh thuê, với vũ khí mạnh nhất là thần kinh thép và niềm tin - lòng tự hào tuyệt đối vào nghiệp ám sát của bản thân. Cái tên 47 bắt nguồn từ hai chữ số cuối cùng trên dãy mã vạch được xăm vào sau gáy của anh”. Kẻ đi săn mang tên 47 trở thành đối tượng bị săn đuổi trên khắp Đông Âu bởi cả Interpol lẫn quân đội Nga sau khi bị phát hiện dính líu vào một cuộc binh biến chính trị. 47 giờ đây phải tìm cách chạy trốn, đồng thời tìm hiểu kẻ giật dây đạo diễn toàn bộ sự việc, và lý do chúng làm điều đó. Nhưng mối nguy lớn nhất đối với tính mạng của 47 không phải là các hành động của anh, mà là một cô gái xinh đẹp...', 1, 'ke-san-nguoi-thumb84965570.avif', 4, 'phimbo', 5, 4, 1, 5, 'Hitman', 0, '5', '2025-03-25 22:57:43', '2025-03-29 16:56:46', '2022', 'phim Kẻ Săn Người phim Hitman', 0, 'R6KFc533NdE', 1),
(19, 'Ma Sói', '95 Phút', 'ma-soi', 'After discovering a mysterious card game, a family is thrust back in time to a medieval village where they must fend off dangerous werewolves each night.', 1, 'ma-soi-2024-thumb5157.jpg', 5, 'phimle', 5, 4, 1, 5, 'Family Pack', 0, '2', '2025-03-29 16:44:08', '2025-04-01 02:46:25', '2025', 'Ma Sói ma-soi-2024', 0, 'a6PEBTtqUp8', 1),
(20, 'Vụ không tặc 1993', '86 Phút', 'vu-khong-tac-1993', 'Trong nỗ lực lật đổ chính phủ được quân đội hậu thuẫn, bốn người đàn ông cướp một chiếc máy bay, thao túng hành khách trên máy bay nhân danh thay đổi xã hội.', 1, 'vu-khong-tac-1993-thumb61766569.avif', 6, 'phimle', 5, 2, 1, 4, 'Hijack \'93', 0, '0', '2025-03-29 16:58:16', '2025-03-29 20:01:47', '2025', 'phim Vụ không tặc 1993 phim Hijack \'93', 0, NULL, 5),
(21, 'Chiếc lồng', '65 phút/tập', 'chiec-long', 'Ôm mộng võ sĩ chuyên nghiệp, võ sĩ trẻ nọ chật vật thu hút sự chú ý cho đến khi một trận đấu bất ngờ mang đến cho anh cơ hội nổi tiếng và một đối thủ tàn bạo trong lồng sắt.', 1, 'chiec-long-2024-thumb1466.jpg', 5, 'phimbo', 5, 1, 1, 4, 'The Cage', 0, '2', '2025-03-29 17:55:46', '2025-03-30 21:43:20', '2024', 'Ôm mộng võ sĩ chuyên nghiệp, võ sĩ trẻ nọ chật vật thu hút sự chú ý cho đến khi một trận đấu bất ngờ mang đến cho anh cơ hội nổi tiếng và một đối thủ tàn bạo trong lồng sắt.', NULL, NULL, 8),
(22, 'Thăng Cấp Một Mình', '23 phút/tập', 'thang-cap-mot-minh', 'Thợ săn hạng E Jinwoo Sung là người yếu nhất trong số họ. Bị mọi người coi thường, anh ta không có tiền, không có khả năng nói và không có triển vọng công việc nào khác. Vì vậy, khi nhóm của anh ấy tìm thấy một hầm ngục ẩn giấu, anh ấy quyết tâm sử dụng cơ hội này để thay đổi cuộc sống của mình tốt hơn... nhưng cơ hội mà anh ấy tìm thấy hơi khác so với những gì anh ấy nghĩ trong đầu!', 1, 'thang-cap-mot-minh-thumb5385.avif', 8, 'phimbo', 7, 4, 1, 4, 'Chỉ mình tôi thăng cấp, Solo Leveling', 0, '1', '2025-04-02 18:20:03', '2025-04-02 18:20:03', '2025', 'Chỉ mình tôi thăng cấp, Solo Leveling', 0, 'LrNvF8gcJPM', 12),
(23, 'Siêu Năng Lập Phương (Phần 1)', '15 phút/tập', 'sieu-nang-lap-phuong-phan-1', 'In an accident, an ordinary boy, Wang Xiaoxiu, obtains a space system called \"Superpower Cube\" from a high-latitude cosmic civilization and gains extraordinary powers. When the school belle, Shen Yao, Wang Xiaoxiu’s longtime crush, confesses her love to him, the delinquent Sun Jun, who also has a crush on her, is provoked. Wang Xiaoxiu resolves the crisis with his wit and extraordinary powers, but it also brings more disasters as a result. Shen Yao is taken to the world of extraordinary beings by a mysterious person, and Wang Xiaoxiu embarks on a journey to rescue her. Fighting in the bizarre universe, he finds the meaning of fairness and justice on the path to becoming a peerless powerhouse.', 1, 'sieu-nang-lap-phuong-phan-1-thumb6407.avif', 8, 'phimbo', 7, 4, 1, 4, 'Super Cube (Season 1)', 0, '0', '2025-04-02 20:41:50', '2025-04-02 20:41:50', NULL, 'Siêu Năng Lập Phương (Phần 1) Super Cube (Season 1)', NULL, 'DDnid2qx-WU', 48),
(24, 'Dương Thần: Thái Thượng Vong Tình', '75 Phút', 'duong-than-thai-thuong-vong-tinh', 'Dương Thần Chi Thái Thượng Vong Tình là một bộ phim cổ trang ly kỳ và giả tưởng kể về câu chuyện của Triệu Phi Dung, một vị thánh của giáo phái Đại La, người đã cố gắng bằng mọi cách để tìm ra Hồ tộc, bộ tộc ẩn giấu và giải thoát con quỷ của giáo phái Đại La. Hồng Dịch đã bị bắt nạt từ khi còn nhỏ, và để khiến mẹ mở màu mở mặt cậu đã vào thành để tham gia kỳ thi. Thật bất ngờ, vào đêm trước ngày nhập học, một cô gái bí ẩn đã mời Hồng Dịch đến dạy học cho Hồ tộc và Hồng Dịch đã tham gia vào một cuộc truy đuổi nguy hiểm. Sau khi trải qua nhiều cuộc phiêu lưu nguy hiểm, Hồng Dịch bị áp bức quyết định học võ thuật và gia nhập Hồ tộc để chống lại giáo phái Đại La.', 1, 'duong-than-thai-thuong-vong-tinh-thumb9471.avif', 9, 'phimle', 7, 2, 1, 0, 'Soul Of Light', 0, '0', '2025-04-02 20:55:26', '2025-04-02 20:55:26', '2023', 'Dương Thần: Thái Thượng Vong Tình', 1, 'RDGRWNTUThd1I', 1);

-- --------------------------------------------------------

--
-- Table structure for table `movie_genre`
--

CREATE TABLE `movie_genre` (
  `id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `genre_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `movie_genre`
--

INSERT INTO `movie_genre` (`id`, `movie_id`, `genre_id`) VALUES
(6, 16, 1),
(7, 16, 5),
(8, 19, 1),
(9, 19, 5),
(11, 16, 2),
(12, 20, 1),
(13, 20, 5),
(14, 20, 3),
(15, 21, 1),
(16, 21, 2),
(17, 21, 3),
(18, 21, 5),
(25, 15, 1),
(26, 15, 2),
(27, 15, 3),
(28, 15, 5),
(29, 15, 6),
(30, 15, 7),
(31, 22, 6),
(32, 22, 7),
(33, 23, 6),
(34, 23, 7),
(35, 24, 1),
(36, 24, 6),
(37, 24, 7);

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rating`
--

CREATE TABLE `rating` (
  `id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `ip_address` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES
(1, 'Hùng Lê', 'hungcute135@gmail.com', NULL, '$2y$10$tKOvb56UFEgXtU/Fl20zQe9ufIkRgZDle8W5paqu9Cbp2AD.MYRpa', 'jx1bOJ1AMBovUvYnf6nHrYWzF8IoPPAVEO3RsxkyIXdck6cKKeDuCTfZGIBS', '2025-03-14 02:44:04', '2025-03-14 02:44:04');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `countries`
--
ALTER TABLE `countries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `episodes`
--
ALTER TABLE `episodes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `movie_id` (`movie_id`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `genres`
--
ALTER TABLE `genres`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `info`
--
ALTER TABLE `info`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `linkmovies`
--
ALTER TABLE `linkmovies`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `movies`
--
ALTER TABLE `movies`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `movie_genre`
--
ALTER TABLE `movie_genre`
  ADD PRIMARY KEY (`id`),
  ADD KEY `movie_id` (`movie_id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD KEY `password_resets_email_index` (`email`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Indexes for table `rating`
--
ALTER TABLE `rating`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `countries`
--
ALTER TABLE `countries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `episodes`
--
ALTER TABLE `episodes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `genres`
--
ALTER TABLE `genres`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `info`
--
ALTER TABLE `info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `linkmovies`
--
ALTER TABLE `linkmovies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `movies`
--
ALTER TABLE `movies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `movie_genre`
--
ALTER TABLE `movie_genre`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rating`
--
ALTER TABLE `rating`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `episodes`
--
ALTER TABLE `episodes`
  ADD CONSTRAINT `episodes_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `movie_genre`
--
ALTER TABLE `movie_genre`
  ADD CONSTRAINT `movie_genre_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
