ALTER TABLE `public_games`
  ADD COLUMN `keySettings` text NULL,
  ADD COLUMN `fileLabel` varchar(80) NOT NULL DEFAULT '游戏文件',
  ADD COLUMN `buttonLabel` varchar(80) NOT NULL DEFAULT '开始';

-- Existing rows receive the defaults above; no game files or save data are removed.
