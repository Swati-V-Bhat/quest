

'use client'
import React from 'react'
import { FaRegPlusSquare } from "react-icons/fa";
import { HiUser } from "react-icons/hi2";
import Link from 'next/link';
import { useState } from 'react';
import CreatePostModal from '@/components/Home/CreatePostModal';
import { User } from '@/app/types/index';
import { Post } from '@/app/types/index';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserData } from '@/lib/authService';
import { subscribeToPosts } from '@/lib/postService';
import { useRouter, usePathname } from 'next/navigation'; // Import usePathname
import { House, Plus, Search } from 'lucide-react';
import { FaHouse } from "react-icons/fa6";
import { MdExplore } from "react-icons/md";

//TODO: Odd color acc to the selected tab.


const Footer = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Get the current URL path
  const pathname = usePathname();

  // Helper function to determine if a link is active
  const isActive = (href: string) => {
    // Check for exact match for all paths except '/' which should match '/feed'
    if (href === '/feed' && pathname === '/') return true;
    return pathname === href;
  };

  // Helper function to get the correct color class
  const getActiveClass = (href: string) => {
    // The requirement was 'bg-orange-500' for active, but since this is for text/icons, 
    // we'll use 'text-orange-500' for active and 'text-white' for inactive.
    // If you specifically meant setting a background color, change 'text-' to 'bg-'.
    return isActive(href) ? 'text-orange-500' : 'text-white';
  };


  useEffect(() => {
    // Subscribe to auth changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const userData = await getCurrentUserData();
          setUser(userData);
        } catch (error) {
          console.error('Error getting user data:', error);
          setUser({
            uid: authUser.uid,
            displayName: authUser.displayName ?? undefined,
            email: authUser.email ?? undefined,
            photoURL: authUser.photoURL ?? undefined
          });
        }
      } else {
        setUser(null);
      }
    });

    // Subscribe to posts updates
    const unsubscribePosts = subscribeToPosts((newPosts: Post[]) => {
      setPosts(newPosts);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  return (
    <>
      {/* Create Post Modal */}
      {showCreateModal && user && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          user={user}
        />
      )}
      {/* Bottom Navigation */}
      <div className="py-1 fixed -bottom-1 left-0 right-0 z-50 border-1 border-black border-t-amber-100 bg-black backdrop-blur-md border-t border-peach-200/20">
        <div className="flex items-center justify-between px-6 py-2">

          {/* Home Link */}
          <Link href={'/feed'}>
            <div className={`flex flex-col items-center ${getActiveClass('/feed')}`}>
              <FaHouse size={24} />
              <span className="text-xs">Home</span>
            </div>
          </Link>

          {/* Explore Link */}
          <Link href={'/explore'}>
            <div className={`flex flex-col items-center ${getActiveClass('/explore')}`}>
              {/* <Search size={24} /> */}
              <MdExplore size={24} />

              <span className="text-xs ">Explore</span>
            </div>
          </Link>

          {/* Post/Create Modal Button (Always White) */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="flex flex-col items-center text-white" // Keep this button white as it's not a route
          >
            <Plus size={25} className="" />
            <span className="text-xs ">Post</span>
          </div>

          <Link href={'/quest'}><div className="flex flex-col items-center text-white">
            {/* <Quest size={22} className="" /> */}
            <img
              src="/oq_logo.svg"
              alt="OQ logo"
              className={`w-6 h-6 object-contain ${isActive('/quest') ? 'filter-orange' : 'filter invert'}`}
              style={isActive('/quest') ? { filter: 'invert(58%) sepia(80%) saturate(2476%) hue-rotate(358deg) brightness(101%) contrast(99%)' } : {}}
            />
            <span className={`text-xs ${getActiveClass('/quest')}`}>Quest</span>
          </div></Link>

          {/* Account Link */}
          <Link href={'/account'}>
            <div className={`flex flex-col items-center ${getActiveClass('/account')}`}>
              <HiUser size={22} className="" />
              <span className="text-xs">Account</span>
            </div>
          </Link>

        </div>
      </div>
    </>
  )
}

export default Footer
