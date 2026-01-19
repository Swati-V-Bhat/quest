// Complete working version with all features fixed

'use client'
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from '@/lib/firebase';
import questService from '@/lib/questService';
import { createPost } from '@/lib/postService';
import { Map, Calendar, ArrowLeft, Clock, MapPin as MapPinIcon, Filter, Edit3, Save, Copy, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Share2, Send, X, Plane, Train, Bus, Car, Ship, Edit2 } from 'lucide-react';
import InteractiveMap from '../../../../components/quest/InteractiveMap';
import { useToast, ToastContainer } from '@/hooks/use-toast';
import { PostQuestModal } from '@/components/QuestPopups';
import { LocationInput } from '@/components/common/LocationInput';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Flag } from 'lucide-react';
import { FaHeart } from 'react-icons/fa';
import { reportPost } from '@/lib/postService';
import { Quest } from '../../../types/index'
import { arrayRemove, arrayUnion, doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { VideoGenerationModal } from '@/components/quest/VideoGenerationModal';
import { Video } from 'lucide-react';
import OnQuestPeopleSection from '@/components/quest/OnQuestPeopleSection';
import ShareModal from '@/components/quest/ShareModal';
import { compressAndUploadImage } from '@/lib/imageService';
import { Loader2, Images } from 'lucide-react';
import { CarouselGeneratorModal } from '@/components/quest/CarouselGeneratorModal';
import { StoryGeneratorModal } from '@/components/quest/StoryGeneratorModal';

interface ActivityLocation {
  name: string;
  coordinates?: { lat: number; lng: number; };
}

interface ActivityMedia {
  url: string;
  type: 'image' | 'video';
}

interface Activity {
  time: string;
  title: string;
  description: string;
  location: ActivityLocation;
  tags: string[];
  collapsed: boolean;
  media?: ActivityMedia[];
  type?: 'travel' | 'activity';
}




const AddActivityModal = ({ isOpen, onClose, onAdd, uid }: any) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('Morning');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ name: string; coordinates?: { lat: number; lng: number } }>({ name: '' });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTime('Morning');
      setDescription('');
      setLocation({ name: '' });
      setImageFiles([]);
      setImagePreviews([]);
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = [...imageFiles, ...files];
      setImageFiles(newFiles);

      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);

    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsUploading(true);
    try {
      const media = [];
      if (imageFiles.length > 0 && uid) {
        const uploadPromises = imageFiles.map(file =>
          compressAndUploadImage(file, 'quest-activities', uid)
        );
        const urls = await Promise.all(uploadPromises);
        media.push(...urls.map(url => ({ url, type: 'image' as const })));
      }

      const newActivity = {
        time: time,
        title: title.trim(),
        description: description.trim(),
        location: location,
        tags: [],
        collapsed: false,
        media: media
      };

      onAdd(newActivity);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 my-8">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Add New Activity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Activity Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white"
              placeholder="e.g., Visit Temple, Lunch at Restaurant"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Time of Day *</label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white cursor-pointer"
            >
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Location</label>
            <LocationInput
              value={location.name}
              onChange={(locationData) => setLocation(locationData)}
              placeholder="Search for a location..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Start typing to search with Google Places
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white focus:outline-none"
              placeholder="Add details about this activity..."
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Add Images</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative h-24 rounded-lg overflow-hidden group">
                  <img
                    src={preview}
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-gray-800">
                <Plus size={24} className="text-gray-500" />
                <span className="text-xs text-gray-400 mt-1">Add</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG up to 10MB each</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isUploading}
              className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                'Add Activity'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditTitleModal = ({ isOpen, onClose, currentTitle, currentDestination, onSave }: any) => {
  const [title, setTitle] = useState(currentTitle);
  const [destination, setDestination] = useState(currentDestination);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setDestination(currentDestination);
    }
  }, [isOpen, currentTitle, currentDestination]);

  const handleSave = () => {
    if (title.trim() && destination.trim()) {
      onSave(title.trim(), destination.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Edit Quest Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Quest Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white focus:outline-none" placeholder="e.g., Amazing Bali Adventure" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">Cancel</button>
            <button onClick={handleSave} disabled={!title.trim() || !destination.trim()} className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};




const QuestViewPage = () => {
  const [user, loading] = useAuthState(auth);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [questLoading, setQuestLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [mapFilter, setMapFilter] = useState<'all' | number>('all');
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedQuest, setEditedQuest] = useState<Quest | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditTitleModal, setShowEditTitleModal] = useState(false);

  const { toasts, showToast, removeToast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Instagram Carousel Generator
  const [showCarouselModal, setShowCarouselModal] = useState(false);

  // Instagram Story Generator
  const [showStoryModal, setShowStoryModal] = useState(false);

  // Owner 3-dot menu for generation options
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);


  // Extract all images from the quest for the modal
  const questImages = React.useMemo(() => {
    if (!quest?.itinerary?.days) return [];
    const images: string[] = [];
    quest.itinerary.days.forEach((day: any) => {
      day.activities?.forEach((activity: any) => {
        if (activity.media) {
          activity.media.forEach((m: any) => {
            if (m.type === 'image' && m.url) images.push(m.url);
          });
        }
      });
    });
    return images;
  }, [quest]);

  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const questId = params.questId as string;

  const userRole = quest?.members?.[user?.uid || ''];
  const canEdit = userRole === 'owner' || userRole === 'editor';
  const isOwner = userRole === 'owner';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth');
    } else if (questId) {
      loadQuest();
    }
  }, [user, loading, questId, router]);

  // Check for edit mode query param
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && canEdit) {
      setIsEditMode(true);
    }
  }, [searchParams, canEdit]);

  useEffect(() => {
    const fetchPostStats = async () => {
      if (quest?.associatedPostId && user?.uid) {
        try {
          const postRef = doc(db, 'posts', quest.associatedPostId);
          const postSnap = await getDoc(postRef);

          if (postSnap.exists()) {
            const postData = postSnap.data();
            setLikeCount(postData.likeCount || 0);
            setIsLiked(postData.likedBy?.includes(user.uid) || false);
          }

          // Check if quest is saved using questId, not postId
          const isSavedResult = await questService.isQuestSaved(quest.id!, user.uid);
          setIsSaved(isSavedResult);
        } catch (error) {
          console.error('Error fetching post stats:', error);
        }
      }
    };

    fetchPostStats();
  }, [quest?.associatedPostId, user?.uid, quest]);


  const loadQuest = async () => {
    if (!user?.uid) {
      setQuestLoading(false);
      return;
    }
    setQuestLoading(true);
    try {
      const questData = await questService.getQuest(user.uid, questId);
      setQuest(questData as unknown as Quest);
      if (questData) {
        setEditedQuest(JSON.parse(JSON.stringify(questData)));
        const initialCollapsed = new Set<number>();
        questData.itinerary?.days?.forEach((_: any, index: number) => {
          if (index > 0) initialCollapsed.add(index);
        });
        setCollapsedDays(initialCollapsed);
      }
    } catch (error) {
      console.error('Error loading quest:', error);
      showToast('Failed to load quest', 'error');
    } finally {
      setQuestLoading(false);
    }
  };



  const handleSave = async () => {
    if (!user?.uid || !editedQuest) return;
    setSaving(true);
    try {
      // Reset all collapsed states before saving to prevent display issues in view mode
      const questToSave = JSON.parse(JSON.stringify(editedQuest));
      questToSave.itinerary?.days?.forEach((day: any) => {
        day.activities?.forEach((activity: any) => {
          activity.collapsed = false;
        });
      });

      await questService.updateQuest(questId, user.uid, {
        itinerary: questToSave.itinerary,
        updatedAt: new Date().toISOString()
      });
      setQuest(questToSave);
      setIsEditMode(false);
      showToast('Quest saved successfully! ✓', 'success');
    } catch (error) {
      console.error('Error saving quest:', error);
      showToast('Failed to save quest', 'error');
    }
    setSaving(false);
  };

  const handleSaveTitle = async (newTitle: string) => {
    if (!user?.uid || !quest) return;
    try {
      await questService.updateQuest(questId, user.uid, {
        title: newTitle,
        updatedAt: new Date().toISOString()
      });
      setQuest({ ...quest, title: newTitle });
      if (editedQuest) {
        setEditedQuest({ ...editedQuest, title: newTitle });
      }
      showToast('Quest details updated! ✓', 'success');
    } catch (error) {
      console.error('Error updating quest title:', error);
      showToast('Failed to update quest details', 'error');
    }
  };

  const handlePostQuest = async (coverImage: File | null, existingImageUrl?: string | null) => {
    if (!user?.uid || !quest) return;
    try {
      const result = await questService.postQuestToFeed(questId, user.uid, coverImage, existingImageUrl);

      if (result.success) {
        showToast(`Quest posted! You earned ${result.qpAwarded || 0} QP! 🎉`, 'success');
        await loadQuest();
      } else {
        showToast(result.error || 'Failed to post quest', 'error');
      }
    } catch (error) {
      console.error('Error posting quest:', error);
      showToast('Failed to post quest', 'error');
    } finally {
      setShowPostModal(false);
    }
  };

  const handleCopyQuest = async () => {
    if (!user?.uid || !quest) return;
    try {
      const copiedQuest = {
        ...quest,
        title: `${quest.title} (Copy)`,
        members: { [user.uid]: 'owner' as const },
        isPublic: false,
        copiedFrom: questId
      };
      delete (copiedQuest as any).id;
      const flowCards = quest?.itinerary?.days?.flatMap((day: any) =>
        day.activities?.map((activity: any) => ({
          location: activity.location,
          title: activity.title,
          description: activity.description,
          time: activity.time,
        })) || []
      ) || [];
      const result = await questService.createQuest(user.uid, copiedQuest, undefined, undefined, flowCards, false);
      showToast('Quest copied successfully!', 'success');
      router.push(`/quest/${result.questId}`);
    } catch (error) {
      console.error('Error copying quest:', error);
      showToast('Failed to copy quest', 'error');
    }
  };

  const handleShareToFeed = async () => {
    if (!user || !quest) return;
    try {
      console.log("before create post: ", quest.coverImageUrl);
      await createPost({
        uid: user.uid,
        userName: user.displayName || 'Traveler',
        userProfilePic: user.photoURL || '',
        text: `Check out my Quest to ${quest.destination}! 🗺️`,
        photoUrl: quest.coverImageUrl,
        postType: 'quest_completion',
        questContext: {
          questTitle: quest.title || `An amazing journey to ${quest.destination}`,
          description: quest.destination,
          category: 'travel',
          type: quest.type, // Pass 'ai_generated' if quest is AI-generated
          isAiGenerated: quest.isAiGenerated || quest.type === 'ai_generated' || quest.itinerary?.generated || false
        }
      });

      showToast('Quest shared to feed!', 'success');
      setIsShareModalOpen(false);
    } catch (error) {
      console.error('Failed to share quest to feed', error);
      showToast('Failed to share quest', 'error');
    }
  };

  const handleAddActivityInline = (dayIndex: number, afterIndex: number) => {
    if (!editedQuest) return;
    const updated = { ...editedQuest };

    const newActivity: Activity = {
      time: 'Morning',
      title: '',
      description: '',
      location: { name: '' },
      tags: [],
      collapsed: false,
      type: 'activity',
      media: []
    };

    updated.itinerary.days[dayIndex].activities.splice(afterIndex + 1, 0, newActivity);
    setEditedQuest(updated);
    showToast('New activity added', 'success');
  };

  const deleteActivity = (dayIndex: number, activityIndex: number) => {
    if (!editedQuest) return;
    const updated = { ...editedQuest };
    updated.itinerary.days[dayIndex].activities.splice(activityIndex, 1);
    setEditedQuest(updated);
    showToast('Activity deleted', 'info');
  };

  const updateActivity = (dayIndex: number, activityIndex: number, field: string, value: any) => {
    if (!editedQuest) return;
    const updated = { ...editedQuest };
    (updated.itinerary.days[dayIndex].activities[activityIndex] as any)[field] = value;

    if (field === 'time') {
      const timeOrder: { [key: string]: number } = {
        'Morning': 0,
        'Afternoon': 1,
        'Evening': 2,
        'Night': 3
      };

      updated.itinerary.days[dayIndex].activities.sort((a: any, b: any) => {
        const timeA = timeOrder[a.time] ?? 0;
        const timeB = timeOrder[b.time] ?? 0;
        return timeA - timeB;
      });
    }

    setEditedQuest(updated);
  };

  const toggleCollapse = (dayIndex: number, activityIndex: number) => {
    if (!editedQuest) return;
    const updated = { ...editedQuest };
    updated.itinerary.days[dayIndex].activities[activityIndex].collapsed = !updated.itinerary.days[dayIndex].activities[activityIndex].collapsed;
    setEditedQuest(updated);
  };

  const handleSaveNext = (dayIndex: number, activityIndex: number) => {
    if (!editedQuest) return;
    const updated = { ...editedQuest };

    // Collapse current activity
    updated.itinerary.days[dayIndex].activities[activityIndex].collapsed = true;

    // Find next activity
    let nextDayIndex = dayIndex;
    let nextActivityIndex = activityIndex + 1;

    // If we've reached the end of activities for this day, move to next day
    if (nextActivityIndex >= updated.itinerary.days[dayIndex].activities.length) {
      nextDayIndex = dayIndex + 1;
      nextActivityIndex = 0;
    }

    // Check if next activity exists
    if (
      updated.itinerary.days[nextDayIndex] &&
      updated.itinerary.days[nextDayIndex].activities[nextActivityIndex]
    ) {
      // Expand next activity
      updated.itinerary.days[nextDayIndex].activities[nextActivityIndex].collapsed = false;

      // Ensure the day is expanded if it was collapsed
      if (collapsedDays.has(nextDayIndex)) {
        const newCollapsed = new Set(collapsedDays);
        newCollapsed.delete(nextDayIndex);
        setCollapsedDays(newCollapsed);
      }
    }

    setEditedQuest(updated);
    // We don't need to call handleSave() here because we are just updating the local state (editedQuest).
    // The user can click the main "Save" button to persist changes to the backend, 
    // OR if they want "Save & Next" to actually persist to DB, we should call handleSave().
    // Given the user said "save button inside activity", it implies persistence.
    // However, saving the whole quest on every step might be slow. 
    // Let's assume they mean "Save local state & Next" for smooth flow, and final Save at the end.
    // BUT, the prompt said "save button", so maybe they want persistence?
    // "save button inside activity and close that activity and ope next activity automatically"
    // I will stick to local state update for speed, as the main Save button exists. 
    // Wait, if I don't persist, "Save" is a bit misleading if the app crashes.
    // But `handleSave` saves the *entire* quest. Doing that 12 times for a 3 day trip is heavy.
    // I'll stick to local state update but maybe trigger a debounced save or just keep it local.
    // Actually, let's look at `updateActivity`. It updates `editedQuest`. 
    // So "Save" in this context likely means "Confirm changes and move on".
    // I will add a small toast "Activity updated" to give feedback.
    showToast('Activity updated', 'success');
  };

  const toggleDayCollapse = (dayIndex: number) => {
    const newCollapsed = new Set(collapsedDays);
    if (newCollapsed.has(dayIndex)) {
      newCollapsed.delete(dayIndex);
    } else {
      newCollapsed.add(dayIndex);
    }
    setCollapsedDays(newCollapsed);
  };

  const moveActivity = (dayIndex: number, fromIndex: number, toIndex: number) => {
    if (!editedQuest) return;
    if (toIndex < 0 || toIndex >= editedQuest.itinerary.days[dayIndex].activities.length) return;
    const updated = { ...editedQuest };
    const activities = updated.itinerary.days[dayIndex].activities;
    const [movedItem] = activities.splice(fromIndex, 1);
    activities.splice(toIndex, 0, movedItem);
    setEditedQuest(updated);
    showToast('Activity reordered', 'info');
  };

  const handleDragStart = (e: React.DragEvent, dayIndex: number, activityIndex: number) => {
    setDraggedItem({ dayIndex, activityIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dayIndex: number, activityIndex: number) => {
    e.preventDefault();
    if (draggedItem && draggedItem.dayIndex === dayIndex) {
      moveActivity(dayIndex, draggedItem.activityIndex, activityIndex);
    }
    setDraggedItem(null);
  };

  if (loading || questLoading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
  }

  if (!quest) {
    return <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center text-center p-4"><h2 className="text-xl font-bold mb-2">Quest Not Found</h2><p className="text-gray-400">The quest you're looking for doesn't exist.</p><button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">Go Back</button></div>;
  }

  const displayQuest = isEditMode ? editedQuest : quest;
  if (!displayQuest) return null;

  // Fix: Properly extract activities with coordinates and add date (supports both lat/lng and latitude/longitude formats)
  const allActivitiesWithCoords = displayQuest.itinerary?.days?.flatMap((day: any) =>
    (day.activities || [])
      .filter((a: any) => {
        const coords = a.location?.coordinates;
        return coords && (coords.lat || coords.latitude) && (coords.lng || coords.longitude || coords.lon);
      })
      .map((a: any) => {
        const lat = a.location.coordinates.lat || a.location.coordinates.latitude;
        const lng = a.location.coordinates.lng || a.location.coordinates.longitude || a.location.coordinates.lon;
        return {
          ...a,
          date: day.date,
          location: {
            ...a.location,
            coordinates: {
              lat,
              lng,
              latitude: lat,
              longitude: lng
            }
          }
        };
      })
  ) || [];

  const dayActivitiesWithCoords = mapFilter !== 'all' && displayQuest.itinerary?.days?.[mapFilter]
    ? (displayQuest.itinerary.days[mapFilter].activities || [])
      .filter((a: any) => {
        const coords = a.location?.coordinates;
        return coords && (coords.lat || coords.latitude) && (coords.lng || coords.longitude || coords.lon);
      })
      .map((a: any) => {
        const lat = a.location.coordinates.lat || a.location.coordinates.latitude;
        const lng = a.location.coordinates.lng || a.location.coordinates.longitude || a.location.coordinates.lon;
        return {
          ...a,
          date: displayQuest.itinerary.days[mapFilter].date,
          location: {
            ...a.location,
            coordinates: {
              lat,
              lng,
              latitude: lat,
              longitude: lng
            }
          }
        };
      })
    : [];



  const handleLike = async () => {
    if (!user?.uid || !quest?.associatedPostId) return;

    try {
      const postRef = doc(db, 'posts', quest.associatedPostId);

      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likeCount: increment(-1)
        });
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likeCount: increment(1)
        });
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      showToast('Failed to update like', 'error');
    }
  };

  const handleSaveQuest = async () => {
    if (!user?.uid || !quest?.id) return;

    try {
      if (isSaved) {
        await questService.unsaveQuest(quest.id, user.uid);
        setIsSaved(false);
        showToast('Removed from saved', 'info');
      } else {
        await questService.saveQuest(quest.id, user.uid);
        setIsSaved(true);
        showToast('Quest saved! ✓', 'success');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      showToast('Failed to update save status', 'error');
    }
  };

  const handleCommentNavigate = () => {
    if (quest?.associatedPostId) {
      router.push(`/feed?scrollTo=${quest.associatedPostId}&openComments=true`);
    }
  };

  const handleReportQuest = async () => {
    if (!user?.uid || !quest?.associatedPostId || !reportReason) {
      showToast('Please select a reason', 'error');
      return;
    }

    try {
      await reportPost(quest.associatedPostId, user.uid, reportReason, reportDescription);
      showToast('Quest reported successfully', 'success');
      setShowReportModal(false);
      setShowMoreMenu(false);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Error reporting quest:', error);
      showToast('Failed to report quest', 'error');
    }
  };



  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 lg:pb-0">

      <EditTitleModal isOpen={showEditTitleModal} onClose={() => setShowEditTitleModal(false)} currentTitle={quest.title} currentDestination={quest.destination} onSave={handleSaveTitle} />

      {/* Post Quest Modal */}
      <PostQuestModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        onPost={handlePostQuest}
        questTitle={quest.title || quest.destination}
        questImages={questImages}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        questId={questId}
        questTitle={quest.title}
        onShareToFeed={handleShareToFeed}
      />

      <header className="sticky top-0 z-20 bg-gray-950/80 border-b border-gray-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-bold truncate max-w-[150px] md:max-w-xs">
                    {quest.title}
                  </h1>
                  {canEdit && !isEditMode && (
                    <button
                      onClick={() => setShowEditTitleModal(true)}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                      title="Edit quest details"
                    >
                      <Edit2 size={16} className="text-gray-400 hover:text-orange-500" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <Calendar size={12} />
                  <span>
                    {(() => {
                      const start = new Date(quest.startDate);
                      const end = new Date(quest.endDate);
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays === 1 ? '1 day' : `${diffDays} days`;
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS - Different for Owner vs Viewer */}
            <div className="flex items-center gap-2">
              {isOwner ? (
                /* OWNER VIEW - Share and Edit */
                <>

                  {/* Create Content 3-dot Menu - Only show when NOT in edit mode */}
                  {!isEditMode && (
                    <div className="relative">
                      <button
                        onClick={() => setShowOwnerMenu(!showOwnerMenu)}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 rounded-lg transition-all shadow-lg hover:shadow-xl text-sm font-medium"
                      >
                        <Images size={18} />
                        <span className="hidden md:inline">Create</span>
                        <MoreHorizontal size={16} />
                      </button>

                      {/* Owner Create Menu Dropdown */}
                      {showOwnerMenu && (
                        <>
                          {/* Backdrop to close menu on outside click */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowOwnerMenu(false)}
                          />
                          <div className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-lg border border-gray-700 shadow-xl z-50">
                            <button
                              onClick={() => {
                                setShowVideoModal(true);
                                setShowOwnerMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-white text-left rounded-t-lg"
                            >
                              <Video size={18} className="text-purple-400" />
                              <div>
                                <span className="block font-medium">Generate Video</span>
                                <span className="text-xs text-gray-400">Reels/TikTok format</span>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setShowCarouselModal(true);
                                setShowOwnerMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-white text-left"
                            >
                              <Images size={18} className="text-orange-400" />
                              <div>
                                <span className="block font-medium">Instagram Carousel</span>
                                <span className="text-xs text-gray-400">Multiple slides (4:5)</span>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setShowStoryModal(true);
                                setShowOwnerMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-white text-left rounded-b-lg"
                            >
                              <Share2 size={18} className="text-pink-400" />
                              <div>
                                <span className="block font-medium">Instagram Story</span>
                                <span className="text-xs text-gray-400">Scrapbook style (9:16)</span>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Owner Stats - Interactive Like Button */}
                  {quest.isPostedToFeed && quest.associatedPostId && !isEditMode && (
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm mr-2 ${isLiked
                        ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                    >
                      <FaHeart size={18} className={isLiked ? 'fill-current' : ''} />
                      <span className="hidden md:inline">{likeCount}</span>
                    </button>
                  )}



                  {/* Share Button - Only show if posted and NOT in edit mode */}
                  {quest.isPostedToFeed && !isEditMode && (
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                    >
                      <Share2 size={16} />
                      <span className="hidden md:inline">Share</span>
                    </button>
                  )}

                  {!isEditMode && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="hidden lg:flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Edit3 size={16} />
                      <span>Edit</span>
                    </button>
                  )}
                  {isEditMode && (
                    <>
                      <button
                        onClick={() => {
                          setIsEditMode(false);
                          setEditedQuest(JSON.parse(JSON.stringify(quest)));
                        }}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                      >
                        <X size={16} />
                        {/* <span>Cancel</span> */}
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm disabled:opacity-50"
                      >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </>
              ) : quest.isPostedToFeed && quest.associatedPostId ? (
                /* VIEWER VIEW - Like, Comment, Save, More */
                <>
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${isLiked
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }`}
                  >
                    <FaHeart size={18} className={isLiked ? 'fill-current' : ''} />
                    <span className="hidden md:inline">{likeCount}</span>
                  </button>

                  <button
                    onClick={handleSaveQuest}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${isSaved
                      ? 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }`}
                  >
                    <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                    <span className="hidden md:inline">Save</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {/* More Menu Dropdown */}
                    {showMoreMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg border border-gray-700 shadow-xl z-50">
                        <button
                          onClick={() => {
                            setIsShareModalOpen(true);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-white text-left rounded-t-lg"
                        >
                          <Share2 size={16} />
                          <span>Share</span>
                        </button>

                        <button
                          onClick={() => {
                            handleCommentNavigate();
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-white text-left"
                        >
                          <MessageCircle size={16} />
                          <span>Comment</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowReportModal(true);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-red-500 text-left rounded-b-lg"
                        >
                          <Flag size={16} />
                          <span>Report</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : !canEdit ? (
                /* Non-owner viewing private quest - just Copy button */
                <button
                  onClick={handleCopyQuest}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                >
                  <Copy size={16} />
                  <span className="hidden md:inline">Copy</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {showMoreMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Mobile View - Map toggle in header, horizontal cards AFTER map, NO overlaps */}
      <div className="lg:hidden">
        {/* COMPACT HEADER with Map Toggle - Only show when NOT in edit mode */}
        {!isEditMode && (
          <div className="sticky top-[65px] z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
            <div className="px-4 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Map toggle button */}
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm h-10 ${showMap
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-orange-500 text-white'
                    }`}
                >
                  <Map size={18} />
                  <span>{showMap ? 'List View' : 'Map View'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-hidden">
                {/* Day filters (only show when map is visible) */}
                {showMap && (
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mr-2">
                    <button
                      onClick={() => { setMapFilter('all'); setSelectedDay(0); }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mapFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                        }`}
                    >
                      All
                    </button>
                    {displayQuest.itinerary?.days?.map((day: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => { setMapFilter(index); setSelectedDay(index); }}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mapFilter === index ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                          }`}
                      >
                        D{day.day}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mobile Edit Button - Only for owners/editors */}
                {canEdit && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="bg-gray-800 text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-lg"
                  >
                    <Edit3 size={22} />
                    <span className="hidden md:inline">Edit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MAP VIEW - Map at top, horizontal cards BELOW (not overlaying) */}
        {showMap && !isEditMode ? (
          <>
            {/* Map Container - Fixed height, no overlays */}
            <div className="h-[52vh]">
              <InteractiveMap
                flowCards={mapFilter === 'all' ? allActivitiesWithCoords : dayActivitiesWithCoords}
                activeIndex={activeCardIndex}
                onPinClick={(index: number) => setActiveCardIndex(index)}
              />
            </div>

            {/* Horizontal Scrollable Cards - AFTER map (below it), NO overlap */}
            {(mapFilter === 'all' ? allActivitiesWithCoords : dayActivitiesWithCoords).length > 0 && (
              <div className="bg-gray-950 border-t-2 border-gray-800 p-4">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
                  {(mapFilter === 'all' ? allActivitiesWithCoords : dayActivitiesWithCoords).map((activity: any, index: number) => (
                    <div
                      key={index}
                      onClick={() => setActiveCardIndex(index)}
                      className={`flex-shrink-0 w-72 snap-center transition-all cursor-pointer ${activeCardIndex === index
                        ? ' scale-[1.02]'
                        : ' hover:opacity-100'
                        }`}
                    >
                      <MapActivityCard activity={activity} isActive={activeCardIndex === index} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OnQuest People Section */}
            <div className="px-4 pb-6">
              <OnQuestPeopleSection
                quest={displayQuest}
                userId={user?.uid || ''}
              />
            </div>
          </>
        ) : !isEditMode ? (
          /* LIST VIEW - Only show when map is hidden */
          <div className="pt-4">
            <div className="p-4">
              {displayQuest.itinerary?.days?.map((day: any, dayIndex: number) => (
                <div key={dayIndex} className="mb-8">
                  <button
                    onClick={() => toggleDayCollapse(dayIndex)}
                    className="flex items-center gap-3 mb-4 w-full text-left bg-gray-900/50 border border-gray-700 hover:border-gray-600 p-4 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-sm shadow-lg">
                      {day.day}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold">{day.title}</h2>
                      <p className="text-xs text-gray-400">{new Date(day.date).toDateString()}</p>
                    </div>
                    {collapsedDays.has(dayIndex) ? (
                      <ChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <ChevronUp size={20} className="text-gray-400" />
                    )}
                  </button>

                  {!collapsedDays.has(dayIndex) && (
                    <div className="space-y-0 pl-2">
                      {day.activities && day.activities.length > 0 ? (
                        day.activities.map((activity: any, activityIndex: number) => (
                          <React.Fragment key={activityIndex}>
                            {(activity.type === 'travel' || activity.title?.toLowerCase().includes('travel from')) ? (
                              <TravelActivityCard activity={activity} isEditMode={isEditMode} />
                            ) : (
                              <GoogleFormActivityCard
                                activity={activity}
                                isEditMode={isEditMode}
                                dayIndex={dayIndex}
                                activityIndex={activityIndex}
                                totalActivities={day.activities.length}
                                onDelete={() => deleteActivity(dayIndex, activityIndex)}
                                onUpdate={(field: string, value: any) => updateActivity(dayIndex, activityIndex, field, value)}
                                onToggleCollapse={() => toggleCollapse(dayIndex, activityIndex)}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onMoveUp={() => moveActivity(dayIndex, activityIndex, activityIndex - 1)}
                                onMoveDown={() => moveActivity(dayIndex, activityIndex, activityIndex + 1)}
                                uid={user?.uid}
                                onSaveNext={() => handleSaveNext(dayIndex, activityIndex)}
                              />
                            )}
                            {isEditMode && (
                              <div className="flex justify-center items-center gap-2 -my-2 relative z-10">
                                <button
                                  onClick={() => handleAddActivityInline(dayIndex, activityIndex)}
                                  className="p-2 bg-gray-800 hover:bg-orange-500 rounded-full transition-all group"
                                  title="Add activity"
                                >
                                  <Plus size={20} className="text-gray-400 group-hover:text-white" />
                                </button>
                              </div>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        isEditMode && (
                          <div className="flex justify-center items-center py-8">
                            <button
                              onClick={() => handleAddActivityInline(dayIndex, -1)}
                              className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-orange-500 rounded-lg transition-all group"
                            >
                              <Plus size={20} className="text-gray-400 group-hover:text-white" />
                              <span className="text-sm text-gray-400 group-hover:text-white">Add First Activity</span>
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* OnQuest People Section */}
              <div className="mt-8">
                <OnQuestPeopleSection
                  quest={displayQuest}
                  userId={user?.uid || ''}
                />
              </div>
            </div>
          </div>
        ) : (
          /* EDIT MODE - Show full itinerary list */
          <div className="pt-4">
            <div className="p-4">
              {displayQuest.itinerary?.days?.map((day: any, dayIndex: number) => (
                <div key={dayIndex} className="mb-8">
                  <button
                    onClick={() => toggleDayCollapse(dayIndex)}
                    className="flex items-center gap-3 mb-4 w-full text-left bg-gray-900/50 border border-gray-700 hover:border-gray-600 p-4 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-sm shadow-lg">
                      {day.day}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold">{day.title}</h2>
                      <p className="text-xs text-gray-400">{new Date(day.date).toDateString()}</p>
                    </div>
                    {collapsedDays.has(dayIndex) ? (
                      <ChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <ChevronUp size={20} className="text-gray-400" />
                    )}
                  </button>

                  {!collapsedDays.has(dayIndex) && (
                    <div className="space-y-0 pl-2">
                      {day.activities && day.activities.length > 0 ? (
                        day.activities.map((activity: any, activityIndex: number) => (
                          <React.Fragment key={activityIndex}>
                            {(activity.type === 'travel' || activity.title?.toLowerCase().includes('travel from')) ? (
                              <TravelActivityCard activity={activity} isEditMode={isEditMode} />
                            ) : (
                              <GoogleFormActivityCard
                                activity={activity}
                                isEditMode={isEditMode}
                                dayIndex={dayIndex}
                                activityIndex={activityIndex}
                                totalActivities={day.activities.length}
                                onDelete={() => deleteActivity(dayIndex, activityIndex)}
                                onUpdate={(field: string, value: any) => updateActivity(dayIndex, activityIndex, field, value)}
                                onToggleCollapse={() => toggleCollapse(dayIndex, activityIndex)}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onMoveUp={() => moveActivity(dayIndex, activityIndex, activityIndex - 1)}
                                onMoveDown={() => moveActivity(dayIndex, activityIndex, activityIndex + 1)}
                                uid={user?.uid}
                                onSaveNext={() => handleSaveNext(dayIndex, activityIndex)}
                              />
                            )}
                            {isEditMode && (
                              <div className="flex justify-center items-center gap-2 -my-2 relative z-10">
                                <button
                                  onClick={() => handleAddActivityInline(dayIndex, activityIndex)}
                                  className="p-2 bg-gray-800 hover:bg-orange-500 rounded-full transition-all group"
                                  title="Add activity"
                                >
                                  <Plus size={20} className="text-gray-400 group-hover:text-white" />
                                </button>
                              </div>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        isEditMode && (
                          <div className="flex justify-center items-center py-8">
                            <button
                              onClick={() => handleAddActivityInline(dayIndex, -1)}
                              className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-orange-500 rounded-lg transition-all group"
                            >
                              <Plus size={20} className="text-gray-400 group-hover:text-white" />
                              <span className="text-sm text-gray-400 group-hover:text-white">Add First Activity</span>
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* OnQuest People Section */}
              <div className="mt-8">
                <OnQuestPeopleSection
                  quest={displayQuest}
                  userId={user?.uid || ''}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="hidden lg:flex max-w-[100vw] mx-auto h-[calc(100vh-65px)] overflow-hidden">
        {/* LEFT SIDE - Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 scroll-smooth">
          <div className="max-w-4xl mx-auto p-4 md:p-6 pr-8 md:pr-12">
            {displayQuest.itinerary?.days?.map((day: any, dayIndex: number) => (
              <div key={dayIndex} className="mb-8">
                <button
                  onClick={() => toggleDayCollapse(dayIndex)}
                  className="flex items-center gap-3 mb-6 w-full text-left bg-gray-900/50 border border-gray-700 hover:border-gray-600 p-4 rounded-xl transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold shadow-lg">
                    {day.day}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{day.title}</h2>
                    <p className="text-sm text-gray-400">{new Date(day.date).toDateString()}</p>
                  </div>
                  {collapsedDays.has(dayIndex) ? (
                    <ChevronDown size={24} className="text-gray-400" />
                  ) : (
                    <ChevronUp size={24} className="text-gray-400" />
                  )}
                </button>

                {!collapsedDays.has(dayIndex) && (
                  <div className="space-y-0">
                    {day.activities && day.activities.length > 0 ? (
                      day.activities.map((activity: any, activityIndex: number) => (
                        <React.Fragment key={activityIndex}>
                          {(activity.type === 'travel' || activity.title?.toLowerCase().includes('travel from')) ? (
                            <TravelActivityCard activity={activity} isEditMode={isEditMode} />
                          ) : (
                            <GoogleFormActivityCard
                              activity={activity}
                              isEditMode={isEditMode}
                              dayIndex={dayIndex}
                              activityIndex={activityIndex}
                              totalActivities={day.activities.length}
                              onDelete={() => deleteActivity(dayIndex, activityIndex)}
                              onUpdate={(field: string, value: any) => updateActivity(dayIndex, activityIndex, field, value)}
                              onToggleCollapse={() => toggleCollapse(dayIndex, activityIndex)}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              onMoveUp={() => moveActivity(dayIndex, activityIndex, activityIndex - 1)}
                              onMoveDown={() => moveActivity(dayIndex, activityIndex, activityIndex + 1)}
                              uid={user?.uid}
                              onSaveNext={() => handleSaveNext(dayIndex, activityIndex)}
                            />
                          )}
                          {isEditMode && (
                            <div className="flex justify-center items-center gap-2 -my-2 relative z-10">
                              <button
                                onClick={() => handleAddActivityInline(dayIndex, activityIndex)}
                                className="p-2 bg-gray-800 hover:bg-orange-500 rounded-full transition-all group"
                                title="Add activity"
                              >
                                <Plus size={20} className="text-gray-400 group-hover:text-white" />
                              </button>
                            </div>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      isEditMode && (
                        <div className="flex justify-center items-center py-8">
                          <button
                            onClick={() => handleAddActivityInline(dayIndex, -1)}
                            className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-orange-500 rounded-lg transition-all group"
                          >
                            <Plus size={20} className="text-gray-400 group-hover:text-white" />
                            <span className="text-sm text-gray-400 group-hover:text-white">Add First Activity</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-8">
              <OnQuestPeopleSection
                quest={displayQuest}
                userId={user?.uid || ''}
              />
            </div>

            {/* Extra padding at bottom */}
            <div className="h-20"></div>
          </div>
        </div>

        {/* RIGHT SIDE - Sticky Map & Button Panel */}
        {!isEditMode && (
          <div className="w-2/5 min-w-[400px] max-w-[600px] border-l border-gray-800 flex flex-col h-full bg-gray-950">
            {/* Filter buttons - fixed at top */}
            <div className="p-4 border-b border-gray-800 flex-shrink-0 bg-gray-950">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pb-2">
                <Filter size={16} className="text-gray-400 flex-shrink-0" />
                <button
                  onClick={() => setMapFilter('all')}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${mapFilter === 'all'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                  All Days
                </button>
                {displayQuest.itinerary?.days?.map((day: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setMapFilter(index)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${mapFilter === index
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                  >
                    Day {day.day}
                  </button>
                ))}
              </div>
            </div>

            {/* Map - takes all remaining space */}
            <div className="flex-1 overflow-hidden">
              <InteractiveMap
                flowCards={mapFilter === 'all' ? allActivitiesWithCoords : dayActivitiesWithCoords}
                activeIndex={activeCardIndex}
                onPinClick={(index: number) => setActiveCardIndex(index)}
              />
            </div>

            {/* Post Quest button - fixed at bottom */}
            {isOwner && !quest.isPostedToFeed && (
              <div className="p-4 border-t border-gray-800 flex-shrink-0 bg-gray-950">
                <button
                  onClick={() => setShowPostModal(true)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl transition-all text-base font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send size={20} />
                  <span>Post Quest to Feed</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Floating Action Button for Mobile & Tablet */}
      {isOwner && !isEditMode && !quest.isPostedToFeed && (
        <div className="lg:hidden fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full transition-all shadow-2xl hover:scale-105 active:scale-95"
          >
            <Send size={20} className="text-white" />
            <span className="font-semibold text-white">Post Quest</span>
          </button>
        </div>
      )}


      <PostQuestModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        onPost={handlePostQuest}
        questTitle={quest.destination}
        questImages={questImages}
      />

      {/* Video Generation Modal */}
      {showVideoModal && user && quest && (
        <VideoGenerationModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          questId={questId}
          questData={{
            destination: quest.destination,
            userName: user.displayName || 'Traveler',
            userProfilePic: user.photoURL || '',
            coverImageUrl: quest.coverImageUrl || '',
            itinerary: quest.itinerary,
            title: quest.title
          }}
          uid={user.uid}
        />
      )}

      {/* Instagram Story Generator Modal - Coming Soon */}
      {showStoryModal && user && quest && (
        <StoryGeneratorModal
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
          questData={{
            questId: questId,
            title: quest.title || quest.destination,
            destination: quest.destination,
            creatorName: user.displayName || 'Traveler',
            creatorProfilePic: user.photoURL || '',
            startDate: quest.startDate,
            endDate: quest.endDate,
            coverImageUrl: quest.coverImageUrl || '',
            itinerary: quest.itinerary
          }}
        />
      )}

      {/* Instagram Carousel Generator Modal */}
      {showCarouselModal && user && quest && (
        <CarouselGeneratorModal
          isOpen={showCarouselModal}
          onClose={() => setShowCarouselModal(false)}
          questData={{
            questId: questId,
            title: quest.title || quest.destination,
            destination: quest.destination,
            creatorName: user.displayName || 'Traveler',
            creatorProfilePic: user.photoURL || '',
            startDate: quest.startDate,
            endDate: quest.endDate,
            coverImageUrl: quest.coverImageUrl || '',
            totalDays: quest.itinerary?.days?.length || 1,
            itinerary: quest.itinerary
          }}
        />
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Report Quest</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-white focus:outline-none"
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="false_info">False Information</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Additional Details (Optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide more details..."
                  className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-white focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              <button
                onClick={handleReportQuest}
                disabled={!reportReason}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { 
          display: none; 
        } 
        .scrollbar-hide { 
          -ms-overflow-style: none; 
          scrollbar-width: none; 
        }
      `}</style>
    </div>
  );
};

// Map Activity Card for horizontal scroll
const MapActivityCard = ({ activity }: any) => {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-700 h-full cursor-pointer hover:scale-105 transition-transform">
      {activity.media?.[0]?.url && (
        <div className="relative h-32 overflow-hidden">
          <img src={activity.media[0].url} alt={activity.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          {activity.time && (
            <div className="absolute top-2 right-2 bg-black/75 px-2 py-1 rounded-full flex items-center gap-1">
              <Clock size={12} className="text-orange-400" />
              <span className="text-xs font-medium text-white">{activity.time}</span>
            </div>
          )}
        </div>
      )}
      <div className="p-3 space-y-2">
        {!activity.media?.[0]?.url && activity.time && (
          <div className="inline-flex items-center gap-1 bg-gray-800 px-2 py-1 rounded-full">
            <Clock size={12} className="text-orange-400" />
            <span className="text-xs font-medium text-gray-300">{activity.time}</span>
          </div>
        )}
        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{activity.title}</h3>
        {activity.location?.name && (
          <div className="flex items-start gap-1.5 text-gray-400">
            <MapPinIcon size={13} className="flex-shrink-0 mt-0.5 text-orange-400" />
            <span className="text-xs leading-relaxed line-clamp-1">{activity.location.name}</span>
          </div>
        )}
        {activity.description && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{activity.description}</p>
        )}
      </div>
    </div>
  );
};

const TravelActivityCard = ({ activity, isEditMode }: any) => {
  const getIcon = () => {
    const title = activity.title.toLowerCase();
    if (title.includes('fly') || title.includes('flight')) return <Plane size={24} className="text-orange-400" />;
    if (title.includes('train')) return <Train size={24} className="text-orange-400" />;
    if (title.includes('bus')) return <Bus size={24} className="text-orange-400" />;
    if (title.includes('drive') || title.includes('car')) return <Car size={24} className="text-orange-400" />;
    if (title.includes('ferry') || title.includes('ship')) return <Ship size={24} className="text-orange-400" />;
    return <Plane size={24} className="text-orange-400" />;
  };

  return (
    <div className={`relative mb-4 bg-gray-900 rounded-xl border-2 p-4 flex items-center gap-4 ${isEditMode ? 'border-gray-700' : 'border-transparent'}`}>
      <div className="bg-orange-500/10 p-3 rounded-full">{getIcon()}</div>
      <div className="flex-1">
        <h3 className="font-semibold text-white">{activity.title}</h3>
        {activity.description && <p className="text-sm text-gray-400">{activity.description}</p>}
      </div>
    </div>
  );
};

// Activity Image Carousel Component
const ActivityImageCarousel = ({ media }: { media: ActivityMedia[] }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const itemWidth = container.offsetWidth;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setCurrentIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (!media || media.length === 0) return null;

  return (
    <div className="relative w-full">
      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {media.map((mediaItem, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full snap-center"
          >
            <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
              <img
                src={mediaItem.url}
                alt={`Activity ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement)?.remove();
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots and Counter */}
      {media.length > 1 && (
        <>
          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {media.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  scrollContainerRef.current?.scrollTo({
                    left: scrollContainerRef.current.offsetWidth * index,
                    behavior: 'smooth',
                  });
                }}
                className={`h-1.5 rounded-full transition-all ${index === currentIndex
                  ? 'w-6 bg-orange-500'
                  : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                  }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded-full">
            <span className="text-xs font-medium text-white">
              {currentIndex + 1}/{media.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// UPDATED GoogleFormActivityCard Component
// Fixed mobile edit controls and added image management

const GoogleFormActivityCard = ({
  activity,
  isEditMode,
  dayIndex,
  activityIndex,
  totalActivities,
  onDelete,
  onUpdate,
  onToggleCollapse,
  onDragStart,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  uid,
  onSaveNext
}: any) => {
  const isCollapsed = activity.collapsed || false;
  const [isHovered, setIsHovered] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle image file selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && uid) {
      setIsUploading(true);
      try {
        const uploadPromises = files.map(file =>
          compressAndUploadImage(file, 'quest-activities', uid)
        );
        const urls = await Promise.all(uploadPromises);
        const newMedia = urls.map(url => ({ url, type: 'image' as const }));

        // Append to existing media
        const currentMedia = activity.media || [];
        onUpdate('media', [...currentMedia, ...newMedia]);
      } catch (error) {
        console.error('Error uploading images:', error);
        alert('Failed to upload images');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Handle image removal
  const handleRemoveImage = (index: number) => {
    const currentMedia = [...(activity.media || [])];
    currentMedia.splice(index, 1);
    onUpdate('media', currentMedia);
  };

  // Handle add image button click
  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  const currentMedia = activity.media || [];

  return (
    <div
      draggable={isEditMode}
      onDragStart={(e) => onDragStart(e, dayIndex, activityIndex)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, dayIndex, activityIndex)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative mb-4 bg-gray-900 rounded-xl border-2 transition-all ${isEditMode ? 'border-gray-700 hover:border-white focus-within:border-white' : 'border-transparent'
        }`}
    >
      {/* MOBILE EDIT CONTROLS - Floating on the right side, always visible in edit mode */}
      {isEditMode && (
        <>
          {/* Mobile Controls - Visible only on mobile/tablet */}
          <div className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
            <div className="flex flex-col gap-1 bg-white/5 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-gray-700">
              <button
                onClick={onMoveUp}
                disabled={activityIndex === 0}
                className={`p-2 rounded transition-colors ${activityIndex === 0
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-orange-500 active:bg-gray-600'
                  }`}
                title="Move up"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={activityIndex === totalActivities - 1}
                className={`p-2 rounded transition-colors ${activityIndex === totalActivities - 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-orange-500 active:bg-gray-600'
                  }`}
                title="Move down"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Desktop Controls - Hover activated */}
          <div className="hidden lg:block">
            {(isHovered) && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full flex items-center gap-2 pl-2 z-10">
                {/* 6-Dot Drag Handle */}
                <button
                  className="cursor-grab active:cursor-grabbing bg-gray-800 rounded-lg p-2 shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors touch-none"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-gray-500">
                    <circle cx="7" cy="5" r="1.5" />
                    <circle cx="13" cy="5" r="1.5" />
                    <circle cx="7" cy="10" r="1.5" />
                    <circle cx="13" cy="10" r="1.5" />
                    <circle cx="7" cy="15" r="1.5" />
                    <circle cx="13" cy="15" r="1.5" />
                  </svg>
                </button>

                {/* Up/Down Arrows */}
                <div className="flex flex-col gap-1 bg-gray-800 rounded-lg p-1 shadow-lg border border-gray-700">
                  <button
                    onClick={onMoveUp}
                    disabled={activityIndex === 0}
                    className={`p-1.5 rounded transition-colors ${activityIndex === 0
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-orange-500 active:bg-gray-600'
                      }`}
                    title="Move up"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    onClick={onMoveDown}
                    disabled={activityIndex === totalActivities - 1}
                    className={`p-1.5 rounded transition-colors ${activityIndex === totalActivities - 1
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-orange-500 active:bg-gray-600'
                      }`}
                    title="Move down"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3 flex-1 pr-8 lg:pr-0">
          {isCollapsed ? (
            <div className="flex-1">
              <h3 className="font-semibold text-white">{activity.title}</h3>
              <p className="text-xs text-gray-400 mt-1 font-bold">{activity.time}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-orange-400" />
              <span className="text-sm text-gray-400 font-bold">{activity.time}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <button
                onClick={onToggleCollapse}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
              <button
                onClick={onDelete}
                className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
                title="Delete activity"
              >
                <Trash2 size={20} className="text-red-400" />
              </button>
            </>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Image Section with Edit Controls */}
          {isEditMode ? (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Activity Images</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {currentMedia.map((mediaItem: any, index: number) => (
                  <div key={index} className="relative h-24 rounded-lg overflow-hidden bg-gray-800 group">
                    <img
                      src={mediaItem.url}
                      alt={`Activity ${index}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors shadow-lg"
                        title="Remove image"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddImageClick}
                  disabled={isUploading}
                  className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-gray-800/50 group"
                >
                  {isUploading ? (
                    <Loader2 size={24} className="text-orange-500 animate-spin" />
                  ) : (
                    <>
                      <Plus size={24} className="text-gray-500 group-hover:text-orange-500 transition-colors mb-1" />
                      <span className="text-xs text-gray-400 group-hover:text-orange-400">Add</span>
                    </>
                  )}
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          ) : (
            // View Mode - Show carousel if images exist
            currentMedia.length > 0 && (
              <ActivityImageCarousel media={currentMedia} />
            )
          )}


          {isEditMode ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Location <span className="text-red-400">*</span></label>
                <LocationInput
                  value={activity.location?.name || ''}
                  onChange={(locationData) => onUpdate('location', locationData)}
                  placeholder="Search for a location..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Start typing to search with Google Places
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={activity.title}
                  onChange={(e) => onUpdate('title', e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white focus:outline-none"
                  placeholder="Activity title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Time <span className="text-red-400">*</span></label>
                <select
                  value={activity.time || 'Morning'}
                  onChange={(e) => onUpdate('time', e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white focus:outline-none font-bold cursor-pointer"
                  required
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description <span className="text-red-400">*</span></label>
                <p className="text-xs text-gray-500 mb-2">How did you get there? Any tips on what not to do?</p>
                <textarea
                  value={activity.description}
                  onChange={(e) => onUpdate('description', e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white focus:outline-none"
                  placeholder="Start typing your review here..."
                  rows={4}
                  required
                />
              </div>

              <button
                onClick={onSaveNext}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 mt-4"
              >
                <Save size={18} />
                <span>Save & Next</span>
              </button>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{activity.title}</h3>
                {activity.location?.name && (
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <MapPinIcon size={16} className="text-orange-400" />
                    <span className="text-sm">{activity.location.name}</span>
                  </div>
                )}
              </div>
              {activity.description && (
                <p className="text-gray-300 leading-relaxed">{activity.description}</p>
              )}
              {activity.tags && activity.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activity.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-gray-800 text-xs text-gray-300 rounded-full border border-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestViewPage;