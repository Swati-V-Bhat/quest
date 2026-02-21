import React from 'react';

const PopularDestinationCard = ({
    imageUrl,
    title,
    subtitle
}: {
    imageUrl: string;
    title: string;
    subtitle: string;
}) => {
    return (
        <div className="relative shrink-0 w-[216px] h-[224px] rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer">
            <img
                src={imageUrl}
                alt={title}
                className="absolute h-full w-full object-cover"
            />
            <div className="absolute bottom-0 w-full h-1/2 bg-linear-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-3 left-3 text-white">
                <p className="text-sm font-semibold leading-tight">{title}</p>
                <p className="text-xs text-gray-200">{subtitle}</p>
            </div>
        </div>
    );
};

const popularDestinations = [
    { title: "Catch the Sunrise", subtitle: "Nandi Hills", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop" },
    { title: "Serene Backwaters", subtitle: "Kerala", imageUrl: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=800&h=600&fit=crop" },
    { title: "Majestic Forts", subtitle: "Rajasthan", imageUrl: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800&h=600&fit=crop" },
    { title: "Misty Mountains", subtitle: "Himachal", imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop" },
    { title: "Golden Sands", subtitle: "Rann of Kutch", imageUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=800&h=600&fit=crop" },
    { title: "Lush Tea Gardens", subtitle: "Munnar", imageUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&h=600&fit=crop" },
];

const PopularDestinations = () => {
    return (
        <section>
            <div className="mb-4">
                <h2 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 text-white">Popular Destinations</h2>
                <p className="text-sm md:text-base text-gray-400">Explore trending travel spots</p>
            </div>
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-none">
                {popularDestinations.map((dest, index) => (
                    <PopularDestinationCard
                        key={index}
                        title={dest.title}
                        subtitle={dest.subtitle}
                        imageUrl={dest.imageUrl}
                    />
                ))}
            </div>
        </section>
    );
};

export default PopularDestinations;
