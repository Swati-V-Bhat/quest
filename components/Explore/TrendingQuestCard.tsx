'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Trophy, Zap } from "lucide-react";

interface TrendingQuestCardProps {
  postId: string;
  questId: string;
  cardURL: string;
  cardALT: string;
  cardTitle: string;
  cardContent?: string;
  ownerName?: string;
  ownerPhoto?: string;
  xpEarned?: number;
  difficulty?: 'easy' | 'normal' | 'hard';
}

const TrendingQuestCard: React.FC<TrendingQuestCardProps> = ({
  postId,
  questId,
  cardURL,
  cardALT,
  cardTitle,
  cardContent,
  ownerName,
  ownerPhoto,
  xpEarned,
  difficulty,
}) => {
  const router = useRouter();

  // Split title like "Catch the Sunrise – Nandi Hills" into two parts
  const [title, subtitle] = cardTitle.split(" – ");

  const handleClick = () => {
    // Navigate to the quest detail page using questId
    if (questId) {
      router.push(`/quest/${questId}`);
    } else {
      // Fallback to post if no questId
      router.push(`/post/${postId}`);
    }
  };

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'easy':
        return 'bg-green-500/80';
      case 'normal':
        return 'bg-yellow-500/80';
      case 'hard':
        return 'bg-red-500/80';
      default:
        return 'bg-gray-500/80';
    }
  };

  const getDifficultyLabel = (diff?: string) => {
    switch (diff) {
      case 'easy':
        return 'Easy';
      case 'normal':
        return 'Normal';
      case 'hard':
        return 'Hard';
      default:
        return '';
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative flex-shrink-0 w-[216px] h-[224px] rounded-lg overflow-hidden shadow-md mr-3 cursor-pointer group transition-transform hover:scale-105"
    >
      {/* Background Image */}
      <img
        src={cardURL || "https://images.unsplash.com/photo-1506744038136-46273834b3fb"}
        alt={cardALT}
        className="absolute h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
      />

      {/* Gradient Overlay */}
      <div className="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* Owner Info - Top Left */}
      {ownerName && (
        <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
          {ownerPhoto ? (
            <img
              src={ownerPhoto}
              alt={ownerName}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white text-xs">
                {ownerName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-white text-xs font-medium">{ownerName}</span>
        </div>
      )}

      {/* Quest Stats - Top Right */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {xpEarned !== undefined && xpEarned > 0 && (
          <div className="flex items-center gap-1 bg-[#F7CEB0]/90 backdrop-blur-sm rounded-full px-2 py-1">
            <Trophy className="w-3 h-3 text-black" />
            <span className="text-black text-xs font-bold">{xpEarned} XP</span>
          </div>
        )}
        {difficulty && (
          <div className={`flex items-center gap-1 ${getDifficultyColor(difficulty)} backdrop-blur-sm rounded-full px-2 py-1`}>
            <Zap className="w-3 h-3 text-white" />
            <span className="text-white text-xs font-medium">{getDifficultyLabel(difficulty)}</span>
          </div>
        )}
      </div>

      {/* Quest Title and Subtitle - Bottom */}
      <div className="absolute bottom-2 left-2 right-2 text-white">
        <p className="text-sm font-semibold leading-tight line-clamp-2 mb-1">
          {title}
        </p>
        {subtitle && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <p className="text-xs text-gray-300 line-clamp-1">{subtitle}</p>
          </div>
        )}
        {cardContent && !subtitle && (
          <p className="text-xs text-gray-300 line-clamp-2 mt-1">{cardContent}</p>
        )}
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#F7CEB0]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

export default TrendingQuestCard;