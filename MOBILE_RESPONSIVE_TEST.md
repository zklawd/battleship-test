# Mobile Responsive Polish - Test Checklist

This document outlines the test plan for verifying mobile responsiveness across all screens.

## Test Devices (Chrome Mobile Emulator)
- [ ] iPhone SE (375px × 667px)
- [ ] iPhone 12 Pro (390px × 844px)
- [ ] Pixel 5 (393px × 851px)
- [ ] 320px width (minimum supported)

## Acceptance Criteria Checklist

### 1. Grid Touch Targets
**Requirement:** WHEN viewport < 768px THEN grids SHALL render at max available width with cells >= 44px touch targets

- [ ] Ship placement grid cells are 44px × 44px
- [ ] Battle phase grid cells are 44px × 44px
- [ ] All grid cells are tappable and provide visual feedback
- [ ] Grid scales properly on 320px screens without horizontal scroll

### 2. Battle Phase Tab Navigation
**Requirement:** WHEN viewport < 768px in battle THEN system SHALL use tab navigation between My Board and Enemy Board

- [ ] Tabs are visible on mobile (< 768px)
- [ ] Tabs are hidden on desktop (>= 768px)
- [ ] "Enemy Board" tab shows opponent's grid
- [ ] "My Board" tab shows player's grid
- [ ] Tab buttons are minimum 44px height
- [ ] Active tab is clearly indicated
- [ ] Tab switching works smoothly

### 3. Ship Placement on Mobile
**Requirement:** Ship placement on mobile SHALL work via tap-to-place with clear visual feedback

- [ ] Ships can be selected by tapping roster buttons
- [ ] Selected ship is clearly highlighted
- [ ] Orientation can be toggled via button (44px height)
- [ ] Grid cells show green preview when placement is valid
- [ ] Grid cells show red preview when placement is invalid
- [ ] Tapping a valid cell places the ship
- [ ] Invalid placement shows visual feedback (red flash)
- [ ] "Random" button works and has 44px height
- [ ] "Reset" button works and has 44px height
- [ ] "Ready" button is enabled when all ships placed and has 44px height
- [ ] "Cancel" button works and has 44px height

### 4. Button Touch Targets
**Requirement:** All buttons SHALL be minimum 44px height on mobile

#### Home Screen
- [ ] "Play vs AI" button is 44px+ height
- [ ] "Play Online" button is 44px+ height

#### Online Lobby
- [ ] "Back" button is 44px+ height
- [ ] "Create Room" button is 44px+ height
- [ ] "Join Room" button is 44px+ height
- [ ] "Cancel" button (in join form) is 44px+ height
- [ ] "Join" button (in join form) is 44px+ height

#### Room View
- [ ] "Copy to Clipboard" button is 44px+ height
- [ ] "Leave Room" button is 44px+ height

#### Ship Placement
- [ ] All ship roster buttons are 44px+ height
- [ ] Orientation toggle button is 44px+ height
- [ ] Random button is 44px+ height
- [ ] Reset button is 44px+ height
- [ ] Ready button is 44px+ height
- [ ] Cancel button is 44px+ height

#### Battle Phase
- [ ] Tab buttons are 44px+ height
- [ ] All grid cells are 44px+ height

#### Game Over
- [ ] "Home" button is 44px+ height
- [ ] "Play Again" button is 44px+ height

### 5. Home Screen and Lobby (320px)
**Requirement:** Home screen and lobby SHALL be centered and readable on 320px screens

- [ ] Home screen title is readable
- [ ] Home screen buttons fit without overflow
- [ ] Home screen has no horizontal scroll
- [ ] Online lobby buttons fit without overflow
- [ ] Online lobby has no horizontal scroll
- [ ] Room code display is readable
- [ ] Join room input is usable

### 6. No Horizontal Scrolling
**Requirement:** No horizontal scrolling on any screen at any supported viewport

