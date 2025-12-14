// 'use client';
// import { useState, useRef, useCallback, useEffect } from 'react';
// import { X, Image as ImageIcon, MapPin, Tag, RotateCw, ZoomIn, ZoomOut, Sliders, Loader2 } from 'lucide-react';
// import { createPost, POST_TYPES } from '@/lib/postService';
// import { useUserProfile } from '@/hooks/useUserProfile';

// interface CreatePostModalProps {
//     onClose: () => void;
//     user: {
//         uid: string;
//         displayName?: string;
//         photoURL?: string;
//     };
// }

// interface ImageAdjustments {
//     brightness: number;
//     contrast: number;
//     saturation: number;
//     rotation: number;
//     scale: number;
//     positionX: number;
//     positionY: number;
// }

// interface PlaceSuggestion {
//     placePrediction: {
//         placeId: string;
//         text: {
//             text: string;
//         };
//         structuredFormat: {
//             mainText: {
//                 text: string;
//             };
//             secondaryText: {
//                 text: string;
//             };
//         };
//     };
// }

// const CreatePostModal = ({ onClose, user }: CreatePostModalProps) => {

//     const [post , setPost]=useState(true);
//     const [quest , setQuest]=useState(false);

//     const [text, setText] = useState('');
//     const [selectedImages, setSelectedImages] = useState<File[]>([]);
//     const [imagePreviews, setImagePreviews] = useState<string[]>([]);
//     const [locationString, setLocationString] = useState('');
//     const [locationQuery, setLocationQuery] = useState('');
//     const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
//     const [showSuggestions, setShowSuggestions] = useState(false);
//     const [selectedPlace, setSelectedPlace] = useState<any>(null);
//     const [tags, setTags] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [showTagInput, setShowTagInput] = useState(false);
//     const [showAdjustments, setShowAdjustments] = useState(false);
//     const [currentImageIndex, setCurrentImageIndex] = useState(0);

//     const [imageAdjustments, setImageAdjustments] = useState<ImageAdjustments>({
//         brightness: 100,
//         contrast: 100,
//         saturation: 100,
//         rotation: 0,
//         scale: 1,
//         positionX: 0,
//         positionY: 0
//     });
//     const [isDragging, setIsDragging] = useState(false);
//     const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

//     const fileInputRef = useRef<HTMLInputElement>(null);
//     const imageContainerRef = useRef<HTMLDivElement>(null);
//     const locationInputRef = useRef<HTMLInputElement>(null);
//     const suggestionsRef = useRef<HTMLDivElement>(null);

//     // Instagram 4:5 ratio dimensions
//     const TARGET_WIDTH = 1080;
//     const TARGET_HEIGHT = 1350;
//     const ASPECT_RATIO = 4 / 5;

//     // Reset adjustments when switching images
//     useEffect(() => {
//         setImageAdjustments({
//             brightness: 100,
//             contrast: 100,
//             saturation: 100,
//             rotation: 0,
//             scale: 1,
//             positionX: 0,
//             positionY: 0
//         });
//     }, [currentImageIndex]);

//     // Close suggestions when clicking outside
//     useEffect(() => {
//         const handleClickOutside = (event: MouseEvent) => {
//             if (
//                 suggestionsRef.current &&
//                 !suggestionsRef.current.contains(event.target as Node) &&
//                 locationInputRef.current &&
//                 !locationInputRef.current.contains(event.target as Node)
//             ) {
//                 setShowSuggestions(false);
//             }
//         };

//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, []);

//     // Fetch place suggestions using new AutocompleteSuggestion API
//     const fetchPlaceSuggestions = useCallback(async (input: string) => {
//         if (!input.trim() || input.length < 3) {
//             setSuggestions([]);
//             return;
//         }

//         try {
//             const response = await fetch('/api/places-autocomplete', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ input }),
//             });

//             if (!response.ok) {
//                 throw new Error('Failed to fetch suggestions');
//             }

//             const data = await response.json();
//             setSuggestions(data.suggestions || []);
//             setShowSuggestions(true);
//         } catch (error) {
//             console.error('Error fetching place suggestions:', error);
//             setSuggestions([]);
//         }
//     }, []);

//     // Debounce location input
//     useEffect(() => {
//         const timer = setTimeout(() => {
//             if (locationQuery) {
//                 fetchPlaceSuggestions(locationQuery);
//             }
//         }, 300);

//         return () => clearTimeout(timer);
//     }, [locationQuery, fetchPlaceSuggestions]);

//     // Handle place selection
//     const handlePlaceSelect = async (suggestion: PlaceSuggestion) => {
//         const placeText = suggestion.placePrediction.text.text;
//         setLocationString(placeText);
//         setLocationQuery(placeText);
//         setSelectedPlace(suggestion);
//         setShowSuggestions(false);

//         // Optionally fetch place details
//         try {
//             const response = await fetch('/api/place-details', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ placeId: suggestion.placePrediction.placeId }),
//             });

