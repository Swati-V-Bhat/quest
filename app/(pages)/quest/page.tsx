// File: app/quest/page.tsx
'use client'

import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { MapPin, Calendar, Sparkles, Plus, Folder, ArrowLeft, ArrowRight } from 'lucide-react';
import Header from '@/components/phoneComponents/header';
import Footer from '@/components/phoneComponents/Footer';
import Navbar from '@/components/LeftSideNav';
import PhotoBasedQuestCreation from '@/components/quest/PhotoBasedQuestCreation';
import questService from '@/lib/questService';
import { LocationInput } from '@/components/common/LocationInput';
import PopularDestinations from '@/components/Explore/PopularDestinations';

const QUEST_DESKTOP_MAIN_WIDTH = 60;
const QUEST_LEFT_NAV_WIDTH = 280;
const QUEST_SIDEBAR_GAP = 16;

interface PlaceData {
  coordinates: { lat: number; lng: number };
  fullAddress: string;
  placeId: string;
  types: string[];
}

interface TripData {
  destination: string;
  startDate: string;
  endDate: string;
  destinationData?: PlaceData;
  title?: string;
  description?: string;
}

const DesktopShell = ({ user, children }: { user: NonNullable<ReturnType<typeof useAuthState>[0]>; children: ReactNode }) => (
  <div className="hidden md:flex min-h-screen">
    <div style={{ width: QUEST_LEFT_NAV_WIDTH, flexShrink: 0 }}>
      <Navbar user={user} onSignOut={() => firebaseSignOut(auth)} />
    </div>
    <main
      className="flex-1 overflow-y-auto px-10 py-8"
      style={{ marginLeft: QUEST_SIDEBAR_GAP, maxWidth: `${QUEST_DESKTOP_MAIN_WIDTH}vw` }}
    >
      {children}
    </main>
  </div>
);

