# Smart Restaurant System - Project TODO

## Phase 1: Database & Schema
- [x] Design and create database schema (Customers, Restaurants, Tables, Waitlist, Reservations)
- [x] Create Drizzle migrations for all tables
- [x] Execute SQL migrations to database

## Phase 2: Backend API & Business Logic
- [x] Implement QR Code generation for reservations (real server-side with qrcode library)
- [x] Create reservation management procedures (create, update, cancel)
- [x] Create waitlist management procedures (add, update, remove)
- [x] Implement EWT (Estimated Wait Time) algorithm based on AST
- [x] Create table status management procedures (with tRPC endpoint)
- [ ] Implement No-show prevention logic (24-hour confirmation, auto-expiry)
- [ ] Create notification trigger procedures
- [ ] Implement role-based access control (admin vs staff - needs enhancement)

## Phase 3: Admin Dashboard
- [x] Design admin dashboard layout with sidebar navigation (routed at /admin)
- [x] Implement waitlist board with real-time updates (polling every 5s)
- [x] Create table visualization with color-coded status grid
- [x] Implement table status color coding (empty, occupied, reserved, cleaning)
- [ ] Create occupancy timer for tables (enhancement)
- [ ] Implement one-click notification trigger (enhancement)
- [x] Create reservation management interface (display with status)
- [ ] Implement customer response tracking (coming, reserve 5min, cancel)

## Phase 4: Customer Interface
- [x] Design customer reservation form (routed at /reserve)
- [x] Implement date/time picker for reservations (native HTML5)
- [x] Create party size and special requests input
- [x] Implement QR Code display after reservation (real server-side QR)
- [ ] Create real-time waitlist status tracking page
- [ ] Implement dynamic wait time display (EWT calculation)
- [ ] Create customer response buttons (coming, reserve 5min, cancel)

## Phase 5: Notifications & Automation
- [ ] Implement 24-hour pre-reservation confirmation reminder
- [ ] Create automatic No-show expiry logic
- [ ] Implement smart substitution logic for no-shows
- [ ] Create email/in-app notification system
- [ ] Implement real-time status update notifications
- [ ] Create notification history tracking

## Phase 6: UI/UX & Visual Design
- [ ] Implement high-end editorial aesthetic design system
- [ ] Create cream/white color palette with high contrast
- [ ] Implement Didone serif typography for headings
- [ ] Create elegant spacing and asymmetric layouts
- [ ] Implement responsive design for all interfaces
- [ ] Create loading states and empty states

## Phase 7: Testing & Optimization
- [ ] Write vitest tests for API procedures
- [ ] Write vitest tests for EWT algorithm
- [ ] Write vitest tests for No-show logic
- [ ] Performance testing for real-time updates
- [ ] Browser testing across devices

## Phase 8: Deployment & Documentation
- [ ] Create project checkpoint
- [ ] Prepare deployment documentation
- [ ] Create user guide for admin and customers


## Phase 5: LINE Official Account Integration
- [x] Set up LINE Messaging API webhook endpoint (Express route at /api/line/webhook)
- [x] Implement LINE event handlers (message, follow events)
- [x] Create LINE Rich Menu configuration (JSON template provided)
- [x] Implement QR Code sharing to LINE (flex message with image)
- [x] Create LINE notification push service (pushLineMessage function)
- [x] Implement LINE customer response handlers (coming, reserved_5min, cancelled)
- [x] Add LINE user ID mapping to customer records (lineUid field in schema)
- [x] Create LINE message templates for notifications (flex messages, quick reply)
- [x] Create LINE setup documentation (LINE_SETUP.md)
- [x] Write and pass 10 LINE integration unit tests

## Phase 6: LINE Customer Interaction
- [x] Implement LINE reservation flow (through Rich Menu - template provided)
- [x] Create LINE waitlist status query (via tRPC)
- [x] Implement LINE quick reply buttons for customer responses ("我正前往", "保留 5 分鐘", "取消候位")
- [ ] Add LINE sticker support for notifications (enhancement)
- [ ] Create LINE customer support flow (enhancement)
- [x] Implement LINE reservation confirmation messages (flex messages)

## Phase 7: Admin LINE Controls
- [ ] Add one-click LINE notification trigger in admin dashboard (enhancement)
- [ ] Implement LINE broadcast notifications for all waiting customers (enhancement)
- [ ] Create LINE admin notification for new reservations (enhancement)
- [ ] Add LINE admin notification for no-shows (enhancement)


## Phase 10: LINE Account Binding
- [x] Implement LINE follow event to capture and store lineUid (webhook handler)
- [x] Create LINE account linking procedure via webhook (bindByPhone tRPC)
- [x] Add lineUid update to customer record on follow (db-line-binding.ts)
- [ ] Implement reservation with LINE binding option (frontend enhancement)
- [x] Create LINE account verification flow (phone validation)
- [x] Add LINE account binding status check (getBindingStatus tRPC)
- [x] Wire reservation confirmation to auto-send via LINE when lineUid exists (routers.ts)
- [x] Create LINE account unlinking procedure (unbindAccount tRPC)
- [ ] Add LINE account binding UI to reservation form (frontend enhancement)
- [x] Test end-to-end LINE binding and notification flow (18 binding tests passing)