//             if (response.ok) {
//                 const details = await response.json();
//                 console.log('Place details:', details);
//             }
//         } catch (error) {
//             console.error('Error fetching place details:', error);
//         }
//     };

//     // Process image with adjustments
//     const processImage = useCallback((file: File, adjustments: ImageAdjustments): Promise<string> => {
//         return new Promise((resolve) => {
//             const reader = new FileReader();
//             reader.onload = (event) => {
//                 if (typeof event.target?.result === 'string') {
//                     const img = new Image();
//                     img.onload = () => {
//                         const canvas = document.createElement('canvas');
//                         const ctx = canvas.getContext('2d');

//                         canvas.width = TARGET_WIDTH;
//                         canvas.height = TARGET_HEIGHT;

//                         if (ctx) {
//                             // Fill with black background
//                             ctx.fillStyle = '#000000';
//                             ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

//                             // Apply filters
//                             ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;

//                             // Calculate dimensions to fit the image
//                             const imgRatio = img.width / img.height;
//                             let drawWidth, drawHeight;

//                             if (imgRatio > ASPECT_RATIO) {
//                                 drawHeight = TARGET_HEIGHT;
//                                 drawWidth = drawHeight * imgRatio;
//                             } else {
//                                 drawWidth = TARGET_WIDTH;
//                                 drawHeight = drawWidth / imgRatio;
//                             }

//                             // Apply scale
//                             drawWidth *= adjustments.scale;
//                             drawHeight *= adjustments.scale;

//                             // Calculate position with adjustments
//                             let x = (TARGET_WIDTH - drawWidth) / 2 + adjustments.positionX;
//                             let y = (TARGET_HEIGHT - drawHeight) / 2 + adjustments.positionY;

//                             // Apply rotation
//                             ctx.save();
//                             ctx.translate(TARGET_WIDTH / 2, TARGET_HEIGHT / 2);
//                             ctx.rotate((adjustments.rotation * Math.PI) / 180);
//                             ctx.translate(-TARGET_WIDTH / 2, -TARGET_HEIGHT / 2);

//                             ctx.drawImage(img, x, y, drawWidth, drawHeight);
//                             ctx.restore();
//                         }

//                         resolve(canvas.toDataURL('image/jpeg', 0.92));
//                     };
//                     img.src = event.target.result;
//                 }
//             };
//             reader.readAsDataURL(file);
//         });
//     }, []);

//     const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//         const files = Array.from(e.target.files || []);
//         if (files.length === 0) return;

//         const newFiles = files.slice(0, 10 - selectedImages.length);

//         const previews = await Promise.all(
//             newFiles.map(file => processImage(file, imageAdjustments))
//         );

//         setSelectedImages(prev => [...prev, ...newFiles]);
//         setImagePreviews(prev => [...prev, ...previews]);
//     };

//     const removeImage = (index: number) => {
//         setSelectedImages(prev => prev.filter((_, i) => i !== index));
//         setImagePreviews(prev => prev.filter((_, i) => i !== index));
//         if (currentImageIndex >= selectedImages.length - 1) {
//             setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
//         }
//     };

//     const handleAdjustmentChange = async (key: keyof ImageAdjustments, value: number) => {
//         const newAdjustments = { ...imageAdjustments, [key]: value };
//         setImageAdjustments(newAdjustments);

//         if (selectedImages[currentImageIndex]) {
//             const newPreview = await processImage(selectedImages[currentImageIndex], newAdjustments);
//             setImagePreviews(prev => {
//                 const updated = [...prev];
//                 updated[currentImageIndex] = newPreview;
//                 return updated;
//             });
//         }
//     };

//     const handleZoomIn = () => {
//         const newScale = Math.min(imageAdjustments.scale + 0.1, 3);
//         handleAdjustmentChange('scale', newScale);
//     };

//     const handleZoomOut = () => {
//         const newScale = Math.max(imageAdjustments.scale - 0.1, 1);
//         handleAdjustmentChange('scale', newScale);
//     };

//     const handleRotate = () => {
//         const newRotation = (imageAdjustments.rotation + 90) % 360;
//         handleAdjustmentChange('rotation', newRotation);
//     };

//     const handleMouseDown = (e: React.MouseEvent) => {
//         if (imageAdjustments.scale <= 1) return;
//         setIsDragging(true);
//         setDragStart({ x: e.clientX - imageAdjustments.positionX, y: e.clientY - imageAdjustments.positionY });
//     };

//     const handleMouseMove = (e: React.MouseEvent) => {
//         if (!isDragging) return;
//         const newX = e.clientX - dragStart.x;
//         const newY = e.clientY - dragStart.y;

//         const maxPan = 200 * (imageAdjustments.scale - 1);
//         const limitedX = Math.max(-maxPan, Math.min(maxPan, newX));
//         const limitedY = Math.max(-maxPan, Math.min(maxPan, newY));

//         setImageAdjustments(prev => ({ ...prev, positionX: limitedX, positionY: limitedY }));
//     };

