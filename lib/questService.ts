import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { getAuth } from 'firebase/auth'; // Import getAuth for security checks
import { Quest } from '@/app/types';
import { compressAndUploadImage } from '@/lib/imageService';
import { createPost } from './postService';
import { awardQuestSubmissionQPs } from '@/lib/qpService';
import { updateQuestBadgeProgress } from '@/lib/badgeService';

type QuestRole = 'owner' | 'editor' | 'viewer';

export interface TripData {
  source: string;
  destination: string;
  startDate: string;
  endDate: string;
  transportMode: string[];
  tripType: string;
  preferences: string[];
  budget: number;
  sourceData?: any;
  destinationData?: any;
  uid: string;
}

export interface GenerateQuestResponse {
  success: boolean;
  itinerary?: any;
  questId?: string;
  error?: string;
}

export interface FlowCardState {
  id: string;
  type: string;
  content?: any;
}

const questService = {

  /**
   * Generates a new quest using AI
   */
  async generateQuest(questData: TripData): Promise<GenerateQuestResponse> {
    console.log('generateQuest called with:', questData);

    try {
      const { uid, ...questDataWithoutUid } = questData;

      if (!uid) {
        throw new Error('User UID is required');
      }

      const response = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questData),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to generate itinerary. Status: ${response.status}. Body: ${errorBody}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to generate itinerary from API');
      }

      return {
        success: true,
        itinerary: result.itinerary,
        questId: result.questId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in generateQuest:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Get AI-generated destination suggestions for interests
   */
  async getDestinationSuggestions(destination: string): Promise<string[]> {
    try {
      const response = await fetch(`/api/destination-suggestions/${encodeURIComponent(destination)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch destination suggestions');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get suggestions');
      }

      return result.suggestions || [];
    } catch (error) {
      console.error('Error fetching destination suggestions:', error);
      return [];
    }
  },

  /**
   * Core quest creation with transaction
   * Updated to handle single image URL and AI generation flag
   */
  async createQuest(
    uid: string,
    questData: any,
    itineraryData?: any,
    coverImageFile?: File,
    flowCards?: FlowCardState[],
    isAiGenerated: boolean = false // New parameter to track if quest was AI-generated
  ) {
    console.log('createQuest called with:', { uid, questData, isAiGenerated });

    const questCollectionRef = collection(db, 'quest');
    const newQuestRef = doc(questCollectionRef);
    const questId = newQuestRef.id;
    const chatCollectionRef = collection(db, 'chats');
    const newChatRef = doc(chatCollectionRef);
    const chatId = newChatRef.id;

    const userRef = doc(db, 'users', uid);

    try {
      // Upload cover image - single URL
      let coverImageUrl: string | null = null;
      if (coverImageFile) {
        try {
          coverImageUrl = await compressAndUploadImage(
            coverImageFile,
            'quest-covers',
            uid
          );
          console.log('Cover image uploaded:', coverImageUrl);
        } catch (error) {
          console.error('Error uploading cover image:', error);
        }
      }

      await runTransaction(db, async (transaction) => {
        // First, read the user document to ensure the transaction includes it
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error('User document not found. Please ensure your profile is set up.');
        }

        // 1. Create the Quest document
        const questDocument = {
          ...questData,
          itinerary: itineraryData || null,
          coverImageUrl: coverImageUrl, // Single URL string
          flowCards: flowCards || [],
          owner: uid,
          id: questId,
          chatId: chatId,
          members: {
            [uid]: 'owner'
          },
          isPublic: false,
          isPostedToFeed: false,
          associatedPostId: null,
          isAiGenerated: isAiGenerated, // Track if AI-generated
          type: isAiGenerated ? 'ai_generated' : 'manual', // Add type field for rules
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        console.log('Creating quest document:', questDocument);
        transaction.set(newQuestRef, questDocument);

        // 2. Create the associated Chat document
        const chatDocument = {
          questId: questId,
          questTitle: questData.title || `Quest to ${questData.destination}`,
          members: [uid],
          createdAt: serverTimestamp(),
          lastMessage: null,
        };
        console.log('Creating chat document:', chatDocument);
        transaction.set(newChatRef, chatDocument);

        // 3. Add the new questId to the user's profile
        // Use set with merge to handle cases where questIds doesn't exist
        console.log('Updating user document with questId:', questId);
        const currentQuestIds = userSnap.data()?.questIds || [];
        transaction.set(userRef, {
          questIds: [...currentQuestIds, questId],
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      console.log('Transaction completed successfully');
      return { success: true, questId, chatId };
    } catch (error) {
      console.error('Transaction failed: Error creating quest:', error);
      throw error;
    }
  },

  /**
   * Fetches a single quest document for a user (permission-based)
   */
  async getQuest(uid: string, questId: string): Promise<Quest> {
    try {
      const questRef = doc(db, 'quest', questId);
      const questSnap = await getDoc(questRef);

      if (!questSnap.exists()) {
        throw new Error('Quest not found');
      }

      const questData = questSnap.data();
      if (!questData.isPublic && (!questData.members || !questData.members[uid])) {
        throw new Error('You do not have permission to view this quest.');
      }

      return { id: questSnap.id, ...questData } as Quest;
    } catch (error) {
      console.error('Error fetching quest:', error);
      throw error;
    }
  },

  /**
   * Fetches a single quest document by its ID, without user permission checks
   */
  async getQuestById(questId: string): Promise<Quest | null> {
    try {
      const questRef = doc(db, 'quest', questId);
      const questSnap = await getDoc(questRef);
      if (questSnap.exists()) {
        return { id: questSnap.id, ...questSnap.data() } as Quest;
      }
      return null;
    } catch (error) {
      console.error('Error fetching quest by ID:', error);
      throw error;
    }
  },

  /**
   * Fetches all quests a user is a member of
   * Enhanced to properly sort by creation date
   */
  async getUserQuests(uid: string): Promise<Quest[]> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return [];
      }
      const questIds = userSnap.data().questIds || [];

      if (questIds.length === 0) {
        return [];
      }

      console.log(`Fetching ${questIds.length} quests for user ${uid}`);

      // Firestore 'in' queries support max 30 items, so we need to batch
      const batches = [];
      for (let i = 0; i < questIds.length; i += 30) {
        batches.push(questIds.slice(i, i + 30));
      }

      let quests: Quest[] = [];

      // Fetch all batches
      for (const batch of batches) {
        const questsRef = collection(db, 'quest');
        const q = query(
          questsRef,
          where('__name__', 'in', batch),
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          quests.push({ id: doc.id, ...doc.data() } as Quest);
        });
      }

      // Sort by createdAt timestamp (newest first)
      quests.sort((a, b) => {
        const aTimestamp =
          a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt
            ? (a.createdAt as { seconds: number }).seconds
            : (typeof a.createdAt === 'string' ? Date.parse(a.createdAt) / 1000 : 0);
        const bTimestamp =
          b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt
            ? (b.createdAt as { seconds: number }).seconds
            : (typeof b.createdAt === 'string' ? Date.parse(b.createdAt) / 1000 : 0);

        console.log(`Quest ${a.id}: ${aTimestamp}, Quest ${b.id}: ${bTimestamp}`);
        return bTimestamp - aTimestamp; // Descending order (newest first)
      });

      console.log(`Fetched and sorted ${quests.length} quests`);
      return quests;
    } catch (error) {
      console.error('Error fetching user quests:', error);
      throw error;
    }
  },

  /**
   * Fetches user quests with permission handling
   * Returns only quests that the current user has permission to view
   * This is useful for public profile pages where the viewer may not have access to all quests
   */
  async getUserQuestsWithPermissions(uid: string): Promise<Quest[]> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return [];
      }
      const questIds = userSnap.data().questIds || [];

      if (questIds.length === 0) {
        return [];
      }

      console.log(`Fetching ${questIds.length} quests for user ${uid} with permission handling`);

      const quests: Quest[] = [];

      // Fetch quests individually to handle permission errors
      for (const questId of questIds) {
        try {
          const questRef = doc(db, 'quest', questId);
          const questSnap = await getDoc(questRef);

          if (questSnap.exists()) {
            quests.push({ id: questSnap.id, ...questSnap.data() } as Quest);
          }
        } catch (error: any) {
          // Skip quests that the current user doesn't have permission to view
          if (error?.code === 'permission-denied') {
            console.log(`Skipping quest ${questId} - permission denied`);
          } else {
            console.error(`Error fetching quest ${questId}:`, error);
          }
        }
      }

      // Sort by createdAt timestamp (newest first)
      quests.sort((a, b) => {
        const aTimestamp =
          a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt
            ? (a.createdAt as { seconds: number }).seconds
            : (typeof a.createdAt === 'string' ? Date.parse(a.createdAt) / 1000 : 0);
        const bTimestamp =
          b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt
            ? (b.createdAt as { seconds: number }).seconds
            : (typeof b.createdAt === 'string' ? Date.parse(a.createdAt) / 1000 : 0);

        return bTimestamp - aTimestamp; // Descending order (newest first)
      });

      console.log(`Fetched ${quests.length} accessible quests out of ${questIds.length} total`);
      return quests;
    } catch (error) {
      console.error('Error fetching user quests with permissions:', error);
      return []; // Return empty array instead of throwing to prevent breaking the profile page
    }
  },

  /**
   * Get user's saved quests
   */
  getUserSavedQuests: async function (uid: string): Promise<Quest[]> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return [];
      }
      const savedQuestIds = userSnap.data().savedQuestIds || [];

      if (savedQuestIds.length === 0) {
        return [];
      }

      const questsToFetch = savedQuestIds.slice(0, 30);
      const questsRef = collection(db, 'quest');
      const q = query(
        questsRef,
        where('__name__', 'in', questsToFetch),
      );

      const querySnapshot = await getDocs(q);
      let quests: Quest[] = [];

      querySnapshot.forEach((doc) => {
        quests.push({ id: doc.id, ...doc.data() } as Quest);
      });

      return quests;
    } catch (error) {
      console.error('Error fetching user saved quests:', error);
      throw error;
    }
  },

  /**
   * Save a quest to the user's saved quests list
   */
  async saveQuest(questId: string, uid: string): Promise<{ success: boolean }> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        savedQuestIds: arrayUnion(questId)
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving quest:', error);
      throw error;
    }
  },

  /**
   * Remove a quest from the user's saved quests list
   */
  async unsaveQuest(questId: string, uid: string): Promise<{ success: boolean }> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        savedQuestIds: arrayRemove(questId)
      });
      return { success: true };
    } catch (error) {
      console.error('Error unsaving quest:', error);
      throw error;
    }
  },

  /**
   * Check if a quest is saved by the user
   */
  async isQuestSaved(questId: string, uid: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return false;
      }
      const savedQuestIds = userSnap.data().savedQuestIds || [];
      return savedQuestIds.includes(questId);
    } catch (error) {
      console.error('Error checking quest save status:', error);
      return false;
    }
  },

  /**
   * Posts a quest to the public feed
   * Updated to fix permission errors and handle cover image logic
   */
  async postQuestToFeed(
    questId: string,
    uid: string,
    coverImageFile?: File | null,
    existingCoverUrl?: string | null // NEW PARAM: Pass existing URL if user selected one without uploading new file
  ): Promise<{ success: boolean; error?: string; postId?: string; qpAwarded?: number }> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      // 0. SECURITY CHECK: Synchronize UI state with Auth state
      // This prevents the permission mismatch error
      if (!currentUser || currentUser.uid !== uid) {
        throw new Error('Authentication mismatch: You can only post quests you own while logged in.');
      }

      const questRef = doc(db, 'quest', questId);
      const questSnap = await getDoc(questRef);

      if (!questSnap.exists()) {
        throw new Error('Quest not found');
      }

      const questData = questSnap.data();

      // 1. Check permissions (Client Side Validation)
      if (questData.members?.[uid] !== 'owner') {
        throw new Error('Only the quest owner can post to the feed.');
      }

      // 2. Prevent duplicate posting for public quests
      if (questData.isPostedToFeed) {
        return {
          success: false,
          error: 'This quest has already been posted to the feed.'
        };
      }

      // 3. Fetch user data
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data();
      const userName = userData.displayName || 'Anonymous';
      const userProfilePic = userData.photoURL || '';

      // 4. Determine Final Cover Image URL
      // Priority: 1. New File Upload -> 2. Explicit Existing URL (selected in UI) -> 3. Current DB Value
      let finalCoverImageUrl = questData.coverImageUrl || null;

      if (coverImageFile) {
        try {
          finalCoverImageUrl = await compressAndUploadImage(
            coverImageFile,
            'quest-covers',
            uid
          );
          console.log('New cover image uploaded:', finalCoverImageUrl);
        } catch (error) {
          console.error('Error uploading new cover image:', error);
          throw new Error('Failed to upload cover image');
        }
      } else if (existingCoverUrl) {
        // Fix for "default cover getting posted": 
        // If no file is uploaded but a specific URL was chosen in UI, use it.
        finalCoverImageUrl = existingCoverUrl;
      }

      // 5. Enforce image for public posts
      if (!finalCoverImageUrl) {
        return {
          success: false,
          error: 'A cover image is required to post a quest.'
        };
      }

      let postId: string | undefined;

      // 6. Create the feed post (Always Public)
      const activityCount = questData.itinerary?.days?.flatMap((d: any) => d.activities || []).length || 0;
      const dayCount = questData.itinerary?.days?.length || 0;

      const postResult = await createPost({
        uid: uid,
        userName: userName,
        userProfilePic: userProfilePic,
        text: `🗺️ Quest to ${questData.destination}\n\n${questData.title || 'Untitled Quest!'}\n\n📍 ${dayCount} days · ${activityCount} activities`,
        photoUrl: finalCoverImageUrl,
        postType: 'quest_completion',
        questContext: {
          questId: questId,
          questTitle: questData.title || `Quest to ${questData.destination}`,
          description: questData.description || '',
          type: questData.type, // Pass 'ai_generated' if quest is AI-generated
          isAiGenerated: questData.isAiGenerated || false,
        }
      });

      postId = postResult.id;

      // 7. Update the quest document
      await updateDoc(questRef, {
        coverImageUrl: finalCoverImageUrl, // Ensures the chosen image (new or existing) is saved
        isPublic: true,
        isPostedToFeed: true,
        associatedPostId: postId,
        updatedAt: serverTimestamp()
      });

      // 8. Award QPs (only for manually created quests, not AI-generated)
      let qpAwarded = 0;
      try {
        // Check if quest is AI-generated
        if (questData.isAiGenerated === true) {
          console.log('Skipping QP award - quest is AI-generated');
        } else {
          const qpResult = await awardQuestSubmissionQPs(uid, questId);
          qpAwarded = qpResult.qpAwarded;
          console.log(`Awarded ${qpAwarded} QPs for manual quest creation`);

          // Trigger quest scoring asynchronously for manual quests
          // We fire and forget to not block the user flow
          fetch('/api/score-quest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questId })
          }).catch(err => console.error('Failed to trigger quest scoring:', err));
        }
      } catch (qpError) {
        console.error('Error awarding QPs:', qpError);
        // Don't fail the whole post if QP award fails, but log it
      }

      // 9. Notify Followers
      try {
        const { getFollowersList } = await import('./followService'); // Dynamic import to avoid circular dependency if any
        const { notifyNewPost } = await import('./notificationService');

        const followers = await getFollowersList(uid);
        if (followers.length > 0 && postId) {
          await notifyNewPost(
            postId,
            uid,
            userName,
            userProfilePic,
            questData.title || questData.destination || 'New Quest',
            followers
          );
        }
      } catch (notifError) {
        console.error('Error notifying followers:', notifError);
      }

      return { success: true, postId, qpAwarded };
    } catch (error) {
      console.error('Error posting quest to feed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post quest'
      };
    }
  },

  /**
   * Get public quests for feed
   */
  async getPublicQuests(limitCount: number = 12): Promise<Quest[]> {
    try {
      const questsRef = collection(db, 'quest');
      const q = query(
        questsRef,
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const quests: Quest[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();

        let ownerName = 'Anonymous';
        let ownerPhoto = '';

        if (data.owner) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.owner));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              ownerName = userData.displayName || 'Anonymous';
              ownerPhoto = userData.photoURL || '';
            }
          } catch (error) {
            console.error(`Error fetching owner data for quest ${docSnap.id}:`, error);
          }
        }

        quests.push({
          id: docSnap.id,
          ...data,
          ownerName,
          ownerPhoto
        } as unknown as Quest);
      }

      return quests;
    } catch (error) {
      console.error('Error fetching public quests:', error);
      throw error;
    }
  },

  /**
   * Get all public quest IDs for sitemap generation
   * Limited to a reasonable number to prevent massive reads, or fetch all if needed
   */
  async getAllPublicQuestIds(): Promise<string[]> {
    try {
      const questsRef = collection(db, 'quest');
      const q = query(
        questsRef,
        where('isPublic', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(1000) // Safety limit for now
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error fetching all public quest IDs:', error);
      return [];
    }
  },

  /**
   * Updates the itinerary of a quest
   */
  async updateQuest(questId: string, uid: string, updatedData: object) {
    try {
      const questRef = doc(db, 'quest', questId);
      const questSnap = await getDoc(questRef);

      if (!questSnap.exists()) throw new Error('Quest not found.');

      const questData = questSnap.data();
      const userRole = questData.members?.[uid];

      if (userRole !== 'owner' && userRole !== 'editor') {
        throw new Error('You do not have permission to edit this quest.');
      }

      await updateDoc(questRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating quest:', error);
      throw error;
    }
  },

  /**
   * AI Itinerary Generation (Placeholder)
   */
  async generateAItinerary(questData: TripData): Promise<any> {
    console.log('Generating AI itinerary for:', questData);
    return { days: [], generated: true };
  },

  /**
   * Create blank itinerary structure for manual creation
   */
  createBlankItinerary(questData: any): any {
    const startDate = new Date(questData.startDate);
    const endDate = new Date(questData.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const blankDays = Array.from({ length: days }, (_, i) => {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      return {
        day: i + 1,
        date: currentDate.toISOString().split('T')[0],
        title: `Day ${i + 1}`,
        activities: [
          {
            time: 'Morning',
            title: 'Morning Activity',
            description: '',
            location: { name: '' },
            tags: [],
            collapsed: !(i === 0), // Only expand first day's first activity
            media: [],
            type: 'activity'
          },
          {
            time: 'Afternoon',
            title: 'Afternoon Activity',
            description: '',
            location: { name: '' },
            tags: [],
            collapsed: true,
            media: [],
            type: 'activity'
          },
          {
            time: 'Evening',
            title: 'Evening Activity',
            description: '',
            location: { name: '' },
            tags: [],
            collapsed: true,
            media: [],
            type: 'activity'
          },
          {
            time: 'Night',
            title: 'Night Activity',
            description: '',
            location: { name: '' },
            tags: [],
            collapsed: true,
            media: [],
            type: 'activity'
          }
        ]
      };
    });

    return {
      days: blankDays,
      generated: false,
      tripData: questData
    };
  },
  // File: services/questService.ts

  /**
   * Deletes a quest and cleans up associated data
   */
  async deleteQuest(questId: string, uid: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Attempting to delete quest ${questId} by user ${uid}`); // [Debug]

      const questRef = doc(db, 'quest', questId);
      const questSnap = await getDoc(questRef);

      if (!questSnap.exists()) {
        throw new Error('Quest not found');
      }

      const questData = questSnap.data();

      // [FIX] Check ownership using BOTH the direct field and the members map
      const isOwner = questData.owner === uid || questData.members?.[uid] === 'owner';

      if (!isOwner) {
        console.error('Ownership check failed:', { owner: questData.owner, uid, members: questData.members });
        throw new Error('Only the owner can delete this quest.');
      }

      await runTransaction(db, async (transaction) => {
        // 1. Delete the Quest document
        transaction.delete(questRef);

        // 2. Remove questId from user's profile
        const userRef = doc(db, 'users', uid);
        transaction.update(userRef, {
          questIds: arrayRemove(questId)
        });

        // 3. Delete associated chat if it exists
        if (questData.chatId) {
          const chatRef = doc(db, 'chats', questData.chatId);
          // Note: This requires 'allow delete' in firestore.rules for chats
          transaction.delete(chatRef);
        }

        // 4. Delete associated feed post if it exists
        if (questData.associatedPostId) {
          const postRef = doc(db, 'posts', questData.associatedPostId);
          // Note: This requires 'allow delete' in firestore.rules for posts
          transaction.delete(postRef);
        }
      });

      console.log('Quest deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting quest:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete quest'
      };
    }
  }
};

export default questService;