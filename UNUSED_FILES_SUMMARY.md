# Unused Files Analysis Report

**Analysis Date:** 2025-10-22
**Total Files Analyzed:** 233
**Referenced Files:** 147
**Potentially Unused Files:** 86

---

## Summary

This report identifies files in the OnQuest codebase that are not being imported or referenced by any other files. These files may be safe to remove, but should be reviewed carefully before deletion.

---

## Categories of Unused Files

### 1. Legacy/Old Code (High Confidence - Safe to Remove)

#### Feed_old/ Directory
- `components/Feed_old/Header.tsx`
- `components/Feed_old/Index.tsx`
- `components/Feed_old/Post.tsx`

**Recommendation:** These appear to be old/deprecated feed components. Safe to delete if the new feed implementation is working.

---

### 2. Old Quest Components (Review Carefully)

The following quest-related components appear unused:

- `components/quest/CreateGroupFromQuest.tsx`
- `components/quest/CreateQuest.jsx`
- `components/quest/CreateQuestPage.tsx`
- `components/quest/DestinationSearch.tsx`
- `components/quest/EngagementSection.jsx`
- `components/quest/FlowCards.jsx`
- `components/quest/Index.tsx`
- `components/quest/LoadingAnimations.tsx`
- `components/quest/MapIntegration.jsx`
- `components/quest/MobileFlowCard.tsx`
- `components/quest/QuestHeader.jsx`
- `components/quest/QuestPage.tsx`

**Recommendation:** These might be older versions of quest components. Verify that newer implementations exist before removing.

---

### 3. Quest Popups (Potentially Unused Features)

- `components/QuestPopups/AddLocation.jsx`
- `components/QuestPopups/AddTags.jsx`
- `components/QuestPopups/PostQuest.jsx`
- `components/QuestPopups/TagPeople.jsx`
- `components/QuestPopups/VisibleTo.jsx`

**Recommendation:** These modal/popup components may have been replaced by different UI patterns. Verify before removal.

---

### 4. Trip Planner Components

- `components/trip-planner/DayItinerary.tsx`
- `components/trip-planner/HotelDetail.tsx`
- `components/trip-planner/Icons.tsx`
- `components/trip-planner/InfoButton.tsx`
- `components/trip-planner/LocationList.tsx`
- `components/trip-planner/MapView.tsx`
- `components/trip-planner/TripHeader.tsx`
- `components/trip-planner/TripSidebar.tsx`
- `components/trip-planner/transport/BusCard.tsx`
- `components/trip-planner/transport/TrainCard.tsx`
- `components/trip-planner/transport/transportOptions.tsx`
- `components/Inputs/TripPlanner.jsx`

**Recommendation:** Check if the AI trip planner feature uses different components. These might be an older implementation.

---

### 5. Unused UI Library Components

Many Radix UI/shadcn components are unused. These are template files that can be kept for future use:

- `components/ui/accordion.tsx`
- `components/ui/alert-dialog.tsx`
- `components/ui/alert.tsx`
- `components/ui/aspect-ratio.tsx`
- `components/ui/avatar.tsx`
- `components/ui/badge.tsx`
- `components/ui/breadcrumb.tsx`
- `components/ui/calender.tsx`
- `components/ui/carousel.tsx`
- `components/ui/checkbox.tsx`
- `components/ui/collapsible.tsx`
- `components/ui/command.tsx`
- `components/ui/context-menu.tsx`
- `components/ui/drawer.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/form.tsx`
- `components/ui/hover-card.tsx`
- `components/ui/input-otp.tsx`
- `components/ui/menubar.tsx`
- `components/ui/navigation-menu.tsx`
- `components/ui/pagination.tsx`
- `components/ui/popover.tsx`
- `components/ui/progress.tsx`
- `components/ui/radio-group.tsx`
- `components/ui/resizable.tsx`
- `components/ui/select.tsx`
- `components/ui/sidebar.tsx`
- `components/ui/slider.tsx`
- `components/ui/switch.tsx`
- `components/ui/tabs.jsx`
- `components/ui/textarea.tsx`
- `components/ui/toast.tsx`
- `components/ui/toggle-group.tsx`
- `components/ui/use-toast.ts`
- `components/ui/ErrorMessage.jsx`

**Recommendation:** These are likely from shadcn/ui library. You can keep them for future features or remove unused ones to reduce bundle size. However, they're usually tree-shaken by the bundler, so removal is optional.

---

### 6. Unused Services (Moderate Risk)

- `lib/chatService.ts`
- `lib/followService.ts`
- `lib/server.js`
- `lib/tripService.js`

**Recommendation:** Review carefully. These services might be used in ways the static analysis doesn't detect (e.g., dynamic imports, or called from Firebase functions).

---

### 7. Unused Hooks

- `hooks/badgeConfig.ts`
- `hooks/useInfiniteScroll.ts`
- `hooks/useUserProfile.ts`

**Recommendation:** Verify these aren't used before removing. They might be for upcoming features.

---

### 8. Unused Event Components

- `components/Events/AuthForm.tsx`
- `components/Events/Events1.jsx`
- `components/Events/Events2.jsx`

**Recommendation:** Check if the events feature is still active. These might be old implementations.

---

### 9. Miscellaneous Components

- `components/LandingPage.tsx` - Old landing page?
- `components/LayoutWrapper.tsx` - Wrapper component not in use
- `components/debugnav.jsx` - Debug navigation (safe to remove)
- `components/Home/SearchBar.tsx` - Unused search bar
- `components/My-Profile/ui/navigation-menu.tsx` - Duplicate navigation menu
- `components/services/test.ts` - Test file (safe to remove)

**Recommendation:** Review individually. Debug and test files can be safely removed.

---

### 10. Account/Profile Components

- `app/(pages)/account/PublicProfilePage.tsx`
- `app/(pages)/account/settings.tsx`

**Recommendation:** These might be older versions. Check if `page.tsx` files in these directories replaced them.

---

## Recommended Actions

### Immediate Actions (High Confidence)
1. Delete `components/Feed_old/` directory (legacy code)
2. Delete `components/debugnav.jsx` (debug component)
3. Delete `components/services/test.ts` (test file)
4. Delete `find-unused-files.js` (analysis script)

### Review Before Deletion (Moderate Risk)
1. Quest components in `components/quest/` - verify new implementations exist
2. Quest popup components in `components/QuestPopups/`
3. Trip planner components in `components/trip-planner/`
4. Service files in `lib/` - check for dynamic imports

### Optional Cleanup (Low Priority)
1. Unused UI components in `components/ui/` - these are often kept as library components
2. Consider keeping for future features unless you need to reduce codebase size

---

## Notes

- This analysis is based on static import detection
- Some files might be used via dynamic imports or require() calls that weren't detected
- Always test the application after removing any files
- Consider creating a git branch before bulk deletions
- Some files might be planned for future features

---

## How to Verify Before Deletion

Before deleting any file, run:
```bash
# Search for any references to the file
grep -r "filename-without-extension" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"

# Check git history to see when it was last modified
git log --follow -- path/to/file

# Check if it's mentioned in documentation
grep -r "filename" *.md
```
