CREATE TABLE `ai_usage` (
	`key` text PRIMARY KEY NOT NULL,
	`used` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connected_accounts` (
	`owner` text NOT NULL,
	`provider` text NOT NULL,
	`payload` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `provider`),
	FOREIGN KEY (`owner`) REFERENCES `accounts`(`owner`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `imported_sources` (
	`owner` text NOT NULL,
	`provider` text NOT NULL,
	`records` text NOT NULL,
	`summary` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `provider`),
	FOREIGN KEY (`owner`) REFERENCES `accounts`(`owner`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`session_hash` text NOT NULL,
	`cookie_hash` text NOT NULL,
	`payload` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `accounts`(`owner`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `room_invites` (
	`room` text NOT NULL,
	`profile` text NOT NULL,
	PRIMARY KEY(`room`, `profile`),
	FOREIGN KEY (`room`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