//     const handleMouseUp = async () => {
//         if (isDragging) {
//             setIsDragging(false);
//             if (selectedImages[currentImageIndex]) {
//                 const newPreview = await processImage(selectedImages[currentImageIndex], imageAdjustments);
//                 setImagePreviews(prev => {
//                     const updated = [...prev];
//                     updated[currentImageIndex] = newPreview;
//                     return updated;
//                 });
//             }
//         }
//     };

//     const handleTouchStart = (e: React.TouchEvent) => {
//         if (imageAdjustments.scale <= 1 || e.touches.length !== 1) return;
//         const touch = e.touches[0];
//         setIsDragging(true);
//         setDragStart({ x: touch.clientX - imageAdjustments.positionX, y: touch.clientY - imageAdjustments.positionY });
//     };

//     const handleTouchMove = (e: React.TouchEvent) => {
//         if (!isDragging || e.touches.length !== 1) return;
//         const touch = e.touches[0];
//         const newX = touch.clientX - dragStart.x;
//         const newY = touch.clientY - dragStart.y;

//         const maxPan = 200 * (imageAdjustments.scale - 1);
//         const limitedX = Math.max(-maxPan, Math.min(maxPan, newX));
//         const limitedY = Math.max(-maxPan, Math.min(maxPan, newY));

//         setImageAdjustments(prev => ({ ...prev, positionX: limitedX, positionY: limitedY }));
//     };

//     const handleTouchEnd = async () => {
//         if (isDragging) {
//             setIsDragging(false);
//             if (selectedImages[currentImageIndex]) {
//                 const newPreview = await processImage(selectedImages[currentImageIndex], imageAdjustments);
//                 setImagePreviews(prev => {
//                     const updated = [...prev];
//                     updated[currentImageIndex] = newPreview;
//                     return updated;
//                 });
//             }
//         }
//     };

//     const resetAdjustments = () => {
//         handleAdjustmentChange('brightness', 100);
//         handleAdjustmentChange('contrast', 100);
//         handleAdjustmentChange('saturation', 100);
//         handleAdjustmentChange('rotation', 0);
//         handleAdjustmentChange('scale', 1);
//         handleAdjustmentChange('positionX', 0);
//         handleAdjustmentChange('positionY', 0);
//     };

//     const handlePost = async () => {
//         if (!text.trim() || !locationString.trim()) {
//             alert('Please add text and location for your post');
//             return;
//         }

//         if (selectedImages.length === 0) {
//             alert('Please add at least one image');
//             return;
//         }

//         setLoading(true);

//         try {
//             const tagsArray = tags
//                 .split(',')
//                 .map(tag => tag.trim())
//                 .filter(tag => tag.length > 0);

//             const processedImageFiles = await Promise.all(
//                 selectedImages.map(async (file, index) => {
//                     const base64 = await processImage(file, imageAdjustments);
//                     const response = await fetch(base64);
//                     const blob = await response.blob();
//                     const baseName = file.name.replace(/\.[^/.]+$/, '');
//                     const newFileName = `${baseName}_processed.jpeg`;
//                     return new File([blob], newFileName, {
//                         type: 'image/jpeg',
//                         lastModified: file.lastModified,
//                     });
//                 })
//             );

//             await createPost({
//                 uid: user.uid,
//                 userName: user.displayName || 'Anonymous',
//                 userProfilePic: user.photoURL || '',
//                 text: text.trim(),
//                 imageFiles: processedImageFiles,
//                 location: locationString.trim(),
//                 topics: tagsArray,
//                 type: POST_TYPES.REGULAR
//             });

//             onClose();
//         } catch (error) {
//             console.error('Error creating post:', error);
//             alert('Failed to create post. Please try again.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handlepostQuestToggle=()=>{
//         setPost(!post);
//         setQuest(!quest);
//     }

//     return (
//         <>
//         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
//             <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">


//                     {/* Header */}
//                 <div className="flex items-center justify-between p-4 border-b border-gray-800">
//                     <button className="text-xl font-semibold text-white" onClick={handlepostQuestToggle} >Post</button>
//                     <button className="text-xl font-semibold text-white"onClick={handlepostQuestToggle} >Quest</button>
//                     <button
//                         onClick={onClose}
//                         className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
//                     >
//                         <X className="w-5 h-5" />
//                     </button>
//                 </div>

//                 {post && (
//                     <div>

//                 {/* Scrollable Content */}
//                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
//                     {/* Caption Input */}


//                     {/* Image Controls */}
//                     {imagePreviews.length > 0 && (
//                         <div className="space-y-3">
//                             <div className="flex items-center justify-between">
//                                 <div className="flex items-center gap-2">
//                                     <button
//                                         onClick={handleZoomOut}
//                                         disabled={imageAdjustments.scale <= 1}
//                                         className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                     >
//                                         <ZoomOut className="w-5 h-5" />
//                                     </button>
//                                     <span className="text-sm text-gray-400 min-w-[60px] text-center">
//                                         {imageAdjustments.scale.toFixed(1)}x
//                                     </span>
//                                     <button
//                                         onClick={handleZoomIn}
//                                         disabled={imageAdjustments.scale >= 3}
//                                         className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                     >
//                                         <ZoomIn className="w-5 h-5" />
//                                     </button>
//                                     <button
//                                         onClick={handleRotate}
//                                         className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors ml-2"
//                                     >
//                                         <RotateCw className="w-5 h-5" />
//                                     </button>
//                                 </div>

