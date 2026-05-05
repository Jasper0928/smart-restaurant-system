CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lineUid` text,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`loyaltyScore` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_lineUid_unique` ON `customers` (`lineUid`);--> statement-breakpoint
CREATE TABLE `notificationLog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customerId` integer NOT NULL,
	`type` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`content` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`restaurantId` integer NOT NULL,
	`customerId` integer NOT NULL,
	`partySize` integer NOT NULL,
	`scheduledAt` integer NOT NULL,
	`depositPaid` integer DEFAULT false NOT NULL,
	`depositAmount` real,
	`specialRequests` text,
	`highChairNeeded` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`confirmationSentAt` integer,
	`reminderSentAt` integer,
	`qrCode` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_qrCode_unique` ON `reservations` (`qrCode`);--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`branchName` text NOT NULL,
	`location` text,
	`capacityConfig` text NOT NULL,
	`peakHourMultiplier` real DEFAULT 1.2 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`restaurantId` integer NOT NULL,
	`tableNumber` text NOT NULL,
	`maxSeats` integer NOT NULL,
	`status` text DEFAULT 'empty' NOT NULL,
	`occupiedSince` integer,
	`reservedUntil` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignedIn` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE TABLE `waitlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`restaurantId` integer NOT NULL,
	`customerId` integer NOT NULL,
	`partySize` integer NOT NULL,
	`entryTime` integer NOT NULL,
	`notifiedStatus` text DEFAULT 'pending' NOT NULL,
	`lastNotificationTime` integer,
	`contactCount` integer DEFAULT 0 NOT NULL,
	`qrCode` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_qrCode_unique` ON `waitlist` (`qrCode`);