- [ ] Home screen (320px)
- [ ] Home screen (375px - iPhone SE)
- [ ] Home screen (390px - iPhone 12)
- [ ] Home screen (393px - Pixel 5)
- [ ] Online lobby (320px)
- [ ] Online lobby (375px)
- [ ] Online lobby (390px)
- [ ] Online lobby (393px)
- [ ] Room view (320px)
- [ ] Room view (375px)
- [ ] Room view (390px)
- [ ] Room view (393px)
- [ ] Ship placement (320px)
- [ ] Ship placement (375px)
- [ ] Ship placement (390px)
- [ ] Ship placement (393px)
- [ ] Battle phase (320px)
- [ ] Battle phase (375px)
- [ ] Battle phase (390px)
- [ ] Battle phase (393px)
- [ ] Game over (320px)
- [ ] Game over (375px)
- [ ] Game over (390px)
- [ ] Game over (393px)

### 7. Touch Feedback
**Additional Quality Checks**

- [ ] All interactive elements have active states
- [ ] Touch feedback is immediate (no 300ms delay)
- [ ] Buttons scale or change color on tap
- [ ] Disabled buttons appear clearly disabled
- [ ] Form inputs are 16px+ font size (prevents iOS zoom)

## Testing Instructions

### Chrome DevTools Mobile Emulator

1. Open Chrome DevTools (F12)
2. Click the device toolbar icon (Ctrl+Shift+M)
3. Select device from dropdown:
   - iPhone SE
   - iPhone 12 Pro
   - Pixel 5
   - Responsive (set to 320px width)

### Manual Test Flow

1. **Home Screen**
   - Verify buttons are tappable and 44px+ height
   - Check layout at 320px, 375px, 390px, 393px
   - Ensure no horizontal scroll

2. **Online Lobby**
   - Tap "Play Online" from home
   - Verify Create/Join buttons are 44px+ height
   - Test Join Room flow
   - Check input font size is 16px+ (no zoom on focus)

3. **Room View**
   - Create a room
   - Verify room code is readable
   - Test copy button (44px+ height)
   - Check layout at narrow widths

4. **Ship Placement**
   - Start AI game
   - Verify grid cells are 44px × 44px
   - Test ship selection by tapping
   - Test orientation toggle
   - Test random placement
   - Verify all buttons are 44px+ height
   - Check grid doesn't overflow on 320px

5. **Battle Phase**
   - Place all ships and start battle
   - Verify tabs appear on mobile (< 768px)
   - Test tab switching
   - Verify grid cells are 44px × 44px
   - Test firing shots by tapping cells
   - Check that grids don't overflow

6. **Game Over**
   - Complete a game
   - Verify action buttons are 44px+ height
   - Check layout is centered

## Implementation Summary

### Changes Made

1. **Grid Cells:** All grid cells now use fixed 44px × 44px dimensions with `min-width` and `min-height` to ensure touch targets
2. **Buttons:** All buttons have `minHeight: '44px'` inline style or appropriate padding
3. **Touch Feedback:** Added `touch-manipulation` class and active states to all interactive elements
4. **Tab Navigation:** Battle phase already had tab implementation, enhanced with proper touch targets
5. **Responsive Typography:** Scaled down font sizes on mobile while maintaining readability
6. **Layout Constraints:** Added `overflow-x: hidden` to prevent horizontal scrolling
7. **Input Protection:** Set inputs to 16px font size to prevent iOS zoom
8. **Grid Spacing:** Reduced gap on mobile (`gap-0.5`) to fit 10×10 grid with 44px cells
9. **Padding Adjustments:** Reduced padding on containers for narrow screens

### CSS Enhancements

- Added `touch-manipulation` for better mobile tap handling
- Added `overflow-x: hidden` to body, html, and #root
- Added media query to enforce 44px minimum on touch devices
- Added input font-size rule to prevent iOS zoom
- Added `-webkit-tap-highlight-color` for better tap feedback

### Component Updates

- **HomeScreen:** Responsive text sizes, proper button heights, works at 320px
- **OnlineLobby:** Responsive layout, proper button heights, works at 320px
- **RoomView:** Responsive room code display, proper button heights, works at 320px
- **ShipPlacement:** 44px grid cells, all buttons 44px+, responsive layout
- **BattlePhase:** 44px grid cells, tab navigation, all buttons 44px+, responsive layout

## Success Criteria

All checkboxes above must be checked for the task to be considered complete. All screens must be:
- Fully usable on 320px width
- All touch targets >= 44px
- No horizontal scrolling at any viewport width
- Clear visual feedback for all interactions