//                                 <button
//                                     onClick={() => setShowAdjustments(!showAdjustments)}
//                                     className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
//                                         showAdjustments ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
//                                     }`}
//                                 >
//                                     <Sliders className="w-4 h-4" />
//                                     <span className="text-sm">Adjust</span>
//                                 </button>
//                             </div>

//                             {imageAdjustments.scale > 1 && (
//                                 <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-2 text-center">
//                                     💡 Drag the image to reposition when zoomed
//                                 </div>
//                             )}

//                             {showAdjustments && (
//                                 <div className="bg-gray-800 rounded-lg p-4 space-y-4">
//                                     <div className="flex items-center justify-between mb-2">
//                                         <h3 className="text-sm font-semibold text-gray-300">Advanced Settings</h3>
//                                         <button
//                                             onClick={resetAdjustments}
//                                             className="text-xs text-orange-400 hover:text-orange-300"
//                                         >
//                                             Reset All
//                                         </button>
//                                     </div>

//                                     <div>
//                                         <label className="text-xs text-gray-400 block mb-1">
//                                             Brightness: {imageAdjustments.brightness}%
//                                         </label>
//                                         <input
//                                             type="range"
//                                             min="50"
//                                             max="150"
//                                             value={imageAdjustments.brightness}
//                                             onChange={(e) => handleAdjustmentChange('brightness', Number(e.target.value))}
//                                             className="w-full accent-orange-500"
//                                         />
//                                     </div>

//                                     <div>
//                                         <label className="text-xs text-gray-400 block mb-1">
//                                             Contrast: {imageAdjustments.contrast}%
//                                         </label>
//                                         <input
//                                             type="range"
//                                             min="50"
//                                             max="150"
//                                             value={imageAdjustments.contrast}
//                                             onChange={(e) => handleAdjustmentChange('contrast', Number(e.target.value))}
//                                             className="w-full accent-orange-500"
//                                         />
//                                     </div>

//                                     <div>
//                                         <label className="text-xs text-gray-400 block mb-1">
//                                             Saturation: {imageAdjustments.saturation}%
//                                         </label>
//                                         <input
//                                             type="range"
//                                             min="0"
//                                             max="200"
//                                             value={imageAdjustments.saturation}
//                                             onChange={(e) => handleAdjustmentChange('saturation', Number(e.target.value))}
//                                             className="w-full accent-orange-500"
//                                         />
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {/* Image Previews */}
//                     {imagePreviews.length > 0 && (
//                         <div className={`grid ${imagePreviews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
//                             {imagePreviews.map((preview, index) => (
//                                 <div 
//                                     key={index} 
//                                     className={`relative cursor-pointer rounded-lg overflow-hidden ${
//                                         index === currentImageIndex ? 'ring-2 ring-orange-400' : ''
//                                     }`}
//                                     onClick={() => setCurrentImageIndex(index)}
//                                 >
//                                     <div 
//                                         ref={index === currentImageIndex ? imageContainerRef : null}
//                                         className="relative w-full bg-black select-none"
//                                         style={{ paddingBottom: '125%' }}
//                                         onMouseDown={index === currentImageIndex ? handleMouseDown : undefined}
//                                         onMouseMove={index === currentImageIndex ? handleMouseMove : undefined}
//                                         onMouseUp={index === currentImageIndex ? handleMouseUp : undefined}
//                                         onMouseLeave={index === currentImageIndex ? handleMouseUp : undefined}
//                                         onTouchStart={index === currentImageIndex ? handleTouchStart : undefined}
//                                         onTouchMove={index === currentImageIndex ? handleTouchMove : undefined}
//                                         onTouchEnd={index === currentImageIndex ? handleTouchEnd : undefined}
//                                     >
//                                         <img 
//                                             src={preview} 
//                                             alt={`Preview ${index + 1}`} 
//                                             className="absolute inset-0 w-full h-full object-contain"
//                                             draggable={false}
//                                         />
//                                     </div>
//                                     <button
//                                         onClick={(e) => {
//                                             e.stopPropagation();
//                                             removeImage(index);
//                                         }}
//                                         className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors z-10"
//                                     >
//                                         <X className="w-4 h-4" />
//                                     </button>
//                                     {imagePreviews.length > 1 && (
//                                         <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
//                                             {index + 1}/{imagePreviews.length}
//                                         </div>
//                                     )}
//                                 </div>
//                             ))}
//                         </div>
//                     )}