const QuestPage = () => {
  const [user, loading] = useAuthState(auth);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [showPhotoFlow, setShowPhotoFlow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [tripData, setTripData] = useState<TripData>({
    destination: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const steps = [
    { title: "Where did you travel?", key: "destination" },
    { title: "When did you travel?", key: "dates" },
    { title: "Tell us about your quest", key: "details" },
  ];

  const handleDestinationChange = (locationData: { name: string; coordinates?: { lat: number; lng: number } }) => {
    setTripData(prev => ({
      ...prev,
      destination: locationData.name,
      destinationData: locationData.coordinates ? {
        coordinates: locationData.coordinates,
        fullAddress: locationData.name,
        placeId: '',
        types: []
      } : undefined
    }));
  };

  const updateTripData = (key: keyof TripData, value: any) => {
    setTripData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Simplified Quest Creation Flow
      if (!user?.uid) return;
      setIsLoading(true);

      try {
        const questPayload = {
          destination: tripData.destination,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          title: tripData.title?.trim() || 'Untitled',
          description: tripData.description?.trim() || '',
          source: '',
          transportMode: [],
          tripType: 'solo',
          preferences: [],
          budget: 0,
        };

        const blankItinerary = questService.createBlankItinerary(questPayload);

        const result = await questService.createQuest(
          user.uid,
          questPayload,
          blankItinerary,
          undefined,
          [],
          false // Manual quest creation, not AI-generated
        );

        if (result.success && result.questId) {
          router.push(`/quest/${result.questId}?edit=true`);
        } else {
          console.error('Failed to create quest');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error creating quest:', error);
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Handle photo flow
  if (showPhotoFlow && isCreating) {
    if (!user) return null;
    return (
      <PhotoBasedQuestCreation
        userId={user.uid}
        destination={tripData.destination}
        startDate={tripData.startDate}
        endDate={tripData.endDate}
        onBack={() => {
          setShowPhotoFlow(false);
          setCurrentStep(steps.length - 1);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Main quest options page
  if (!isCreating) {
    return (
      <div className="min-h-screen bg-black text-white">
        <DesktopShell user={user}>
          {/* Hero Section */}
          <section className="relative h-[50vh] w-full flex items-center overflow-hidden mb-12">
            <div className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop")'
              }}
            />

            <div className="relative mx-auto flex flex-col justify-center items-center h-full w-full px-10 text-center">
              <h1 className="text-5xl font-bold mb-4 text-white">Share Your Latest Trip</h1>
              <p className="text-xl text-gray-200 mb-8 max-w-2xl">
                Inspire and help fellow follow travellers by posting your journey
              </p><br></br>
              <p> photos,moments,tips and memories that deserve to be seen</p>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsCreating(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-md transition-all shadow-lg hover:shadow-orange-500/30 flex items-center gap-3"
                >
                  <Plus className="w-4 h-4" />
                  Create Quest
                </button>
                <button
                  onClick={() => router.push('/my-quests')}
                  className="bg-white/10 backdrop-blur hover:bg-white/20 text-white px-4 py-2 rounded-xl text-md transition-all border border-white/30 flex items-center gap-3"
                >
                  <Folder className="w-6 h-6" />
                  My Quests
                </button>
              </div>
            </div>
          </section>

          {/* Popular Destinations Section */}
          <PopularDestinations />
        </DesktopShell>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <Header />
          <main>
            <div className="relative h-[360px] w-full">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop")'
                }}
              />
              <div className="relative h-full flex flex-col justify-center items-center px-6">
                <h1 className="text-2xl font-bold mb-3 text-white text-center">Share Your Latest Trip</h1>
                <p className="text-sm text-gray-200 mb-6 text-center">
                  Inspire fellow travellers by posting your journey from photos and moments to tips and memories, all deserving to be seen
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="bg-orange-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Quest
                  </button>
                  <button
                    onClick={() => router.push('/my-quests')}
                    className="bg-white/10 backdrop-blur text-white py-3 rounded-xl font-semibold border border-white/30 flex items-center justify-center gap-2"
                  >
                    <Folder className="w-5 h-5" />
                    My Quests
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 py-6 mb-20">
              <PopularDestinations />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  // Creation flow
  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Desktop Layout */}
      <DesktopShell user={user}>
        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex justify-between mb-3">
            <span className="text-lg text-gray-400">Create Quest</span>
            <span className="text-lg text-gray-400">{currentStep + 1}/{steps.length}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-orange-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-12">{currentStepData.title}</h1>

        <div className="mb-12">
          {currentStepData.key === 'destination' && (
            <div className="max-w-2xl">
              <LocationInput
                value={tripData.destination}
                onChange={handleDestinationChange}
                placeholder="Where are you going?"
              />
            </div>
          )}

          {currentStepData.key === 'dates' && (
            <div className="grid grid-cols-2 gap-6 max-w-2xl">
              <div>
                <label className="block text-base text-gray-400 mb-3">Select Start Date</label>
                <input
                  type="date"
                  value={tripData.startDate}
                  onChange={(e) => updateTripData('startDate', e.target.value)}
                  min="2019-01-01"
                  max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
                  className="w-full bg-gray-800 text-white px-4 py-4 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none text-lg"
                />
              </div>
              <div>
                <label className="block text-base text-gray-400 mb-3">Select End Date</label>
                <input
                  type="date"
                  value={tripData.endDate}
                  onChange={(e) => updateTripData('endDate', e.target.value)}
                  min={tripData.startDate || "2019-01-01"}
                  max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
                  className="w-full bg-gray-800 text-white px-4 py-4 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none text-lg"
                />
              </div>
            </div>
          )}

          {currentStepData.key === 'details' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <label className="block text-base text-gray-400 mb-3">Quest Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={tripData.title || ''}
                  onChange={(e) => updateTripData('title', e.target.value)}
                  placeholder="Give your quest a catchy title..."
                  className="w-full bg-gray-800 text-white px-4 py-4 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none text-lg"
                />
              </div>
              <div>
                <label className="block text-base text-gray-400 mb-3">Description (Optional)</label>
                <textarea
                  value={tripData.description || ''}
                  onChange={(e) => updateTripData('description', e.target.value)}
                  placeholder="Tell us about your quest..."
                  rows={4}
                  className="w-full bg-gray-800 text-white px-4 py-4 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none text-lg resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-8 py-4 border-2 border-gray-600 rounded-xl text-gray-300 hover:border-gray-500 transition-all text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <button
              onClick={() => setIsCreating(false)}
              className="flex items-center gap-2 px-8 py-4 border-2 border-gray-600 rounded-xl text-gray-300 hover:border-gray-500 transition-all text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Cancel
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={
              (currentStepData.key === 'destination' && !tripData.destination) ||
              (currentStepData.key === 'dates' && (!tripData.startDate || !tripData.endDate)) ||
              (currentStepData.key === 'details' && !tripData.title?.trim())
            }
            className="flex items-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto text-lg"
          >
            {currentStep === steps.length - 1 ? 'Create Quest' : 'Next'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </DesktopShell>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <Header />
        <div className="px-4 py-4">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-400">Create Quest</span>
              <span className="text-sm text-gray-400">{currentStep + 1}/{steps.length}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-8">{currentStepData.title}</h1>

          <div className="mb-8">
            {currentStepData.key === 'destination' && (
              <LocationInput
                value={tripData.destination}
                onChange={handleDestinationChange}
                placeholder="Where are you going?"
              />
            )}

            {currentStepData.key === 'dates' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Select Start Date</label>
                  <input
                    type="date"
                    value={tripData.startDate}
                    onChange={(e) => updateTripData('startDate', e.target.value)}
                    min="2019-01-01"
                    max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Select End Date</label>
                  <input
                    type="date"
                    value={tripData.endDate}
                    onChange={(e) => updateTripData('endDate', e.target.value)}
                    min={tripData.startDate || "2019-01-01"}
                    max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {currentStepData.key === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Quest Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={tripData.title || ''}
                    onChange={(e) => updateTripData('title', e.target.value)}
                    placeholder="Give your quest a catchy title..."
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description (Optional)</label>
                  <textarea
                    value={tripData.description || ''}
                    onChange={(e) => updateTripData('description', e.target.value)}
                    placeholder="Tell us about your quest..."
                    rows={3}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-20">
            {currentStep > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 border border-gray-600 rounded-xl text-gray-300 hover:border-gray-500 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                onClick={() => setIsCreating(false)}
                className="flex items-center gap-2 px-6 py-3 border border-gray-600 rounded-xl text-gray-300 hover:border-gray-500 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={
                (currentStepData.key === 'destination' && !tripData.destination) ||
                (currentStepData.key === 'dates' && (!tripData.startDate || !tripData.endDate)) ||
                (currentStepData.key === 'details' && !tripData.title?.trim())
              }
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {currentStep === steps.length - 1 ? 'Create Quest' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default QuestPage;