//                     {imagePreviews.length === 0 && (
//                         <button
//                             onClick={() => fileInputRef.current?.click()}
//                             className="w-full border-2 border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center gap-3 hover:border-orange-400 hover:bg-gray-800/30 transition-all group"
//                         >
//                             <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center group-hover:bg-orange-600 transition-colors">
//                                 <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-white" />
//                             </div>
//                             <div className="text-center">
//                                 <p className="text-white font-medium mb-1">Add Photos</p>
//                                 <p className="text-sm text-gray-400">Click to upload images</p>
//                             </div>
//                         </button>
//                     )}

//                     {imagePreviews.length > 0 && imagePreviews.length < 10 && (
//                         <button
//                             onClick={() => fileInputRef.current?.click()}
//                             className="w-full flex items-center justify-center gap-2 py-3 border border-gray-700 rounded-lg text-orange-400 hover:bg-gray-800 transition-colors"
//                         >
//                             <ImageIcon className="w-5 h-5" />
//                             <span>Add More Photos ({imagePreviews.length}/10)</span>
//                         </button>
//                     )}

//                     {/* Tags */}
//                     <div className="space-y-2">
//                         <button
//                             onClick={() => setShowTagInput(!showTagInput)}
//                             className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
//                         >
//                             <Tag className="w-5 h-5" />
//                             <span>{showTagInput || tags ? 'Edit Tags' : 'Add Tags'}</span>
//                         </button>

//                         {showTagInput && (
//                             <input
//                                 type="text"
//                                 placeholder="travel, adventure, nature..."
//                                 value={tags}
//                                 onChange={(e) => setTags(e.target.value)}
//                                 className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
//                             />
//                         )}
//                     </div>


//                     {/* Location Input with Autocomplete */}
//                     <div className="relative">
//                         <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus-within:border-orange-400">
//                             <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
//                             <input
//                                 ref={locationInputRef}
//                                 type="text"
//                                 placeholder="Add location..."
//                                 value={locationQuery}
//                                 onChange={(e) => {
//                                     setLocationQuery(e.target.value);
//                                     setLocationString('');
//                                 }}
//                                 onFocus={() => {
//                                     if (suggestions.length > 0) {
//                                         setShowSuggestions(true);
//                                     }
//                                 }}
//                                 className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
//                             />
//                         </div>

//                         {/* Suggestions Dropdown */}
//                         {showSuggestions && suggestions.length > 0 && (
//                             <div
//                                 ref={suggestionsRef}
//                                 className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50"
//                             >
//                                 {suggestions.map((suggestion, index) => (
//                                     <button
//                                         key={index}
//                                         onClick={() => handlePlaceSelect(suggestion)}
//                                         className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
//                                     >
//                                         <div className="text-white text-sm font-medium">
//                                             {suggestion.placePrediction.structuredFormat.mainText.text}
//                                         </div>
//                                         <div className="text-gray-400 text-xs mt-0.5">
//                                             {suggestion.placePrediction.structuredFormat.secondaryText.text}
//                                         </div>
//                                     </button>
//                                 ))}
//                             </div>
//                         )}
//                     </div>

//                         <textarea
//                         placeholder="Your journey, your words…"
//                         value={text}
//                         onChange={(e) => setText(e.target.value)}
//                         rows={3}
//                         className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none text-lg"
//                     />



//                 </div>

//                 {/* Footer */}
//                 <div className="p-4 border-t border-gray-800">
//                     <button
//                         onClick={handlePost}
//                         disabled={loading || !text.trim() || !locationString.trim() || selectedImages.length === 0}
//                         className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold py-3 rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
//                     >
//                         {loading ? (
//                             <>
//                                 <Loader2 className="w-5 h-5 animate-spin" />
//                                 <span>Posting...</span>
//                             </>
//                         ) : (
//                             <span>Post</span>
//                         )}
//                     </button>
//                     {(!text.trim() || !locationString.trim() || selectedImages.length === 0) && (
//                         <p className="text-xs text-gray-500 text-center mt-2">
//                             {!text.trim() ? 'Add caption' : !locationString.trim() ? 'Add location' : 'Add at least one photo'}
//                         </p>
//                     )}
//                 </div>

//                 <input
//                     ref={fileInputRef}
//                     type="file"
//                     accept="image/*"
//                     multiple 
//                     onChange={handleImageSelect}
//                     className="hidden"
//                 />
//                 </div>

//                 )}

//                 {quest && (
//                     <div>
//                         <button>button-1</button>
//                         <button>button-2</button>
//                     </div>

//                 )
//                 }
//             </div>
//         </div>
//     </>
//     );
// };

// export default CreatePostModal;







'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Image as ImageIcon, MapPin, Tag, RotateCw, ZoomIn, ZoomOut, Sliders, Loader2 } from 'lucide-react';
import { createPost, POST_TYPES } from '@/lib/postService';
import { useUserProfile } from '@/hooks/useUserProfile';
import Logo from '../../public/oq_logo.svg';
// import Image from 'next/image';
import { useRouter } from 'next/navigation';


interface CreatePostModalProps {
  onClose: () => void;
  user: {
    uid: string;
    displayName?: string;
    photoURL?: string;
  };
}

interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  scale: number;
  positionX: number;
  positionY: number;
}

interface PlaceSuggestion {
  placePrediction: {
    placeId: string;
    text: {
      text: string;
    };
    structuredFormat: {
      mainText: {
        text: string;
      };
      secondaryText: {
        text: string;
      };
    };
  };
}

const CreatePostModal = ({ onClose, user }: CreatePostModalProps) => {

  const router = useRouter();

  const [post, setPost] = useState(false);
  const [quest, setQuest] = useState(true);

  const [text, setText] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [locationString, setLocationString] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [imageAdjustments, setImageAdjustments] = useState<ImageAdjustments>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rotation: 0,
    scale: 1,
    positionX: 0,
    positionY: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Instagram 4:5 ratio dimensions
  const TARGET_WIDTH = 1080;
  const TARGET_HEIGHT = 1350;
  const ASPECT_RATIO = 4 / 5;

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Reset adjustments when switching images
  useEffect(() => {
    setImageAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      rotation: 0,
      scale: 1,
      positionX: 0,
      positionY: 0
    });
  }, [currentImageIndex]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch place suggestions using new AutocompleteSuggestion API
  const fetchPlaceSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch('/api/places-autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching place suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  // Debounce location input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationQuery) {
        fetchPlaceSuggestions(locationQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationQuery, fetchPlaceSuggestions]);

  // Handle place selection
  const handlePlaceSelect = async (suggestion: PlaceSuggestion) => {
    const placeText = suggestion.placePrediction.text.text;
    setLocationString(placeText);
    setLocationQuery(placeText);
    setSelectedPlace(suggestion);
    setShowSuggestions(false);

    // Optionally fetch place details
    try {
      const response = await fetch('/api/place-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ placeId: suggestion.placePrediction.placeId }),
      });

      if (response.ok) {
        const details = await response.json();
        console.log('Place details:', details);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  // Process image with adjustments
  const processImage = useCallback((file: File, adjustments: ImageAdjustments): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = TARGET_WIDTH;
            canvas.height = TARGET_HEIGHT;

            if (ctx) {
              // Fill with black background
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

              // Apply filters
              ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;

              // Calculate dimensions to fit the image
              const imgRatio = img.width / img.height;
              let drawWidth: number, drawHeight: number;

              if (imgRatio > ASPECT_RATIO) {
                drawHeight = TARGET_HEIGHT;
                drawWidth = drawHeight * imgRatio;
              } else {
                drawWidth = TARGET_WIDTH;
                drawHeight = drawWidth / imgRatio;
              }

              // Apply scale
              drawWidth *= adjustments.scale;
              drawHeight *= adjustments.scale;

              // Calculate position with adjustments
              let x = (TARGET_WIDTH - drawWidth) / 2 + adjustments.positionX;
              let y = (TARGET_HEIGHT - drawHeight) / 2 + adjustments.positionY;

              // Apply rotation
              ctx.save();
              ctx.translate(TARGET_WIDTH / 2, TARGET_HEIGHT / 2);
              ctx.rotate((adjustments.rotation * Math.PI) / 180);
              ctx.translate(-TARGET_WIDTH / 2, -TARGET_HEIGHT / 2);

              ctx.drawImage(img, x, y, drawWidth, drawHeight);
              ctx.restore();
            }

            resolve(canvas.toDataURL('image/jpeg', 0.92));
          };
          img.src = event.target.result;
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.slice(0, 10 - selectedImages.length);

    const previews = await Promise.all(
      newFiles.map(file => processImage(file, imageAdjustments))
    );

    setSelectedImages(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (currentImageIndex >= selectedImages.length - 1) {
      setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
    }
  };

  const handleAdjustmentChange = async (key: keyof ImageAdjustments, value: number) => {
    const newAdjustments = { ...imageAdjustments, [key]: value };
    setImageAdjustments(newAdjustments);

    if (selectedImages[currentImageIndex]) {
      const newPreview = await processImage(selectedImages[currentImageIndex], newAdjustments);
      setImagePreviews(prev => {
        const updated = [...prev];
        updated[currentImageIndex] = newPreview;
        return updated;
      });
    }
  };

  const handleZoomIn = () => {
    const newScale = Math.min(imageAdjustments.scale + 0.1, 3);
    handleAdjustmentChange('scale', newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(imageAdjustments.scale - 0.1, 1);
    handleAdjustmentChange('scale', newScale);
  };

  const handleRotate = () => {
    const newRotation = (imageAdjustments.rotation + 90) % 360;
    handleAdjustmentChange('rotation', newRotation);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageAdjustments.scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - imageAdjustments.positionX, y: e.clientY - imageAdjustments.positionY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const maxPan = 200 * (imageAdjustments.scale - 1);
    const limitedX = Math.max(-maxPan, Math.min(maxPan, newX));
    const limitedY = Math.max(-maxPan, Math.min(maxPan, newY));

    setImageAdjustments(prev => ({ ...prev, positionX: limitedX, positionY: limitedY }));
  };

  const handleMouseUp = async () => {
    if (isDragging) {
      setIsDragging(false);
      if (selectedImages[currentImageIndex]) {
        const newPreview = await processImage(selectedImages[currentImageIndex], imageAdjustments);
        setImagePreviews(prev => {
          const updated = [...prev];
          updated[currentImageIndex] = newPreview;
          return updated;
        });
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageAdjustments.scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - imageAdjustments.positionX, y: touch.clientY - imageAdjustments.positionY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;

    const maxPan = 200 * (imageAdjustments.scale - 1);
    const limitedX = Math.max(-maxPan, Math.min(maxPan, newX));
    const limitedY = Math.max(-maxPan, Math.min(maxPan, newY));

    setImageAdjustments(prev => ({ ...prev, positionX: limitedX, positionY: limitedY }));
  };

  const handleTouchEnd = async () => {
    if (isDragging) {
      setIsDragging(false);
      if (selectedImages[currentImageIndex]) {
        const newPreview = await processImage(selectedImages[currentImageIndex], imageAdjustments);
        setImagePreviews(prev => {
          const updated = [...prev];
          updated[currentImageIndex] = newPreview;
          return updated;
        });
      }
    }
  };

  const resetAdjustments = () => {
    handleAdjustmentChange('brightness', 100);
    handleAdjustmentChange('contrast', 100);
    handleAdjustmentChange('saturation', 100);
    handleAdjustmentChange('rotation', 0);
    handleAdjustmentChange('scale', 1);
    handleAdjustmentChange('positionX', 0);
    handleAdjustmentChange('positionY', 0);
  };

  const handlePost = async () => {
    setErrorMessage('');

    if (!text.trim()) {
      setErrorMessage('Please add a caption for your post');
      return;
    }

    if (selectedImages.length === 0) {
      setErrorMessage('Please add at least one image');
      return;
    }

    if (!locationString.trim()) {
      setErrorMessage('Please add a location for your post');
      return;
    }

    setLoading(true);

    try {
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const processedImageFiles = await Promise.all(
        selectedImages.map(async (file, index) => {
          const base64 = await processImage(file, imageAdjustments);
          const response = await fetch(base64);
          const blob = await response.blob();
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const newFileName = `${baseName}_processed.jpeg`;
          return new File([blob], newFileName, {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });
        })
      );

      await createPost({
        uid: user.uid,
        userName: user.displayName || 'Anonymous',
        userProfilePic: user.photoURL || '',
        text: text.trim(),
        imageFiles: processedImageFiles,
        location: locationString.trim(),
        topics: tagsArray,
        type: POST_TYPES.REGULAR
      });

      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      setErrorMessage('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // cleaner toggle: explicitly set which mode you want
  const showMode = (mode: 'post' | 'quest') => {
    setPost(mode === 'post');
    setQuest(mode === 'quest');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex gap-3">
              <button className={`text-lg font-semibold ${post ? 'text-white' : 'text-gray-400'}`} onClick={() => showMode('post')}>Post</button>
              <button className={`text-lg font-semibold ${quest ? 'text-white' : 'text-gray-400'}`} onClick={() => showMode('quest')}>Quest</button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* POST MODE */}
          {post && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Caption Input */}
                <textarea
                  placeholder="Your journey, your words…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none text-lg"
                />

                {/* Image Controls */}
                {imagePreviews.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleZoomOut}
                          disabled={imageAdjustments.scale <= 1}
                          className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ZoomOut className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-gray-400 min-w-[60px] text-center">
                          {imageAdjustments.scale.toFixed(1)}x
                        </span>
                        <button
                          onClick={handleZoomIn}
                          disabled={imageAdjustments.scale >= 3}
                          className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ZoomIn className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleRotate}
                          className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors ml-2"
                        >
                          <RotateCw className="w-5 h-5" />
                        </button>
                      </div>

                      <button
                        onClick={() => setShowAdjustments(!showAdjustments)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showAdjustments ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                      >
                        <Sliders className="w-4 h-4" />
                        <span className="text-sm">Adjust</span>
                      </button>
                    </div>

                    {imageAdjustments.scale > 1 && (
                      <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-2 text-center">
                        💡 Drag the image to reposition when zoomed
                      </div>
                    )}

                    {showAdjustments && (
                      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-300">Advanced Settings</h3>
                          <button onClick={resetAdjustments} className="text-xs text-orange-400 hover:text-orange-300">Reset All</button>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Brightness: {imageAdjustments.brightness}%</label>
                          <input type="range" min="50" max="150" value={imageAdjustments.brightness} onChange={(e) => handleAdjustmentChange('brightness', Number(e.target.value))} className="w-full accent-orange-500" />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Contrast: {imageAdjustments.contrast}%</label>
                          <input type="range" min="50" max="150" value={imageAdjustments.contrast} onChange={(e) => handleAdjustmentChange('contrast', Number(e.target.value))} className="w-full accent-orange-500" />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Saturation: {imageAdjustments.saturation}%</label>
                          <input type="range" min="0" max="200" value={imageAdjustments.saturation} onChange={(e) => handleAdjustmentChange('saturation', Number(e.target.value))} className="w-full accent-orange-500" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className={`grid ${imagePreviews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className={`relative cursor-pointer rounded-lg overflow-hidden ${index === currentImageIndex ? 'ring-2 ring-orange-400' : ''}`} onClick={() => setCurrentImageIndex(index)}>
                        <div ref={index === currentImageIndex ? imageContainerRef : null} className="relative w-full bg-black select-none" style={{ paddingBottom: '125%' }}
                          onMouseDown={index === currentImageIndex ? handleMouseDown : undefined}
                          onMouseMove={index === currentImageIndex ? handleMouseMove : undefined}
                          onMouseUp={index === currentImageIndex ? handleMouseUp : undefined}
                          onMouseLeave={index === currentImageIndex ? handleMouseUp : undefined}
                          onTouchStart={index === currentImageIndex ? handleTouchStart : undefined}
                          onTouchMove={index === currentImageIndex ? handleTouchMove : undefined}
                          onTouchEnd={index === currentImageIndex ? handleTouchEnd : undefined}
                        >
                          <img src={preview} alt={`Preview ${index + 1}`} className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                        </div>

                        <button onClick={(e) => { e.stopPropagation(); removeImage(index); }} className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors z-10">
                          <X className="w-4 h-4" />
                        </button>

                        {imagePreviews.length > 1 && (
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">{index + 1}/{imagePreviews.length}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {imagePreviews.length === 0 && (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center gap-3 hover:border-orange-400 hover:bg-gray-800/30 transition-all group">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                      <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-medium mb-1">Add Photos</p>
                      <p className="text-sm text-gray-400">Click to upload images</p>
                    </div>
                  </button>
                )}

                {imagePreviews.length > 0 && imagePreviews.length < 10 && (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 border border-gray-700 rounded-lg text-orange-400 hover:bg-gray-800 transition-colors">
                    <ImageIcon className="w-5 h-5" />
                    <span>Add More Photos ({imagePreviews.length}/10)</span>
                  </button>
                )}

                {/* Location Input with Autocomplete */}
                <div className="relative">
                  <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus-within:border-orange-400">
                    <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <input ref={locationInputRef} type="text" placeholder="Add location..." value={locationQuery} onChange={(e) => { setLocationQuery(e.target.value); setLocationString(''); }} onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }} className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none" />
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                      {suggestions.map((suggestion, index) => (
                        <button key={index} onClick={() => handlePlaceSelect(suggestion)} className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0">
                          <div className="text-white text-sm font-medium">{suggestion.placePrediction.structuredFormat.mainText.text}</div>
                          <div className="text-gray-400 text-xs mt-0.5">{suggestion.placePrediction.structuredFormat.secondaryText.text}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <button onClick={() => setShowTagInput(!showTagInput)} className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors">
                    <Tag className="w-5 h-5" />
                    <span>{showTagInput || tags ? 'Edit Tags' : 'Add Tags'}</span>
                  </button>

                  {showTagInput && (
                    <input type="text" placeholder="travel, adventure, nature..." value={tags} onChange={(e) => setTags(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400" />
                  )}
                </div>

                
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-800">
                {/* Error Message - Prominent Display */}
                {errorMessage && (
                  <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-center">
                    <p className="text-red-400 font-medium text-base">{errorMessage}</p>
                  </div>
                )}

                <button onClick={handlePost} disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold py-3 rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Posting...</span></>) : (<span>Post</span>)}
                </button>

                {/* Helper text for missing fields */}
                {!errorMessage && (!text.trim() || !locationString.trim() || selectedImages.length === 0) && (
                  <p className="text-sm text-gray-400 text-center mt-3">
                    {!selectedImages.length ? '📷 Add at least one photo' : !text.trim() ? '✏️ Add a caption' : '📍 Add a location'}
                  </p>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
            </div>
          )}

          {/* QUEST MODE */}
          {quest && (

            <div className="p-6 flex flex-col gap-4">
              <div className='flex flex-col gap-6'>
                <img src="./oq_logo.svg" alt="" className='w-1/6 h-1/6 text-orange-500' style={{ color: 'orange' }} />
                {/* <textarea
                        placeholder="Share your latest trip.."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={3}
                        className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none text-lg border-2"
                    /> */}
                <h1 className='text-5xl font-bold mb-4'>Share Your Latest Trip</h1>
                <p className='text-xl text-gray-200 '>
                  {/* Share your quest and let the world know about your adventures! */}
                  Inspire and help fellow follow travellers by posting your journey from
                  photos,moments,tips and memories that deserve to be seen</p>


              </div>
              <button className="w-full bg-orange-500 border border-gray-700 hover:border-orange-400 hover:bg-gray-800/60 text-white py-3 rounded-xl transition-all" onClick={() => router.push('/quest')}> + Create Quest</button>

            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CreatePostModal;
